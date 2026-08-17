import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getCallStatus, endCall, transferCall, filterCallHistory,
} from '../api/resources/calls'
import { describeError } from '../api/resources/http'
import { phoneKey } from '../utils/phone'
import { apiDateMs } from '../utils/datetime'

/**
 * Tracks the calls placed from this browser and keeps their state in step with
 * the backend.
 *
 * There is no "list active calls" route on this backend, so the two real
 * sources of truth are GET /call-status (which checks the cache and then asks
 * the provider) and GET /call-history/filters (which has the DB record, its
 * duration and its recording path). Everything shown here comes from one of
 * those two.
 *
 * localStorage holds pointers only — the SID, the number dialed and when it was
 * placed — so that a page refresh still knows *which* calls to ask the backend
 * about. No status is ever read back from storage.
 */

const STORAGE_KEY = 'callohm_tracked_calls'
const POLL_MS = 5000
/** Refresh the DB record every second status tick; it lags the provider. */
const HISTORY_EVERY = 2
/** Stop asking the provider about a call this old — its status is not moving. */
const MAX_POLL_MS = 10 * 60 * 1000
const KEEP_MS = 30 * 60 * 1000
const MAX_TRACKED = 25

const TERMINAL = new Set([
  'completed', 'complete', 'failed', 'busy', 'no-answer', 'noanswer', 'canceled',
  'cancelled', 'ended', 'hangup', 'hungup', 'not-found', 'rejected', 'timeout',
])

/**
 * Statuses that mean the provider has taken the call but nothing has happened
 * on the line yet. Sitting in one of these is normal for a few seconds and
 * abnormal for a minute.
 */
const PRE_CONNECT = new Set(['queued', 'call-started', 'initiated', 'created', 'accepted'])

export function isPreConnectStatus(status) {
  return PRE_CONNECT.has(normalizeStatus(status))
}

/** How long a call may sit in a pre-connect status before that is suspicious. */
export const STALL_MS = 45000

