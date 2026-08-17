import { useEffect, useMemo, useState } from 'react'
import {
  PhoneOutgoing, PhoneOff, RefreshCw, Braces, PanelRightOpen, Loader2,
} from 'lucide-react'
import { placeCall } from '../../api/resources/calls'
import { listAgents, getAgentDetail } from '../../api/resources/agents'
import { listTelephonyNumbers } from '../../api/resources/billing'
import { listCategories } from '../../api/resources/catalog'
import { listContacts } from '../../api/resources/contacts'
import { can } from '../../api/permissions'
import {
  useActiveCalls, isTerminalStatus, isPreConnectStatus, statusTone, STALL_MS,
  useNow, elapsedSince, settledDuration,
} from '../../hooks/useActiveCalls'
import { dedupeContacts, formatPhone, nationalDigits, toE164 } from '../../utils/phone'
import { validatePhoneNumberForCountry } from '../../utils/countryCodes'
import { useDialCodes } from '../../hooks/useDialCodes'
import { CountryCodeField } from '../../components/resource/CountryCodeField'
import ActiveCallModal from './ActiveCallModal'
import {
  PageShell, PageHeader, PrimaryButton, GhostButton, DataTable, Banner, Badge,
  TextField, SelectField,
} from '../../components/resource/ResourceKit'
import { formatTime } from '../../utils/datetime'

/** Pull {{variable}} names out of a prompt's text, as the editor does. */
function detectVariables(...texts) {
  const found = []
  const regex = /\{\{\s*([\w.-]+)\s*\}\}/g
  for (const text of texts) {
    let match
    while ((match = regex.exec(text || '')) !== null) {
      if (!found.includes(match[1])) found.push(match[1])
    }
  }
  return found.sort()
}

/**
 * Outbound calling. The backend places one call per request, so calling a
 * list of contacts fans out here and each call is tracked individually.
 *
 * Live call state is owned by useActiveCalls, which polls the backend and
 * survives a refresh — this page only places calls and renders what the hook
 * reports.
 */
