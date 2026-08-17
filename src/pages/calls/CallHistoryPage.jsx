import { useCallback, useEffect, useState } from 'react'
import {
  Phone, Download, FileText, Sparkles, Mic2, Clock, User, Bot, CalendarClock,
  MessageSquare, AudioLines, Hash, PhoneOff, Loader2, Trash2, ChevronDown,
  Target, Activity, HelpCircle,
} from 'lucide-react'
import {
  filterCallHistory, getRecording, getTranscript,
  getCallAnalysis, retriggerCallAnalysis, deleteRecording,
} from '../../api/resources/calls'
import { searchContacts } from '../../api/resources/contacts'
import { can } from '../../api/permissions'
import {
  PageShell, PageHeader, GhostButton, DataTable, Pagination, Drawer, ConfirmDialog,
  Banner, Badge, SearchBox, DateField, SelectField, toApiDate,
} from '../../components/resource/ResourceKit'
import AudioPlayer from '../../components/resource/AudioPlayer'
import { formatDateTime } from '../../utils/datetime'
import { phoneKey } from '../../utils/phone'

const LIMIT = 20
/** 100 rows a page — enough for a season, bounded so it cannot run away. */
const EXPORT_MAX_PAGES = 20
/** Excel wants CRLF line endings in a CSV; a bare \n merges rows on some setups. */
const CRLF = '\r\n'

const STATUS_TONE = {
  completed: 'success',
  failed: 'danger',
  'no-answer': 'warning',
  busy: 'warning',
  canceled: 'neutral',
}

/**
 * `call_duration` arrives either preformatted ("1:24") or as a bare number of
 * seconds, which read as a meaningless "24" on its own.
 */
function formatCallDuration(value) {
  if (value == null || value === '') return '—'
  const text = String(value).trim()
  if (/[:a-z]/i.test(text)) return text
  const seconds = Number(text)
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  return `${Math.floor(seconds / 60)}m ${String(Math.round(seconds % 60)).padStart(2, '0')}s`
}

/**
 * The columns worth exporting, in reading order.
 *
 * The backend's own CSV carries every column the record has — internal ids,
 * provider SIDs, chat ids, billing internals, recording timestamps — which is
 * a debugging dump rather than something to hand to an admissions head. This
 * is the same data a person would read off the screen.
 */
const EXPORT_COLUMNS = [
  ['When', (row) => formatDateTime(row.call_date)],
  ['Contact', (row, name) => name],
  ['Number', (row) => excelText(row.to_address)],
  ['Agent', (row) => row.agentName || ''],
  ['Status', (row) => row.call_status || ''],
  ['Duration', (row) => (row.call_duration == null || row.call_duration === '' ? '' : formatCallDuration(row.call_duration))],
  ['Direction', (row) => row.direction || ''],
  ['Credits', (row) => (row.credits_charged ?? '')],
  ['Recording', (row) => (row.callRecordingPath ? 'yes' : 'no')],
  ['Call ID', (row) => excelText(row.callID)],
]

/**
 * Keep a long digit string readable in a spreadsheet.
 *
 * Excel reads a bare `919848998032` as a number and shows `9.19849E+11`, and
 * it does the same to call ids that happen to be all digits. `="…"` is the one
 * form Excel, Sheets and LibreOffice all treat as text.
 */
function excelText(value) {
  const text = String(value ?? '').trim()
  return text ? `="${text.replace(/"/g, '""')}"` : ''
}

/** One CSV cell: quoted, with embedded quotes doubled. */
function csvCell(value) {
  const text = String(value ?? '')
  // Already an ="…" formula — quoting it again would show the formula itself.
  if (text.startsWith('="')) return text
  return `"${text.replace(/"/g, '""')}"`
}