export function normalizeStatus(status) {
  return String(status ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-')
}

export function isTerminalStatus(status) {
  const value = normalizeStatus(status)
  return Boolean(value) && TERMINAL.has(value)
}

/** Seconds or a preformatted "m:ss" from the backend, rendered as "m:ss". */
export function formatDuration(value) {
  if (value == null || value === '') return null
  // History returns a preformatted string; provider payloads return seconds.
  if (typeof value === 'string' && /[:a-z]/i.test(value)) return value
  const total = Number(value)
  if (!Number.isFinite(total) || total < 0) return null
  const mins = Math.floor(total / 60)
  const secs = Math.floor(total % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/**
 * A once-a-second clock, running only while `active`.
 *
 * The backend has no duration for a call until it is finalised, so a running
 * call is timed here from when it was placed. It is labelled as elapsed rather
 * than as the call duration, which it only becomes once the provider reports it.
 */
export function useNow(active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}

export function elapsedSince(now, since) {
  if (!since) return null
  return formatDuration(Math.max(0, Math.floor((now - since) / 1000)))
}

/**
 * A finalised duration worth showing. The record carries "0:00" (or nothing) for
 * a call still in progress, which must not suppress the live timer.
 */
export function settledDuration(value) {
  const text = formatDuration(value)
  if (!text || text === '0:00' || text === '0') return null
  return text
}

export function statusTone(status) {
  const value = normalizeStatus(status)
  if (value === 'completed' || value === 'complete') return 'success'
  if (value === 'failed' || value === 'rejected') return 'danger'
  if (value === 'busy' || value === 'no-answer' || value === 'noanswer' || value === 'timeout') return 'warning'
  if (isTerminalStatus(value)) return 'neutral'
  return 'info'
}

/**
 * The status routes document an empty response schema, so the field has to be
 * found rather than assumed.
 *
 * After the known spellings, any string under a key containing "status" counts,
 * two levels deep. Without that fallback an unfamiliar envelope reads as "no
 * status", which on screen is indistinguishable from a call whose status never
 * moves — so it warns once instead of failing quietly.
 */
function readStatus(payload) {
  if (!payload || typeof payload !== 'object') return ''

  const direct = payload.status ?? payload.call_status ?? payload.callStatus
    ?? payload.CallStatus ?? payload.data?.status ?? payload.data?.call_status
  if (typeof direct === 'string' && direct.trim()) return direct

  const nested = typeof direct === 'object' && direct ? direct : null
  for (const source of [payload, payload.data, nested]) {
    if (!source || typeof source !== 'object') continue
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'string' && value.trim() && /status/i.test(key)) return value
    }
  }

  if (!warnedAboutShape) {
    warnedAboutShape = true
    console.warn('[calls] no status field found in /call-status response:', payload)
  }
  return ''
}

let warnedAboutShape = false

function readDuration(payload) {
  if (!payload || typeof payload !== 'object') return null
  const value = payload.duration ?? payload.call_duration ?? payload.duration_seconds
    ?? payload.CallDuration ?? payload.data?.duration ?? payload.data?.call_duration
  return value == null || value === '' ? null : value
}

function callSidOf(historyRow) {
  return historyRow?.telephonyCallID || historyRow?.callID || ''
}

/**
 * Index recent history so a call SID can find its DB record.
 *
 * Which column holds the SID we hold depends on the provider: for Plivo, `PLV_…`
 * is this backend's own id and `telephonyCallID` may carry Plivo's UUID instead,
 * so both id columns are indexed. The dialed number is indexed too, as the last
 * resort for a record whose ids simply do not line up — without it a matched
 * call would never pick up its final status, duration or recording.
 */
function buildHistoryIndex(rows = []) {
  const byId = new Map()
  const byPhone = new Map()

  for (const row of rows) {
    for (const id of [row?.telephonyCallID, row?.callID]) {
      if (id && !byId.has(id)) byId.set(id, row)
    }
    const phone = phoneKey('', row?.to_address)
    if (!phone) continue
    const at = apiDateMs(row?.call_date) ?? 0
    const existing = byPhone.get(phone)
    // Newest record for that number wins.
    if (!existing || at > existing.at) byPhone.set(phone, { row, at })
  }

  return { byId, byPhone }
}

/** The DB record for a tracked call, by id and then by number + time. */
function matchHistory(index, entry) {
  const byId = index.byId.get(entry.callSid)
  if (byId) return byId

  const candidate = index.byPhone.get(phoneKey('', entry.toNumber))
  if (!candidate || !entry.placedAt) return undefined
  // Only a record from around when this call was placed, never an older one.
  return candidate.at >= entry.placedAt - 120000 ? candidate.row : undefined
}

/**
 * The status to trust.
 *
 * /call-status answers from a cache the provider's webhooks advance, so a call
 * whose webhook never landed keeps reporting `call_started` long after it ended.
 * The history record is written when the call is finalised, so once it reports a
 * terminal status that is the newer fact and it wins.
 */
function resolveStatus({ live, history, initial }) {
  if (isTerminalStatus(history)) return history
  return live || history || initial || ''
}

/* ── pointer storage ────────────────────────────────────────────────────── */

function readPointers() {
  let parsed
  try { parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { parsed = null }
  if (!Array.isArray(parsed)) return []
  const cutoff = Date.now() - KEEP_MS
  return parsed
    .filter((p) => p && typeof p.callSid === 'string' && p.callSid && Number(p.placedAt) > cutoff)
    .slice(0, MAX_TRACKED)
}

function writePointers(pointers) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pointers.slice(0, MAX_TRACKED))) } catch { /* quota */ }
}

/* ── hook ───────────────────────────────────────────────────────────────── */

/**
 * @param {object} [options]
 * @param {string} [options.fallbackTelephonyId]
 *   The number to attribute a call to when the call itself does not say.
 *
 *   /call-status and /end-call both require `telephony_id` — it is how the
 *   route resolves this company's provider credentials — but only a call this
 *   browser placed carries one. A call picked up from /call-history (placed in
 *   another tab, or before a refresh) has no id attached, and asking about it
 *   without one fails with "Query parameter 'telephony_id' is required".
 */