export default function PlaceCallPage() {
  const [agents, setAgents] = useState([])
  const [numbers, setNumbers] = useState([])
  const [categories, setCategories] = useState([])
  const [contacts, setContacts] = useState([])
  const [selected, setSelected] = useState(new Set())

  const [agentId, setAgentId] = useState('')
  const [telephonyId, setTelephonyId] = useState(import.meta.env.VITE_TELEPHONY_ID || '')
  const [categoryId, setCategoryId] = useState('')
  const [manual, setManual] = useState({ toNumber: '', name: '', countryCode: '+91' })
  const dialCodes = useDialCodes()

  // Validate the subscriber number, so pasting a prefixed number is accepted
  // and dialed once rather than rejected as too long.
  const manualDigits = nationalDigits(manual.countryCode, manual.toNumber)
  const manualCheck = validatePhoneNumberForCountry({
    phoneNumber: manualDigits,
    dialCode: manual.countryCode,
  })

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [promptVars, setPromptVars] = useState([])
  const [varValues, setVarValues] = useState({})
  /** Dials the backend rejected. They have no SID, so nothing can track them. */
  const [failed, setFailed] = useState([])
  const [openSid, setOpenSid] = useState('')
  /** Batch dialing progress, so a long selection does not look stalled. */
  const [progress, setProgress] = useState(null)

  /**
   * A call this browser did not place — one still running from before a
   * refresh, or from another tab — arrives without a telephony id, and the
   * status and hang-up routes both require one. The selected number stands in;
   * failing that, the account's only outbound number does, since then there is
   * nothing to be ambiguous about.
   */
  const onlyOutboundId = useMemo(() => {
    const outbound = numbers.filter((n) => n.outbound_enabled)
    return outbound.length === 1 ? outbound[0].number_id : ''
  }, [numbers])

  const calls = useActiveCalls({ fallbackTelephonyId: telephonyId || onlyOutboundId })
  /** Drives the live elapsed timers; idle when nothing is running. */
  const now = useNow(calls.hasLive)

  useEffect(() => {
    listAgents({ limit: 100, isActive: true }).then((d) => setAgents(d.items)).catch(() => setAgents([]))
    listTelephonyNumbers()
      .then((d) => {
        setNumbers(d.items)
        // VITE_TELEPHONY_ID only pins a number when it is actually one of the
        // company's own. Empty or stale, fall back to the first outbound line
        // so the picker is never left on the placeholder with a usable number
        // sitting in the list.
        setTelephonyId((current) => {
          if (current && d.items.some((n) => n.number_id === current)) return current
          return d.items.find((n) => n.outbound_enabled)?.number_id ?? ''
        })
      })
      .catch((e) => setError(e.message || 'Could not load telephony numbers.'))
    listCategories().then((d) => setCategories(d.items)).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (!categoryId) { setContacts([]); setSelected(new Set()); return undefined }
    let cancelled = false
    setLoadingContacts(true)
    setSelected(new Set())
    listContacts({ categoryId, limit: 100 })
      // Replace rather than append, and ignore a response that arrived after the
      // category changed again — both routes to a list showing a contact twice.
      .then((d) => { if (!cancelled) setContacts(d.items) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Could not load contacts.') })
      .finally(() => { if (!cancelled) setLoadingContacts(false) })
    return () => { cancelled = true }
  }, [categoryId])

  // The variables a call can carry come from the chosen agent's prompt, so the
  // list only exists once an agent is picked. Defaults saved on the prompt are
  // prefilled and can be overridden for this batch of calls.
  useEffect(() => {
    if (!agentId) { setPromptVars([]); setVarValues({}); return undefined }
    let cancelled = false
    getAgentDetail(agentId)
      .then((detail) => {
        if (cancelled) return
        const names = detectVariables(detail?.prompt?.promptText, detail?.prompt?.initialSay)
        const defaults = detail?.prompt?.variables ?? {}
        setPromptVars(names)
        setVarValues(Object.fromEntries(names.map((name) => [name, defaults[name] ?? ''])))
      })
      .catch(() => { if (!cancelled) { setPromptVars([]); setVarValues({}) } })
    return () => { cancelled = true }
  }, [agentId])

  /**
   * The same person is stored more than once in some categories, with the
   * dialing prefix repeated inside the number (+91 7659042468 and
   * +91 917659042468). They are separate rows with separate ids, so the list is
   * collapsed on the normalised number.
   */
  const uniqueContacts = useMemo(() => dedupeContacts(contacts), [contacts])
  const duplicateCount = contacts.length - uniqueContacts.length

  /** Only non-empty values are sent — an empty one would blank the default. */
  function callVariables() {
    return Object.fromEntries(
      Object.entries(varValues).filter(([, value]) => String(value).trim()),
    )
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /**
   * Pacing for a multi-contact batch.
   *
   * The backend rate-limits `POST /call` — a second dial sent immediately
   * after the first comes back 429 with no body — so the batch leaves a gap
   * between dials and retries a rejected one rather than dropping it. The
   * server's own `Retry-After` wins when it sends one.
   */
  const DIAL_GAP_MS = 2000
  const RATE_LIMIT_RETRIES = 2
  const RATE_LIMIT_BACKOFF_MS = [4000, 9000]

  const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

  /** Places one call and hands the SID to the tracker. */
  async function dial(target) {
    const result = await placeCall({
      toNumber: target.toNumber,
      name: target.name,
      agentId,
      telephonyId,
      countryCode: target.countryCode,
      variables: callVariables(),
    })
    const callSid = result?.call_sid ?? result?.callID ?? result?.call_id
    if (!callSid) throw new Error('The backend did not return a call SID for this call.')
    const entry = {
      callSid,
      name: target.name || target.toNumber,
      toNumber: result?.to_number || target.toNumber,
      telephonyId: result?.telephony_id || telephonyId,
      status: result?.status ?? '',
    }
    calls.track(entry)
    return entry
  }

  async function handleCallSelected() {
    const targets = uniqueContacts
      .filter((c) => selected.has(c.customerID))
      .map((c) => ({
        // E.164, with a duplicated prefix collapsed, so the provider gets one
        // dialable number regardless of how the contact was stored.
        toNumber: toE164(c.countryCode, c.phoneNumber),
        name: c.contactName,
        countryCode: c.countryCode,
      }))
      .filter((t) => t.toNumber)

    if (!targets.length || busy) return
    setBusy(true)
    setError('')
    setFailed([])

    /*
     * One request at a time, with a gap between them.
     *
     * The backend places a single call per request, and firing the whole
     * selection at once means several concurrent dials against the same
     * telephony number — which the provider can reject outright. Dialing in
     * sequence costs one round trip per contact and each result stands alone,
     * so one rejection no longer decides the batch.
     */
    const rejected = []
    let firstSid = ''
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index]
      setProgress({ done: index, total: targets.length })

      // A rate-limited dial is retried, not abandoned: the limit is about how
      // fast the requests arrive, so the same number usually goes through a
      // few seconds later.
      let lastError
      for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt += 1) {
        try {
          const entry = await dial(target)
          if (!firstSid) firstSid = entry.callSid
          lastError = null
          break
        } catch (e) {
          lastError = e
          const rateLimited = e?.status === 429
          if (!rateLimited || attempt === RATE_LIMIT_RETRIES) break
          const backoff = e?.retryAfter
            ? e.retryAfter * 1000
            : RATE_LIMIT_BACKOFF_MS[attempt] ?? 9000
          setProgress({ done: index, total: targets.length, waiting: true })
          await wait(backoff)
          setProgress({ done: index, total: targets.length })
        }
      }

      if (lastError) {
        rejected.push({
          key: `failed-${target.toNumber}-${index}`,
          callSid: '',
          name: target.name || target.toNumber,
          toNumber: target.toNumber,
          status: 'failed',
          error: lastError.status === 429
            ? 'Rate limited by the server. It would not accept another call this soon.'
            : lastError.message || 'Call failed.',
        })
      }

      // Space the next dial out, so the batch does not walk straight back
      // into the limit it just waited out.
      if (index < targets.length - 1) await wait(DIAL_GAP_MS)
    }

    setProgress(null)
    setFailed(rejected)
    if (rejected.length) {
      setError(rejected.length === targets.length
        ? `None of the ${targets.length} calls could be placed: ${rejected[0].error}`
        : `${rejected.length} of ${targets.length} calls could not be placed. See the rows below.`)
    }
    setSelected(new Set())
    setBusy(false)
    // Surface the first call that did go through.
    if (firstSid) setOpenSid(firstSid)
  }

  async function handleManualCall() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const entry = await dial({ ...manual, toNumber: toE164(manual.countryCode, manualDigits) })
      setManual({ toNumber: '', name: '', countryCode: manual.countryCode })
      setOpenSid(entry.callSid)
    } catch (e) {
      setError(e.message || 'Call failed.')
    } finally {
      setBusy(false)
    }
  }

  function handleRefresh(row) {
    calls.setError('')
    setError('')
    calls.refreshStatus(row.callSid, row.telephonyId)
      .catch((e) => setError(e.message || 'Could not refresh the call status.'))
  }

  function handleEnd(row) {
    calls.setError('')
    setError('')
    calls.hangUp(row).catch((e) => setError(e.message || 'Could not end the call.'))
  }

  /** Resolves to true when the backend accepted the transfer. */
  async function handleTransfer(row, destination) {
    setError('')
    try {
      await calls.transfer(row, destination)
      return true
    } catch (e) {
      setError(e.message || 'Could not transfer the call.')
      return false
    }
  }

  if (!can.placeCalls()) {
    return (
      <PageShell>
        <PageHeader icon={PhoneOutgoing} title="Place a call" />
        <Banner>
          Placing calls requires the call agent role or above. Ask an admin to change your role.
        </Banner>
      </PageShell>
    )
  }

  const selectedNumber = numbers.find((n) => n.number_id === telephonyId)
  const ready = Boolean(agentId && telephonyId && selectedNumber?.outbound_enabled)
  /**
   * Only calls that are still running are listed. A finished call belongs to
   * Call history, not here — the modal keeps showing one that ended while it is
   * open, so its final status and duration are still visible.
   */
  const liveCalls = calls.rows.filter((r) => r.live || !r.statusKnown)
  const tableRows = [...failed, ...liveCalls]
  const openCall = calls.rows.find((r) => r.callSid === openSid) ?? null
  /**
   * When the status will not move, this separates "the poll is not running" from
   * "the backend keeps answering with the same status".
   */
  const newestCheck = Math.max(0, ...calls.rows.map((r) => r.updatedAt ?? 0))
  const lastChecked = newestCheck
    ? formatTime(newestCheck)
    : ''
  /**
   * A call the provider accepted but never started. Flagged on the row because
   * it means the phone will not ring, however long you wait.
   */
  const stalled = calls.rows.filter((r) => r.live
    && isPreConnectStatus(r.status)
    && r.statusChangedAt
    && newestCheck - r.statusChangedAt > STALL_MS)

  return (
    <PageShell>
      <PageHeader
        icon={PhoneOutgoing}
        title="Place a call"
        subtitle="Dial one contact or a selection from a category"
      />

      <Banner onDismiss={() => { setError(''); calls.setError('') }}>
        {error || calls.error || calls.statusError}
      </Banner>

      <div className="ui-card mb-5 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Agent"
            value={agentId}
            onChange={setAgentId}
            placeholder="Choose an agent"
            options={agents.map((a) => ({ id: a.agentID, label: a.agentName }))}
          />
          <SelectField
            label="Call from"
            value={telephonyId}
            onChange={setTelephonyId}
            placeholder="Choose a number"
            options={numbers.map((n) => ({
              id: n.number_id,
              // Inbound-only numbers are listed but not selectable, so it is
              // clear they exist rather than looking like no numbers at all.
              disabled: !n.outbound_enabled,
              label: [
                n.e164_number ?? n.number_id,
                n.outbound_enabled ? '' : '(inbound only)',
              ].filter(Boolean).join(' '),
            }))}
          />
        </div>
        {promptVars.length ? (
          <div className="mt-5" style={{ borderTop: '1px solid var(--ui-border)' }}>
            <div className="mb-3 mt-4 flex items-center gap-2">
              <Braces size={14} style={{ color: 'var(--ui-accent-strong)' }} />
              <span className="ui-h2" style={{ fontSize: 13 }}>Variables</span>
              <span className="text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
                {promptVars.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {promptVars.map((name) => (
                <TextField
                  key={name}
                  label={`{{${name}}}`}
                  value={varValues[name] ?? ''}
                  onChange={(v) => setVarValues((p) => ({ ...p, [name]: v }))}
                  placeholder="Leave blank to use the default"
                />
              ))}
            </div>
            <p className="mt-2.5 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
              Sent with every call in this batch. Blank fields fall back to the prompt's default, and
              contact fields the backend fills in itself take precedence.
            </p>
          </div>
        ) : null}

        {!ready ? (
          <p className="mt-3 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
            {!agents.length
              ? 'No agents yet. Create one on the Agents page.'
              : !numbers.length
                ? 'No telephony numbers on this account. Add one on the Telephony page.'
                : !numbers.some((n) => n.outbound_enabled)
                  ? 'None of your numbers are outbound-enabled. Enable outbound on one from the Telephony page.'
                  : 'Choose an agent and a number to start calling.'}
          </p>
        ) : null}
      </div>

      <div className="ui-card mb-5 p-4 sm:p-5">
        <p className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--ui-text)' }}>Call a single number</p>
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[210px_1fr_1fr_auto]">
          <CountryCodeField
            value={manual.countryCode}
            onChange={(v) => setManual((p) => ({ ...p, countryCode: v }))}
            options={dialCodes}
          />
          <div>
            <TextField
              label="Number"
              value={manual.toNumber}
              onChange={(v) => setManual((p) => ({ ...p, toNumber: v }))}
              inputMode="tel"
            />
            {/* The dialer is the expensive place to get a number wrong — a bad
                one is a failed call and a wasted telephony leg, not just a bad
                row — so the same check runs here before the button unlocks. */}
            {manual.toNumber.trim() && !manualCheck.isValid ? (
              <p className="mt-1.5 text-[11px]" style={{ color: '#e11d48' }}>{manualCheck.message}</p>
            ) : manualDigits ? (
              <p className="mt-1.5 text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
                Dials {toE164(manual.countryCode, manualDigits)}
              </p>
            ) : null}
          </div>
          <TextField label="Name" value={manual.name} onChange={(v) => setManual((p) => ({ ...p, name: v }))} />
          {/* Offset by the field-label row so the button lines up with the
              inputs rather than with the labels above them. PrimaryButton sets
              its own className, so the spacing lives on a wrapper. */}
          <div className="sm:pt-[26px]">
            <PrimaryButton
              icon={PhoneOutgoing}
              busy={busy}
              disabled={!ready || !manualCheck.isValid}
              onClick={handleManualCall}
            >
              Call
            </PrimaryButton>
          </div>
        </div>
      </div>

      <div className="ui-card mb-5 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--ui-text)' }}>Call from a category</p>
            <p className="text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
              {selected.size ? `${selected.size} selected` : 'Select contacts to dial'}
              {duplicateCount > 0
                ? ` · ${duplicateCount} duplicate ${duplicateCount === 1 ? 'entry' : 'entries'} merged`
                : ''}
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="w-full sm:w-56">
              <SelectField
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Choose a category"
                options={categories.map((c) => ({
                  id: c.categoryID ?? c.category_id,
                  label: c.categoryName ?? c.category_name,
                }))}
              />
            </div>
            <PrimaryButton
              icon={PhoneOutgoing}
              busy={busy}
              disabled={!ready || !selected.size}
              onClick={handleCallSelected}
            >
              {progress
                ? (progress.waiting
                  ? `Rate limited, retrying ${progress.done + 1}/${progress.total}`
                  : `Calling ${progress.done + 1}/${progress.total}`)
                : `Call ${selected.size || ''}`}
            </PrimaryButton>
          </div>
        </div>

        {loadingContacts ? (
          <p className="text-[12.5px]" style={{ color: 'var(--ui-text-3)' }}>Loading contacts...</p>
        ) : uniqueContacts.length ? (
          <div className="max-h-72 overflow-y-auto">
            {uniqueContacts.map((contact) => (
              <label
                key={contact.customerID}
                className="flex cursor-pointer items-center gap-3 border-b border-[color:var(--ui-border)] px-1 py-2.5 last:border-0"
              >
                <input
                  type="checkbox"
                  checked={selected.has(contact.customerID)}
                  onChange={() => toggle(contact.customerID)}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]" style={{ color: 'var(--ui-text)' }}>
                    {contact.contactName}
                  </span>
                  <span className="block truncate font-mono text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
                    {formatPhone(contact.countryCode, contact.phoneNumber)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : categoryId ? (
          <p className="text-[12.5px]" style={{ color: 'var(--ui-text-3)' }}>No contacts in this category.</p>
        ) : null}
      </div>

      {tableRows.length || calls.loading ? (
        <div className="ui-card p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--ui-text)' }}>
                Live calls
                {liveCalls.length > 1 ? (
                  <span className="ml-1.5 font-normal" style={{ color: 'var(--ui-text-3)' }}>
                    {liveCalls.length}
                  </span>
                ) : null}
              </p>
              <p className="flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
                {calls.hasLive ? (
                  <>
                    <Loader2 size={11} className="animate-spin" />
                    {lastChecked
                      ? `Polling the backend every 5s, last answer ${lastChecked}`
                      : 'Polling the backend for the live status'}
                  </>
                ) : 'Reloaded from the backend on refresh. Finished calls move to Call history.'}
              </p>
            </div>
            <GhostButton
              icon={RefreshCw}
              busy={calls.historyPending}
              onClick={() => calls.reload().catch((e) => setError(e.message))}
            >
              Refresh
            </GhostButton>
          </div>

          {stalled.length ? (
            <div
              className="mb-3 rounded-xl px-4 py-3 text-[12.5px] leading-relaxed"
              style={{
                background: 'rgba(245,158,11,0.10)',
                border: '1px solid rgba(245,158,11,0.24)',
                color: '#b45309',
              }}
            >
              {stalled.length === 1 ? 'This call has' : `${stalled.length} calls have`} been sitting at
              a pre-connect status for over {Math.round(STALL_MS / 1000)}s. The provider accepted
              {stalled.length === 1 ? ' it' : ' them'} but never started the call, so the phone will
              not ring. Open <strong>Details</strong> for what to check.
            </div>
          ) : null}

          <DataTable
            columns={[
              { key: 'name', header: 'Contact', render: (r) => r.name || '—' },
              {
                key: 'toNumber',
                header: 'Number',
                render: (r) => <span className="font-mono text-[12px]">{r.toNumber || '—'}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => (
                  <div className="flex flex-col gap-1">
                    <Badge tone={r.error ? 'danger' : statusTone(r.status)}>
                      {r.status || 'checking...'}
                    </Badge>
                    {r.error ? <span className="text-[11px]" style={{ color: '#e11d48' }}>{r.error}</span> : null}
                  </div>
                ),
              },
              {
                key: 'duration',
                header: 'Duration',
                render: (r) => {
                  const settled = settledDuration(r.duration)
                  if (settled) return <span className="ui-mono text-[12px]">{settled}</span>
                  // Still running: count up from when it was placed.
                  if (!r.live) return '—'
                  return (
                    <span
                      className="ui-mono text-[12px]"
                      style={{ color: 'var(--ui-accent-strong)' }}
                      title="Elapsed since the call was placed"
                    >
                      {elapsedSince(now, r.placedAt) ?? '—'}
                    </span>
                  )
                },
              },
              {
                key: 'actions',
                header: '',
                className: 'text-right',
                render: (row) => (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {row.callSid ? (
                      <>
                        <GhostButton icon={PanelRightOpen} onClick={() => setOpenSid(row.callSid)}>
                          Details
                        </GhostButton>
                        <GhostButton
                          icon={RefreshCw}
                          busy={calls.isPending('status', row.callSid)}
                          onClick={() => handleRefresh(row)}
                        >
                          Status
                        </GhostButton>
                        <GhostButton
                          icon={PhoneOff}
                          busy={calls.isPending('end', row.callSid)}
                          onClick={() => handleEnd(row)}
                        >
                          End
                        </GhostButton>
                      </>
                    ) : null}
                  </div>
                ),
              },
            ]}
            rows={tableRows}
            rowKey={(r) => r.key || r.callSid}
            onRowClick={(row) => (row.callSid ? setOpenSid(row.callSid) : undefined)}
            loading={calls.loading && !tableRows.length}
            empty="No calls placed yet."
          />
        </div>
      ) : null}

      <ActiveCallModal
        call={openCall}
        siblings={liveCalls}
        onSelect={setOpenSid}
        onClose={() => {
          // A call that finished while the panel was open has nothing left to
          // show, so stop tracking it rather than leaving a dead pointer behind.
          if (openCall && isTerminalStatus(openCall.status)) calls.untrack(openCall.callSid)
          setOpenSid('')
        }}
        onRefresh={handleRefresh}
        onEnd={handleEnd}
        onTransfer={handleTransfer}
        isPending={calls.isPending}
        error={error}
        onDismissError={() => setError('')}
      />
    </PageShell>
  )
}