/** Call history with recordings, transcripts and the QA analysis report. */
export default function CallHistoryPage() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ contactName: '', callStatus: '', fromDate: '', toDate: '' })
  const [detail, setDetail] = useState(null)
  /** Current contacts, keyed by number, for rows the record has no name for. */
  const [namesByNumber, setNamesByNumber] = useState({})
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await filterCallHistory({
        limit: LIMIT,
        offset,
        contactName: filters.contactName || undefined,
        callStatus: filters.callStatus || undefined,
        fromDate: toApiDate(filters.fromDate),
        toDate: toApiDate(filters.toDate),
      })
      setRows(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e.message || 'Could not load call history.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [offset, filters])

  useEffect(() => {
    const timer = setTimeout(load, filters.contactName ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, filters.contactName])

  /**
   * Names for calls whose record has none.
   *
   * The history record stores the contact name as it was at dial time and
   * resolves the rest through `customerID` — so a call placed without a name,
   * or one whose contact was later deleted and re-added under a new id, comes
   * back with an empty name and shows as "Unknown" forever. The number is
   * still on the record, and the number is what identifies the person, so the
   * current contact list is matched against it at display time.
   *
   * This is a display fallback only: it never rewrites the stored record.
   */
  useEffect(() => {
    let cancelled = false
    searchContacts({ size: 200 })
      .then((data) => {
        if (cancelled) return
        const map = {}
        for (const contact of data.items) {
          const key = phoneKey(contact.countryCode, contact.phoneNumber)
          // First one wins, so a duplicate row cannot rename the call.
          if (key && contact.contactName && !map[key]) map[key] = contact.contactName
        }
        setNamesByNumber(map)
      })
      .catch(() => { /* the number alone still identifies the row */ })
    return () => { cancelled = true }
  }, [])

  /**
   * The export is built here rather than downloaded from the backend.
   *
   * /call-history/download-csv returns every stored column, and writes phone
   * numbers as bare digits that Excel turns into 9.19849E+11 on open. Building
   * it from the same rows the table shows keeps the columns to the ones people
   * asked for, and lets the resolved contact names go out with them.
   */
  async function handleExport() {
    setExporting(true)
    setError('')
    try {
      const query = {
        contactName: filters.contactName || undefined,
        callStatus: filters.callStatus || undefined,
        fromDate: toApiDate(filters.fromDate),
        toDate: toApiDate(filters.toDate),
      }

      // Paged out rather than asked for in one go: the list route caps `limit`
      // at 100, so a bigger number comes back as a validation error.
      const all = []
      for (let page = 0; page < EXPORT_MAX_PAGES; page += 1) {
        const data = await filterCallHistory({ ...query, limit: 100, offset: page * 100 })
        all.push(...data.items)
        if (data.items.length < 100) break
      }

      const header = EXPORT_COLUMNS.map(([label]) => csvCell(label)).join(',')
      const body = all.map((row) => EXPORT_COLUMNS
        .map(([, value]) => csvCell(value(row, contactNameFor(row))))
        .join(','))

      // The BOM is what makes Excel read the file as UTF-8; without it a name
      // with an accent or a rupee sign arrives mangled. Written as a char code
      // so the file itself does not start with a stray invisible character.
      const csv = String.fromCharCode(0xFEFF) + [header, ...body].join(CRLF) + CRLF

      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'call_history.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      if (all.length >= EXPORT_MAX_PAGES * 100) {
        setError(`Exported the most recent ${all.length} calls. Narrow the date range to export earlier ones.`)
      }
    } catch (e) {
      setError(e.message || 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  /** The stored name, else whoever currently holds that number, else Unknown. */
  const contactNameFor = (row) => row.contactName
    || namesByNumber[phoneKey('', row.to_address)]
    || 'Unknown'

  const columns = [
    {
      key: 'contactName',
      header: 'Contact',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{contactNameFor(row)}</p>
          <p className="truncate font-mono text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
            {row.to_address || row.telephonyNumber || '—'}
          </p>
        </div>
      ),
    },
    { key: 'agentName', header: 'Agent', render: (r) => r.agentName || '—' },
    {
      key: 'call_status',
      header: 'Status',
      render: (r) => <Badge tone={STATUS_TONE[r.call_status] || 'neutral'}>{r.call_status || 'unknown'}</Badge>,
    },
    { key: 'call_duration', header: 'Duration', render: (r) => formatCallDuration(r.call_duration) },
    {
      key: 'call_date',
      header: 'When',
      render: (r) => formatDateTime(r.call_date),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      // One way in. The recording, the transcript and the QA report all live
      // inside the detail view, where the call they belong to is on screen —
      // a row-level play button fires audio out of a table with no way to
      // pause it, and says nothing about whether audio exists at all.
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          {/* Carries the resolved name in, so the drawer heading matches the
              row the user clicked rather than falling back to "Call". */}
          <GhostButton
            icon={FileText}
            onClick={() => setDetail({ ...row, contactName: contactNameFor(row) })}
          >
            Details
          </GhostButton>
        </div>
      ),
    },
  ]

  return (
    <PageShell>
      <PageHeader
        icon={Phone}
        title="Call history"
        subtitle={total ? `${total} call${total === 1 ? '' : 's'}` : 'Completed and attempted calls'}
        action={(
          <GhostButton icon={Download} busy={exporting} onClick={handleExport}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </GhostButton>
        )}
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchBox
          value={filters.contactName}
          onChange={(v) => { setOffset(0); setFilters((p) => ({ ...p, contactName: v })) }}
          placeholder="Search by contact name..."
        />
        <div className="w-full sm:w-44">
          <SelectField
            value={filters.callStatus}
            onChange={(v) => { setOffset(0); setFilters((p) => ({ ...p, callStatus: v })) }}
            placeholder="All statuses"
            options={['completed', 'failed', 'no-answer', 'busy', 'canceled'].map((id) => ({ id, label: id }))}
          />
        </div>
        <div className="w-[calc(50%-6px)] sm:w-40">
          <DateField
            label="From"
            value={filters.fromDate}
            max={filters.toDate || undefined}
            onChange={(v) => setFilters((p) => ({ ...p, fromDate: v }))}
          />
        </div>
        <div className="w-[calc(50%-6px)] sm:w-40">
          <DateField
            label="To"
            value={filters.toDate}
            min={filters.fromDate || undefined}
            onChange={(v) => setFilters((p) => ({ ...p, toDate: v }))}
          />
        </div>
        <GhostButton onClick={() => { setOffset(0); load() }}>Apply</GhostButton>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(r) => r.callID}
        onRowClick={setDetail}
        empty="No calls recorded yet."
      />

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} hasMore={rows.length >= LIMIT} />

      <CallDetailDrawer call={detail} onClose={() => setDetail(null)} />
    </PageShell>
  )
}