export function useActiveCalls({ fallbackTelephonyId = '' } = {}) {
  const [pointers, setPointers] = useState(() => readPointers())
  const [historyRows, setHistoryRows] = useState([])
  const [liveBySid, setLiveBySid] = useState({})
  const [pending, setPending] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusError, setStatusError] = useState('')

  /** Guards every request so a double click cannot fire the same call twice. */
  const inFlight = useRef(new Set())
  /** Consecutive /call-status failures per SID. */
  const failures = useRef(new Map())
  const tickRef = useRef(0)
  const mounted = useRef(true)

  /**
   * StrictMode mounts, unmounts and remounts in development. The flag has to be
   * set on *every* mount — leaving it to the cleanup alone latches it to false
   * after the first unmount, which silently kills every later state update and
   * leaves the pending flags stuck on.
   */
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const savePointers = useCallback((next) => {
    setPointers(next)
    writePointers(next)
  }, [])

  /**
   * One request per key at a time.
   *
   * `silent` keeps the background poll out of the pending map: it shares the
   * key, so it still cannot overlap with a click, but it must not leave the row's
   * buttons spinning every five seconds as if the user had pressed something.
   */
  const guard = useCallback(async (key, run, { silent = false } = {}) => {
    if (inFlight.current.has(key)) return undefined
    inFlight.current.add(key)
    if (!silent) setPending((prev) => ({ ...prev, [key]: true }))
    try {
      return await run()
    } finally {
      inFlight.current.delete(key)
      // Cleared unconditionally: gating this on "still mounted" is what leaves a
      // button spinning forever. React 19 tolerates a late setState.
      if (!silent) {
        setPending((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
    }
  }, [])

  /** The DB view of recent calls — duration, contact name and recording path. */
  const loadHistory = useCallback(({ silent = false } = {}) => guard('history', async () => {
    const data = await filterCallHistory({ limit: 20, offset: 0 })
    setHistoryRows(data.items)
  }, { silent }), [guard])

  const refreshStatus = useCallback((callSid, telephonyId, { silent = false } = {}) => guard(
    `status:${callSid}`,
    async () => {
      // Asking without one returns a bare "Query parameter 'telephony_id' is
      // required", which reads like a bug rather than a missing selection.
      if (!telephonyId) {
        throw new Error('Pick the telephony number this call was placed from. Checking its status needs it.')
      }
      try {
        const payload = await getCallStatus({ callSid, telephonyId })
        failures.current.delete(callSid)
        setStatusError('')
        setLiveBySid((prev) => {
          const previous = prev[callSid]
          const status = readStatus(payload) || previous?.status || ''
          return {
            ...prev,
            [callSid]: {
              status,
              duration: readDuration(payload) ?? previous?.duration ?? null,
              at: Date.now(),
              // When the status last actually moved, as opposed to when it was
              // last read — a status that never moves is diagnostic in itself.
              changedAt: previous && previous.status === status
                ? previous.changedAt ?? Date.now()
                : Date.now(),
            },
          }
        })
      } catch (e) {
        // A silent poll has no button to report through, so a run of failures
        // is surfaced once rather than swallowed — otherwise a permanently
        // failing status route just looks like a status that never changes.
        const count = (failures.current.get(callSid) ?? 0) + 1
        failures.current.set(callSid, count)
        if (silent && count >= 3) {
          setStatusError(`Could not read the live call status: ${describeError(e)}`)
        }
        throw e
      }
    },
    { silent },
  ), [guard])

  /* Initial load: pointers say what to ask about, the backend answers. */
  useEffect(() => {
    let cancelled = false
    // Already pruned by readPointers; storage is rewritten on the next change.
    const initial = readPointers()

    ;(async () => {
      try {
        await loadHistory()
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load recent calls.')
      }
      await Promise.allSettled(
        initial.map((p) => refreshStatus(p.callSid, p.telephonyId, { silent: true })),
      )
      if (!cancelled) setLoading(false)
    })()

    return () => { cancelled = true }
    // Runs once — the callbacks are stable and re-running would re-poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── derived rows ─────────────────────────────────────────────────────── */

  const rows = useMemo(() => {
    const index = buildHistoryIndex(historyRows)
    const bySid = new Map()

    for (const pointer of pointers) {
      bySid.set(pointer.callSid, { ...pointer, tracked: true })
    }
    // A live call from another tab or session still belongs in the list.
    for (const row of historyRows) {
      const sid = callSidOf(row)
      if (!sid || bySid.has(sid) || isTerminalStatus(row.call_status)) continue
      bySid.set(sid, {
        callSid: sid,
        name: row.contactName || row.to_address || sid,
        toNumber: row.to_address || '',
        placedAt: apiDateMs(row.call_date),
        tracked: false,
      })
    }

    return [...bySid.values()]
      .map((entry) => {
        const history = matchHistory(index, entry)
        const live = liveBySid[entry.callSid]
        const status = resolveStatus({
          live: live?.status,
          history: history?.call_status,
          initial: entry.initialStatus,
        })
        const settled = isTerminalStatus(status)
        return {
          ...entry,
          key: entry.callSid,
          // Without this the status and hang-up routes are called with no
          // telephony id for any call this browser did not place itself.
          telephonyId: entry.telephonyId || fallbackTelephonyId || '',
          callId: history?.callID ?? null,
          name: entry.name || history?.contactName || entry.toNumber,
          toNumber: entry.toNumber || history?.to_address || '',
          agentName: history?.agentName ?? null,
          status,
          statusKnown: Boolean(live?.status || history?.call_status),
          duration: history?.call_duration ?? live?.duration ?? null,
          recordingPath: history?.callRecordingPath ?? null,
          live: Boolean(status) && !settled,
          /** The provider cache disagrees with the finalised DB record. */
          staleProviderStatus: settled && Boolean(live?.status)
            && !isTerminalStatus(live.status),
          updatedAt: live?.at ?? null,
          statusChangedAt: live?.changedAt ?? entry.placedAt ?? null,
        }
      })
      .sort((a, b) => (b.placedAt ?? 0) - (a.placedAt ?? 0))
  }, [pointers, historyRows, liveBySid, fallbackTelephonyId])

  const liveRows = useMemo(() => rows.filter((r) => r.live || !r.statusKnown), [rows])
  const hasLive = liveRows.length > 0

  /* ── polling ──────────────────────────────────────────────────────────── */

  // The interval reads the latest rows through a ref so that a status change
  // does not tear down and restart the timer on every tick.
  const liveRef = useRef(liveRows)
  useEffect(() => { liveRef.current = liveRows }, [liveRows])

  useEffect(() => {
    if (!hasLive) return undefined
    const timer = setInterval(() => {
      // A hidden tab does not need to poll; the next visible tick catches up.
      if (document.hidden) return
      tickRef.current += 1
      // A call whose status is wedged must not be polled for the rest of the
      // session — history still refreshes, so it can still be resolved.
      const pollable = liveRef.current.filter((row) => !row.placedAt
        || Date.now() - row.placedAt < MAX_POLL_MS)
      for (const row of pollable) {
        // Silent: a background poll must not put the row's buttons in a
        // pressed/loading state. Failures are counted inside refreshStatus.
        refreshStatus(row.callSid, row.telephonyId, { silent: true }).catch(() => { /* reported */ })
      }
      if (tickRef.current % HISTORY_EVERY === 0) {
        loadHistory({ silent: true }).catch(() => { /* transient */ })
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [hasLive, refreshStatus, loadHistory])

  /* One last history read once everything has stopped, for duration/recording. */
  const settledRef = useRef(true)
  useEffect(() => {
    if (hasLive) { settledRef.current = false; return }
    if (settledRef.current) return
    settledRef.current = true
    loadHistory({ silent: true }).catch(() => { /* transient */ })
  }, [hasLive, loadHistory])

  /* ── actions ──────────────────────────────────────────────────────────── */

  /** Called with the result of POST /call so the SID is remembered. */
  const track = useCallback((entry) => {
    setPointers((prev) => {
      const next = [
        {
          callSid: entry.callSid,
          name: entry.name || '',
          toNumber: entry.toNumber || '',
          telephonyId: entry.telephonyId || '',
          initialStatus: entry.status || '',
          placedAt: Date.now(),
        },
        ...prev.filter((p) => p.callSid !== entry.callSid),
      ].slice(0, MAX_TRACKED)
      writePointers(next)
      return next
    })
    // Ask the backend straight away rather than showing the POST's status alone.
    refreshStatus(entry.callSid, entry.telephonyId, { silent: true })
      .catch(() => { /* the first poll picks it up */ })
  }, [refreshStatus])

  const untrack = useCallback((callSid) => {
    savePointers(pointers.filter((p) => p.callSid !== callSid))
    setLiveBySid((prev) => {
      const next = { ...prev }
      delete next[callSid]
      return next
    })
  }, [pointers, savePointers])

  const hangUp = useCallback((row) => guard(`end:${row.callSid}`, async () => {
    if (!row.telephonyId) {
      throw new Error('Pick the telephony number this call was placed from. Ending it needs it.')
    }
    await endCall({ callSid: row.callSid, telephonyId: row.telephonyId })
    // Do not assume "ended" — read the status the backend now reports.
    await refreshStatus(row.callSid, row.telephonyId, { silent: true }).catch(() => { /* next tick */ })
    await loadHistory({ silent: true }).catch(() => { /* next tick */ })
    // The DB record is finalised by the provider's hangup webhook, which lands a
    // moment after /end-call returns, so read it once more.
    setTimeout(() => {
      if (mounted.current) loadHistory({ silent: true }).catch(() => { /* next tick */ })
    }, 4000)
  }), [guard, refreshStatus, loadHistory])

  const transfer = useCallback((row, toNumber) => guard(`transfer:${row.callSid}`, async () => {
    await transferCall({ callSid: row.callSid, toNumber })
    await refreshStatus(row.callSid, row.telephonyId, { silent: true }).catch(() => { /* next tick */ })
  }), [guard, refreshStatus])

  const isPending = useCallback((action, callSid) => Boolean(pending[`${action}:${callSid}`]), [pending])

  return {
    rows,
    liveRows,
    hasLive,
    loading,
    error,
    setError,
    /** A run of failing /call-status polls, which no button can report. */
    statusError,
    isPending,
    historyPending: Boolean(pending.history),
    track,
    untrack,
    hangUp,
    transfer,
    refreshStatus,
    reload: loadHistory,
  }
}