/* ── detail view ────────────────────────────────────────────────────────── */

/** One labelled fact in the summary strip at the top of the drawer. */
function Fact({ icon: Icon, label, children }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ui-text-3)' }}>
        <Icon size={11} />
        {label}
      </p>
      <div className="truncate text-[12.5px]" style={{ color: 'var(--ui-text)' }}>{children}</div>
    </div>
  )
}

function Tabs({ value, onChange, items }) {
  return (
    /* A flex item will not shrink below its content by default, so on a narrow
       drawer the three tabs kept their full width and the last one sat outside
       the rounded track. `min-w-0` lets them share the row instead. */
    <div
      className="mb-4 flex min-w-0 gap-1 rounded-xl p-1"
      style={{ background: 'var(--ui-surface-2)', border: '1px solid var(--ui-border)' }}
    >
      {items.map((item) => {
        const active = value === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 py-2 text-[12.5px] font-medium transition sm:px-3"
            style={active
              ? {
                background: 'var(--ui-surface)',
                color: 'var(--ui-accent-strong)',
                boxShadow: 'var(--ui-shadow-sm)',
              }
              : { color: 'var(--ui-text-3)' }}
          >
            <item.icon size={13} className="shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.count ? (
              <span className="ui-mono shrink-0 text-[10.5px]" style={{ color: 'var(--ui-text-3)' }}>{item.count}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function EmptyPane({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl px-6 py-12 text-center"
      style={{ border: '1px dashed var(--ui-border-strong)' }}
    >
      <div
        className="mb-1 flex h-10 w-10 items-center justify-center rounded-full"
        style={{ background: 'var(--ui-surface-2)', color: 'var(--ui-text-3)' }}
      >
        <Icon size={17} />
      </div>
      <p className="text-[13px] font-medium" style={{ color: 'var(--ui-text)' }}>{title}</p>
      {hint ? <p className="max-w-sm text-[12px]" style={{ color: 'var(--ui-text-3)' }}>{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

function CallDetailDrawer({ call, onClose }) {
  const [tab, setTab] = useState('recording')
  const [transcript, setTranscript] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [banner, setBanner] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!call) return
    setTab('recording')
    setDeleted(false)
    setTranscript(null)
    setAnalysis(null)
    setError('')
    setBanner('')
    setLoading(true)
    Promise.allSettled([getTranscript(call.callID), getCallAnalysis(call.callID)])
      .then(([t, a]) => {
        if (t.status === 'fulfilled') setTranscript(t.value)
        if (a.status === 'fulfilled') setAnalysis(a.value)
      })
      .finally(() => setLoading(false))
  }, [call])

  const turns = toTurns(transcript)
  const report = analysis?.report
  // The history row says whether audio was ever stored, so the recording tab
  // can answer "is there a recording" without fetching a byte.
  const hasRecording = Boolean(call?.callRecordingPath) && !deleted
  const callId = call?.callID

  const fetchAudio = useCallback(() => getRecording(callId), [callId])

  /**
   * Deletion is keyed by the *provider* SID, not the internal call id: the
   * /recording/{call_sid} route addresses the object in storage. The call
   * itself stays in history either way — only the audio goes.
   */
  const recordingSid = call?.telephonyCallID || call?.callID

  async function handleDeleteRecording() {
    setDeleting(true)
    try {
      await deleteRecording(recordingSid)
      setDeleted(true)
      setConfirmDelete(false)
      setBanner('Recording deleted. The call itself is still in history.')
    } catch (e) {
      setError(e.message || 'Could not delete the recording.')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Drawer
      open={Boolean(call)}
      onClose={onClose}
      width="max-w-3xl"
      title={call?.contactName || 'Call'}
      subtitle={call?.to_address || call?.telephonyNumber || call?.callID}
    >
      <Banner onDismiss={() => setError('')}>{error}</Banner>
      <Banner tone="success" onDismiss={() => setBanner('')}>{banner}</Banner>

      <div
        className="mb-4 grid grid-cols-2 gap-4 rounded-2xl px-4 py-3.5 sm:grid-cols-4"
        style={{ background: 'var(--ui-surface-2)', border: '1px solid var(--ui-border)' }}
      >
        <Fact icon={PhoneOff} label="Status">
          <Badge tone={STATUS_TONE[call?.call_status] || 'neutral'}>{call?.call_status || 'unknown'}</Badge>
        </Fact>
        <Fact icon={Clock} label="Duration">
          <span className="ui-mono">{formatCallDuration(call?.call_duration)}</span>
        </Fact>
        <Fact icon={Bot} label="Agent">{call?.agentName || '—'}</Fact>
        <Fact icon={CalendarClock} label="When">{formatDateTime(call?.call_date)}</Fact>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'recording', label: 'Recording', icon: AudioLines },
          { id: 'transcript', label: 'Transcript', icon: MessageSquare, count: turns.length || undefined },
          { id: 'analysis', label: 'Analysis', icon: Sparkles },
        ]}
      />

      {tab === 'recording' ? (
        hasRecording ? (
          <div className="grid gap-3">
            <AudioPlayer
              key={callId}
              fetchAudio={fetchAudio}
              fileName={`${call?.callID || 'call'}.mp3`}
              onError={setError}
            />
            {can.deleteRecordings() ? (
              <div className="flex justify-end">
                <GhostButton
                  icon={Trash2}
                  onClick={() => setConfirmDelete(true)}
                  style={{ color: '#e11d48', borderColor: 'rgba(244,63,94,0.30)' }}
                >
                  Delete recording
                </GhostButton>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyPane
            icon={Mic2}
            title={deleted ? 'Recording deleted' : 'No recording for this call'}
            hint={deleted
              ? 'The audio has been removed from storage. The call itself is still in history.'
              : 'Audio appears once the call has ended and the telephony provider has posted its recording callback. Calls that never connected have none.'}
          />
        )
      ) : loading ? (
        <p className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--ui-text-3)' }}>
          <Loader2 size={13} className="animate-spin" /> Loading…
        </p>
      ) : tab === 'transcript' ? (
        <TranscriptPane turns={turns} summary={transcript?.summary} />
      ) : (
        <AnalysisPanel
          analysis={analysis}
          report={report}
          onRetrigger={() => retriggerCallAnalysis(call.callID)
            .then(() => setBanner('Analysis re-queued. Check back shortly.'))
            .catch((e) => setError(e.message))}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        busy={deleting}
        title="Delete recording"
        message={`The audio for this call will be permanently deleted and cannot be recovered. The call, its transcript and its analysis stay in history.`}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteRecording}
      />
    </Drawer>
  )
}

/* ── transcript ─────────────────────────────────────────────────────────── */

/**
 * Which side of the conversation a turn came from.
 *
 * /call-history/transcription-details documents an empty response schema, and
 * the speaker is variously `role`, `speaker`, `from` or `type`, holding
 * "agent", "assistant", "bot", "ai" or "system" for our side. Anything that is
 * not recognisably the agent is treated as the contact, which is the safer
 * default: mislabelling the agent's line as the contact's is obvious on screen,
 * while an unrecognised value silently rendering as "Agent" is not.
 */
const AGENT_SPEAKER = /^(agent|assistant|bot|ai|system|outbound|caller)$/i

function speakerOf(turn) {
  const raw = turn?.role ?? turn?.speaker ?? turn?.from ?? turn?.source
    ?? turn?.sender ?? turn?.side ?? turn?.type ?? turn?.participant
  return AGENT_SPEAKER.test(String(raw ?? '').trim()) ? 'agent' : 'contact'
}

/**
 * Records in `transcripts` that are not something anybody said.
 *
 * The voice engine stores provider control messages in the same array as
 * speech: Google's `LLMSpecificMessage(... 'thought_signature' ...)` is the one
 * seen here, and it carries a copy of the agent's line in its `bookmark`, so
 * the real turn is already in the thread next to it. Tool calls and function
 * results arrive the same way. None of it is dialogue, and a Python repr of an
 * engine object is unreadable in a chat bubble, so they are dropped.
 *
 * They are dropped at *render* time only — the backend is still persisting
 * them, which is where the real fix belongs.
 */
const CONTROL_TEXT = /^\s*(LLMSpecificMessage\(|ChatMessage\(|FunctionCall\(|ToolCall\(|\{['"]type['"]:\s*['"](thought_signature|tool_call|function_call))/
const CONTROL_ROLE = /^(system|tool|function|developer|thought)$/i

function isControlRecord(turn, text) {
  if (CONTROL_TEXT.test(text)) return true
  const role = String(turn?.role ?? turn?.speaker ?? turn?.type ?? '').trim()
  return CONTROL_ROLE.test(role)
}

const TEXT_KEYS = ['text', 'message', 'content', 'transcript', 'utterance', 'value', 'body', 'said']

function textOf(turn) {
  if (typeof turn === 'string') return turn
  for (const key of TEXT_KEYS) {
    const value = turn?.[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  // Last resort: the longest string on the entry that is not the speaker label.
  const strings = Object.entries(turn ?? {})
    .filter(([key, value]) => typeof value === 'string' && value.trim().length > 2
      && !/^(role|speaker|from|source|sender|side|type|participant|id|call_id)$/i.test(key))
    .map(([, value]) => value)
  return strings.sort((a, b) => b.length - a.length)[0] ?? ''
}

function timeOf(turn) {
  const at = turn?.timestamp ?? turn?.time ?? turn?.start_time ?? turn?.offset ?? turn?.seconds
  if (at == null || at === '') return null
  const seconds = Number(at)
  if (!Number.isFinite(seconds)) return String(at)
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

/**
 * Flatten whatever the transcription route returned into `{ speaker, text, at }`.
 *
 * Three shapes turn up: a list of turns, a list of *exchanges* that pair the
 * agent's line with the contact's reply on one entry (`{ agent, user }`), and a
 * single block of "Agent: …\nUser: …" text. All three become one flat thread so
 * the renderer below only has to know about turns.
 */
function toTurns(transcript) {
  if (!transcript) return []

  const source = Array.isArray(transcript)
    ? transcript
    : (transcript.transcripts ?? transcript.messages ?? transcript.turns
      ?? transcript.conversation ?? transcript.transcript ?? transcript.data
      ?? (typeof transcript === 'object' ? Object.values(transcript).find(Array.isArray) : null))

  // A single string transcript: split on the "Speaker: line" convention.
  if (typeof source === 'string') {
    return source.split(/\r?\n+/).filter((line) => line.trim()).map((line) => {
      const match = line.match(/^\s*([\w .-]{1,24}?)\s*:\s*(.+)$/)
      if (!match) return { speaker: 'contact', text: line.trim(), at: null }
      return { speaker: speakerOf({ role: match[1] }), text: match[2].trim(), at: null }
    })
  }

  if (!Array.isArray(source)) return []

  const turns = []
  for (const entry of source) {
    if (typeof entry === 'string') {
      turns.push({ speaker: 'contact', text: entry, at: null })
      continue
    }
    if (!entry || typeof entry !== 'object') continue

    // An exchange row carries both sides at once.
    const agentLine = entry.agent ?? entry.agent_message ?? entry.assistant ?? entry.bot
    const userLine = entry.user ?? entry.user_message ?? entry.customer ?? entry.human
    if (typeof agentLine === 'string' || typeof userLine === 'string') {
      if (typeof agentLine === 'string' && agentLine.trim()) {
        turns.push({ speaker: 'agent', text: agentLine, at: timeOf(entry) })
      }
      if (typeof userLine === 'string' && userLine.trim()) {
        turns.push({ speaker: 'contact', text: userLine, at: timeOf(entry) })
      }
      continue
    }

    const text = textOf(entry)
    if (!text || isControlRecord(entry, text)) continue
    turns.push({ speaker: speakerOf(entry), text: text.trim(), at: timeOf(entry) })
  }

  warnTranscriptShape(source, turns)
  return orderTurns(turns)
}

/**
 * Chronological order, when the payload gives something to sort by.
 *
 * Sorted only if *every* turn carries a numeric timestamp — a partial sort
 * would shuffle the turns that have none into the wrong places, and the array's
 * own order is the better guess in that case.
 */
function orderTurns(turns) {
  const stamps = turns.map((t) => Number(t.at != null && String(t.at).includes(':')
    ? String(t.at).split(':').reduce((total, part) => total * 60 + Number(part), 0)
    : t.at))
  if (stamps.some((n) => !Number.isFinite(n))) return turns
  return turns
    .map((turn, i) => ({ turn, at: stamps[i], i }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map((entry) => entry.turn)
}

/** Say which keys were on the row when nothing could be read off it, dev only. */
function warnTranscriptShape(source, turns) {
  if (!import.meta.env.DEV) return
  if (turns.length >= source.length || !source.length) return
  const sample = source.find((entry) => entry && typeof entry === 'object')
  console.warn(
    `[call-history/transcript] ${source.length - turns.length} of ${source.length} records were skipped`
    + ' (engine control messages, or no readable text on the row)'
    + `\n  row keys: ${sample ? Object.keys(sample).join(', ') : '(no object rows)'}`,
  )
}

/**
 * The conversation as a chat thread: the agent on the left, the contact on the
 * right, each turn under a speaker avatar. Reading a call transcript is reading
 * a dialogue, so it is laid out as one rather than as a list of rows.
 */
function TranscriptPane({ turns, summary }) {
  if (!turns.length) {
    return (
      <div className="grid gap-4">
        {summary ? <SummaryCard summary={summary} /> : null}
        <EmptyPane
          icon={MessageSquare}
          title="No transcript available"
          hint="A transcript is written after the call is transcribed. Very short or failed calls may never get one."
        />
      </div>
    )
  }

  return (
    <div className="grid min-w-0 gap-4">
      {summary ? <SummaryCard summary={summary} /> : null}
      <div className="grid min-w-0 gap-3">
        {turns.map((turn, index) => {
          const isAgent = turn.speaker === 'agent'
          return (
            <div
              key={index}
              className={`flex min-w-0 items-end gap-2.5 ${isAgent ? '' : 'flex-row-reverse'}`}
            >
              <div
                className="mb-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={isAgent
                  ? { background: 'var(--ui-accent-soft)', color: 'var(--ui-accent-strong)' }
                  : { background: 'var(--ui-surface-2)', color: 'var(--ui-text-3)', border: '1px solid var(--ui-border)' }}
              >
                {isAgent ? <Bot size={14} /> : <User size={14} />}
              </div>

              {/* `w-fit` keeps "Okay" a small bubble instead of a full-width
                  banner, while max-w stops a long turn reaching the far side. */}
              <div className={`flex min-w-0 max-w-[76%] flex-col ${isAgent ? 'items-start' : 'items-end'}`}>
                <div
                  className="w-fit rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed"
                  style={{
                    // `break-words` alone still lets one long unbroken token —
                    // a URL, a reference number — push the drawer sideways.
                    overflowWrap: 'anywhere',
                    ...(isAgent
                      ? {
                        background: 'var(--ui-accent-soft)',
                        color: 'var(--ui-text)',
                        border: '1px solid var(--ui-accent-ring)',
                        borderBottomLeftRadius: 6,
                      }
                      : {
                        background: 'var(--ui-surface-2)',
                        color: 'var(--ui-text)',
                        border: '1px solid var(--ui-border)',
                        borderBottomRightRadius: 6,
                      }),
                  }}
                >
                  {turn.text}
                </div>
                <p
                  className={`mt-1 flex items-center gap-2 px-1 text-[10.5px] font-semibold uppercase tracking-widest ${isAgent ? '' : 'justify-end'}`}
                  style={{ color: 'var(--ui-text-3)' }}
                >
                  {isAgent ? 'Agent' : 'Contact'}
                  {turn.at ? <span className="ui-mono font-normal tracking-normal">{turn.at}</span> : null}
                </p>
              </div>

              {/* Takes up the slack so each bubble hugs its own side. */}
              <div className="flex-1" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryCard({ summary }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--ui-accent-soft)', border: '1px solid var(--ui-accent-ring)' }}
    >
      <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--ui-accent-strong)' }}
      >
        <Sparkles size={11} /> Summary
      </p>
      <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ui-text)' }}>{summary}</p>
    </div>
  )
}

/* ── QA analysis ────────────────────────────────────────────────────────── */

/**
 * The QA report is nine free-form sections of whatever the analysis model chose
 * to emit, and printing all of it produced a wall nobody reads. What is shown
 * here is triaged instead:
 *
 *   1. the answer to "how did this call go" — one score, the outcome, the
 *      sentiment — as a headline row;
 *   2. the summary, the scores and the follow-up actions, which are what a
 *      supervisor acts on;
 *   3. everything else folded behind a disclosure, because it is occasionally
 *      useful and never worth the space by default.
 *
 * Nothing is discarded — bookkeeping fields aside — so a section this code has
 * never heard of still appears under "More detail" rather than vanishing.
 */

const prettyKey = (key) => key.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase())

/** Bookkeeping the reader did not ask for: ids, model names, raw payloads. */
const NOISE_KEY = /^(call_?id|_?id|uuid|model|analysis_model|raw(_.*)?|prompt|tokens?|usage|cost|latency|version|created_at|updated_at|analyzed_at)$/i

function isEmptyValue(value) {
  if (value == null || value === '') return true
  if (typeof value === 'string') return !value.trim() || /^(n\/?a|none|null|unknown)$/i.test(value.trim())
  if (Array.isArray(value)) return !value.length
  if (typeof value === 'object') return !Object.keys(value).length
  return false
}

/** A section's entries, minus bookkeeping and minus anything with no content. */
function cleanEntries(section) {
  if (!section || typeof section !== 'object' || Array.isArray(section)) return []
  return Object.entries(section).filter(([key, value]) => !NOISE_KEY.test(key) && !isEmptyValue(value))
}

/** Scores may be 0–5, 0–10 or 0–100; the scale is inferred from the value. */
function scaleFor(value) {
  if (value > 10) return 100
  if (value > 5) return 10
  return 5
}

const scoreTone = (pct) => (pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#f43f5e')

/** The one number that answers "how did this call go", if the report has one. */
function headlineScore(scores) {
  const entries = Object.entries(scores || {}).filter(([, v]) => typeof v === 'number')
  if (!entries.length) return null
  const named = entries.find(([key]) => /overall|total|average|composite|final/i.test(key))
  if (named) return { label: prettyKey(named[0]), value: named[1] }
  // No overall score reported: the mean of the sub-scores is the honest stand-in.
  const mean = entries.reduce((sum, [, v]) => sum + v, 0) / entries.length
  return { label: 'Average score', value: Math.round(mean * 10) / 10 }
}

const SENTIMENT_TONE = { positive: 'success', neutral: 'neutral', negative: 'danger', mixed: 'warning' }

/** First non-empty value under any of `keys`, searched one level deep. */
function findValue(report, keys) {
  for (const section of Object.values(report || {})) {
    if (!section || typeof section !== 'object' || Array.isArray(section)) continue
    for (const [key, value] of Object.entries(section)) {
      if (keys.test(key) && !isEmptyValue(value) && typeof value !== 'object') return value
    }
  }
  return null
}

/** A big number in a ring, for the single headline score. */
function ScoreDial({ label, value }) {
  const max = scaleFor(value)
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const tone = scoreTone(pct)
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${tone} ${pct}%, var(--ui-border) ${pct}%)` }}
      >
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ background: 'var(--ui-surface)' }}
        >
          <span className="ui-mono text-[15px] font-semibold" style={{ color: 'var(--ui-text)' }}>{value}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="ui-label">{label}</p>
        <p className="ui-mono text-[12px]" style={{ color: 'var(--ui-text-3)' }}>out of {max}</p>
      </div>
    </div>
  )
}

/** A 0–5/0–10/0–100 sub-score, drawn as a bar so a weak one is visible at a glance. */
function ScoreBar({ label, value }) {
  const max = scaleFor(value)
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-[12px]" style={{ color: 'var(--ui-text-2)' }}>{label}</span>
        <span className="ui-mono shrink-0 text-[12.5px] font-semibold" style={{ color: 'var(--ui-text)' }}>
          {value}<span style={{ color: 'var(--ui-text-3)' }}>/{max}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--ui-border-strong)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: scoreTone(pct) }} />
      </div>
    </div>
  )
}

/**
 * Render whatever the report holds without flattening it to JSON.
 *
 * The QA report's shape varies by prompt — a field may be a string, a boolean, a
 * list of findings, or a nested object of sub-scores — and JSON.stringify made
 * all of those unreadable in one line. Each kind gets the form it reads best in.
 */
function ReportValue({ value }) {
  if (value == null || value === '') {
    return <span style={{ color: 'var(--ui-text-3)' }}>—</span>
  }
  if (typeof value === 'boolean') {
    return <Badge tone={value ? 'success' : 'neutral'}>{value ? 'Yes' : 'No'}</Badge>
  }
  if (Array.isArray(value)) {
    if (!value.length) return <span style={{ color: 'var(--ui-text-3)' }}>—</span>
    return (
      <ul className="grid min-w-0 gap-1.5">
        {value.map((entry, i) => (
          <li key={i} className="flex min-w-0 gap-2 text-[12.5px]" style={{ color: 'var(--ui-text)' }}>
            <span className="shrink-0" style={{ color: 'var(--ui-accent)' }}>•</span>
            <span className="min-w-0">
              {entry && typeof entry === 'object' ? <ReportValue value={entry} /> : String(entry)}
            </span>
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === 'object') {
    return (
      <div className="grid min-w-0 gap-1.5">
        {Object.entries(value).map(([key, entry]) => (
          <div key={key} className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-[12.5px]">
            <span style={{ color: 'var(--ui-text-3)' }}>{prettyKey(key)}:</span>
            <span className="min-w-0" style={{ color: 'var(--ui-text)' }}>
              {entry && typeof entry === 'object' ? <ReportValue value={entry} /> : String(entry ?? '—')}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return <span style={{ color: 'var(--ui-text)' }}>{String(value)}</span>
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="ui-card min-w-0 p-4" style={{ overflowWrap: 'anywhere' }}>
      <p className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--ui-text-3)' }}
      >
        <Icon size={11} className="shrink-0" /> {title}
      </p>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/**
 * Key/value rows for one section. A long value gets the full width under its
 * label instead of being squeezed into a right-hand column, which is what made
 * the prose fields unreadable.
 */
function ReportFields({ entries }) {
  if (!entries.length) return null
  return (
    <dl className="grid gap-3">
      {entries.map(([key, value]) => {
        const isProse = typeof value === 'string' && value.length > 90
        const stacked = isProse || (value && typeof value === 'object')
        return (
          <div key={key} className={stacked ? 'grid gap-1' : 'grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-4'}>
            <dt className="text-[12px]" style={{ color: 'var(--ui-text-3)' }}>{prettyKey(key)}</dt>
            <dd className="min-w-0 text-[12.5px] leading-relaxed" style={{ overflowWrap: 'anywhere' }}>
              <ReportValue value={value} />
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/** A section whose content is worth keeping but not worth showing by default. */
function Disclosure({ label, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ui-btn w-full justify-center"
      >
        <ChevronDown
          size={13}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }}
        />
        {open ? 'Hide' : label}
      </button>
      {open ? <div className="mt-3 grid gap-3">{children}</div> : null}
    </div>
  )
}

/** The sections a supervisor acts on, in the order they are read. */
const PRIMARY_SECTIONS = [
  ['business_outcome', 'Outcome', Target],
  ['post_call_actions', 'Follow-up actions', CalendarClock],
  ['agent_performance', 'Agent performance', Bot],
]

const SECONDARY_SECTIONS = [
  ['call_overview', 'Call overview', Phone],
  ['user_profiling', 'About the contact', User],
  ['sentiment_over_time', 'Sentiment over time', Activity],
]

const KNOWN_SECTIONS = new Set([
  ...PRIMARY_SECTIONS.map(([key]) => key),
  ...SECONDARY_SECTIONS.map(([key]) => key),
  'scores', 'custom_answers',
  // Deliberately not rendered — model/provider names and token counts are
  // plumbing, not something a supervisor acts on. Listed here so the
  // unknown-section catch-all does not put it back on screen.
  'conversation_dynamics',
])

function AnalysisPanel({ analysis, report, onRetrigger }) {
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    try { await onRetrigger() } finally { setBusy(false) }
  }

  if (!analysis || analysis.status === 'not_started' || analysis.status === 'not_found') {
    return (
      <EmptyPane
        icon={Sparkles}
        title="No QA analysis for this call"
        hint="Analysis scores the conversation against your quality criteria. It takes a moment to run."
        action={<GhostButton icon={Sparkles} busy={busy} onClick={run}>Run analysis</GhostButton>}
      />
    )
  }

  if (analysis.status === 'failed') {
    return (
      <EmptyPane
        icon={Sparkles}
        title="Analysis failed"
        hint={analysis.error || 'The analysis did not complete.'}
        action={<GhostButton icon={Sparkles} busy={busy} onClick={run}>Try again</GhostButton>}
      />
    )
  }

  if (analysis.status !== 'completed') {
    return (
      <EmptyPane
        icon={Loader2}
        title={`Analysis ${analysis.status}`}
        hint={analysis.error || 'Analysis is still running. Check back shortly.'}
      />
    )
  }

  const score = headlineScore(report?.scores)
  const sentiment = findValue(report, /^(overall_)?sentiment$/i)
  const outcome = findValue(report, /^(outcome|result|disposition|status)$/i)
  const summary = findValue(report, /^(summary|call_summary|overview|description)$/i)

  const subScores = Object.entries(report?.scores || {})
    .filter(([key, v]) => typeof v === 'number' && !/overall|total|average|composite|final/i.test(key))

  const primary = PRIMARY_SECTIONS
    .map(([key, title, icon]) => [title, icon, cleanEntries(report?.[key])])
    .filter(([, , entries]) => entries.length)

  const secondary = SECONDARY_SECTIONS
    .map(([key, title, icon]) => [title, icon, report?.[key]])
    .filter(([, , value]) => !isEmptyValue(value))

  // A section the analysis config added that this code has never heard of.
  const unknown = Object.entries(report || {})
    .filter(([key, value]) => !KNOWN_SECTIONS.has(key) && !isEmptyValue(value))

  const answers = Object.entries(report?.custom_answers || {}).filter(([, v]) => !isEmptyValue(v))
  const nothing = !score && !sentiment && !outcome && !summary
    && !primary.length && !secondary.length && !answers.length && !unknown.length

  if (nothing) {
    return (
      <EmptyPane
        icon={Sparkles}
        title="The report is empty"
        hint="Analysis completed but returned no sections."
        action={<GhostButton icon={Sparkles} busy={busy} onClick={run}>Re-run analysis</GhostButton>}
      />
    )
  }

  /* Every value below is model output of unknown length, inside a drawer that
     clips horizontally. `min-w-0` stops a wide child from stretching the grid
     track, and the wrap rules break long words rather than letting them run
     past the card edge. */
  return (
    <div className="grid min-w-0 gap-3" style={{ overflowWrap: 'anywhere' }}>
      {score || sentiment || outcome ? (
        <div
          className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl px-4 py-4"
          style={{ background: 'var(--ui-surface-2)', border: '1px solid var(--ui-border)' }}
        >
          {score ? <ScoreDial label={score.label} value={score.value} /> : null}
          {outcome ? (
            <div className="min-w-0">
              <p className="ui-label mb-1.5">Outcome</p>
              <Badge tone="info">{String(outcome)}</Badge>
            </div>
          ) : null}
          {sentiment ? (
            <div className="min-w-0">
              <p className="ui-label mb-1.5">Sentiment</p>
              <Badge tone={SENTIMENT_TONE[String(sentiment).toLowerCase()] || 'neutral'}>
                {String(sentiment)}
              </Badge>
            </div>
          ) : null}
        </div>
      ) : null}

      {summary ? (
        <div className="ui-card p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--ui-text-3)' }}
          >
            <FileText size={11} /> What happened
          </p>
          <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ui-text)' }}>{String(summary)}</p>
        </div>
      ) : null}

      {subScores.length ? (
        <SectionCard title="Scores" icon={Hash}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {subScores.map(([key, value]) => <ScoreBar key={key} label={prettyKey(key)} value={value} />)}
          </div>
        </SectionCard>
      ) : null}

      {answers.length ? (
        <SectionCard title="Your questions" icon={HelpCircle}>
          <div className="grid gap-3">
            {answers.map(([key, value]) => (
              <div key={key}>
                <p className="mb-0.5 text-[12px] font-medium" style={{ color: 'var(--ui-text-2)' }}>
                  {prettyKey(key)}
                </p>
                <div className="text-[12.5px] leading-relaxed"><ReportValue value={value} /></div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {primary.map(([title, icon, entries]) => (
        <SectionCard key={title} title={title} icon={icon}>
          <ReportFields entries={entries} />
        </SectionCard>
      ))}

      {secondary.length || unknown.length ? (
        <Disclosure label="More detail">
          {secondary.map(([title, icon, value]) => (
            <SectionCard key={title} title={title} icon={icon}>
              {Array.isArray(value)
                ? <ReportValue value={value} />
                : <ReportFields entries={cleanEntries(value)} />}
            </SectionCard>
          ))}
          {unknown.map(([key, value]) => (
            <SectionCard key={key} title={prettyKey(key)} icon={Sparkles}>
              {typeof value === 'object' && !Array.isArray(value)
                ? <ReportFields entries={cleanEntries(value)} />
                : <ReportValue value={value} />}
            </SectionCard>
          ))}
        </Disclosure>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <span className="text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
          {analysis.analyzed_at ? `Analysed ${formatDateTime(analysis.analyzed_at)}` : ''}
        </span>
        <GhostButton icon={Sparkles} busy={busy} onClick={run}>Re-run analysis</GhostButton>
      </div>
    </div>
  )
}
