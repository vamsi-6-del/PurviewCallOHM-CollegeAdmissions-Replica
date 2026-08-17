import { useState } from 'react'
import {
  Phone, PhoneOff, PhoneForwarded, RefreshCw, User, Clock, Radio, Bot, AlertTriangle,
} from 'lucide-react'
import {
  PrimaryButton, GhostButton, DangerButton, TextField, Badge, Banner, Drawer,
} from '../../components/resource/ResourceKit'
import {
  isPreConnectStatus, isTerminalStatus, normalizeStatus, statusTone, STALL_MS,
  useNow, elapsedSince, settledDuration,
} from '../../hooks/useActiveCalls'

/**
 * The live-call panel for one call.
 *
 * Everything it shows is backend state: the status comes from /call-status and
 * the duration from the call-history record. The only value computed locally is
 * the elapsed clock shown while a call is still running and the backend has no
 * final duration yet — labelled "elapsed" so it is not read as one.
 */

const STATE_TEXT = {
  queued: 'Queued with the provider, waiting to dial.',
  'call-started': 'Dialing the contact.',
  initiated: 'Dialing the contact.',
  ringing: 'Ringing. Waiting for the contact to answer.',
  'in-progress': 'Connected. The agent is on the call.',
  answered: 'Connected. The agent is on the call.',
  transferring: 'Handing the call over to the transfer destination.',
  completed: 'The call finished normally.',
  failed: 'The call could not be connected.',
  busy: 'The line was busy.',
  'no-answer': 'Nobody answered.',
  canceled: 'The call was cancelled before it connected.',
  ended: 'The call was ended.',
}

function Row({ icon: Icon, label, children }) {
  return (
    <div
      className="flex items-start justify-between gap-4 py-2.5 last:border-0"
      style={{ borderBottom: '1px solid var(--ui-border)' }}
    >
      <span className="flex shrink-0 items-center gap-2 text-[12px]" style={{ color: 'var(--ui-text-3)' }}>
        <Icon size={13} />
        {label}
      </span>
      <span className="min-w-0 text-right text-[13px] font-medium" style={{ color: 'var(--ui-text)' }}>
        {children}
      </span>
    </div>
  )
}

export default function ActiveCallModal({
  call, siblings = [], onSelect, onClose, onRefresh, onTransfer, onEnd, isPending, error,
  onDismissError,
}) {
  /** Other calls running at the same time, so a batch is reachable from here. */
  const others = siblings.filter((c) => c.callSid && c.callSid !== call?.callSid)

  return (
    <Drawer
      open={Boolean(call)}
      onClose={onClose}
      width="max-w-lg"
      title={call?.name || call?.toNumber || 'Call'}
      subtitle={call?.toNumber}
      footer={call ? (
        <CallActions
          call={call}
          onClose={onClose}
          onRefresh={onRefresh}
          onEnd={onEnd}
          isPending={isPending}
        />
      ) : null}
    >
      {others.length ? (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ui-text-3)' }}>
            Also live
          </span>
          {others.map((other) => (
            <button
              key={other.callSid}
              type="button"
              onClick={() => onSelect(other.callSid)}
              className="ui-chip"
              style={{ cursor: 'pointer' }}
              title={other.toNumber}
            >
              {other.name || other.toNumber}
            </button>
          ))}
        </div>
      ) : null}

      {call ? (
        <CallBody
          // Remounting per call resets the transfer form without an effect.
          key={call.callSid}
          call={call}
          onTransfer={onTransfer}
          isPending={isPending}
          error={error}
          onDismissError={onDismissError}
        />
      ) : null}
    </Drawer>
  )
}

/**
 * Transfer opens a form inside the body rather than a second modal, so the
 * footer only carries the actions that fire immediately.
 */
function CallBody({ call, onTransfer, isPending, error, onDismissError }) {
  const [showTransfer, setShowTransfer] = useState(false)
  const [destination, setDestination] = useState('')

  const status = normalizeStatus(call.status)
  const live = Boolean(call.status) && !isTerminalStatus(status)
  const transferring = isPending('transfer', call.callSid)
  const backendDuration = settledDuration(call.duration)

  const now = useNow(live)
  const elapsed = backendDuration ? null : elapsedSince(now, call.placedAt)
  /**
   * The provider took the call but never started it. That is not something the
   * frontend can fix, so say what it means rather than showing the same status
   * indefinitely with no explanation.
   */
  const stalledFor = live && isPreConnectStatus(status) && call.statusChangedAt
    ? now - call.statusChangedAt
    : 0
  const stalled = stalledFor > STALL_MS

  return (
    <>
      <Banner onDismiss={onDismissError}>{error}</Banner>

      <div
        className="mb-4 flex items-center gap-3.5 rounded-2xl p-4"
        style={{
          background: live ? 'var(--ui-accent-soft)' : 'var(--ui-surface-2)',
          border: '1px solid var(--ui-border)',
        }}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: live ? 'var(--ui-accent-strong)' : 'var(--ui-surface)',
            color: live ? '#fff' : 'var(--ui-text-3)',
          }}
        >
          <Phone size={18} className={live ? 'animate-pulse' : ''} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(call.status)}>{call.status || 'checking...'}</Badge>
            {live ? (
              <span className="text-[11.5px] font-semibold" style={{ color: 'var(--ui-accent-strong)' }}>
                live
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--ui-text-2)' }}>
            {STATE_TEXT[status] || (call.statusKnown
              ? 'Status reported by the telephony provider.'
              : 'Fetching the current status from the backend...')}
          </p>
          {call.staleProviderStatus ? (
            <p className="mt-1 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
              From the finalised call record. The provider&rsquo;s live status endpoint still returns
              its cached value.
            </p>
          ) : null}
        </div>
      </div>

      {stalled ? (
        <div
          className="mb-4 flex items-start gap-3 rounded-2xl p-4"
          style={{
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(245,158,11,0.24)',
            color: '#b45309',
          }}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="min-w-0 text-[12.5px] leading-relaxed">
            <p className="font-semibold">
              Still &ldquo;{call.status}&rdquo; after {elapsedSince(now, call.statusChangedAt)}
            </p>
            <p className="mt-1">
              The provider accepted the call but never started it, so it will not ring. This is a
              backend/telephony condition, not a problem with this page: the provider has to fetch the
              answer URL from the backend, which fails when the backend&rsquo;s public webhook URL is
              unreachable. Check the provider&rsquo;s call log for this SID (error 11200 means the
              webhook could not be reached) and that the backend&rsquo;s public URL is live.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid">
        <Row icon={User} label="Contact">{call.name || '—'}</Row>
        <Row icon={Phone} label="Number">
          <span className="ui-mono text-[12.5px]">{call.toNumber || '—'}</span>
        </Row>
        {call.agentName ? <Row icon={Bot} label="Agent">{call.agentName}</Row> : null}
        <Row icon={Clock} label={backendDuration ? 'Duration' : 'Elapsed'}>
          {backendDuration ? (
            <span className="ui-mono text-[12.5px]">{backendDuration}</span>
          ) : elapsed ? (
            <span
              className="ui-mono text-[12.5px]"
              style={{ color: live ? 'var(--ui-accent-strong)' : undefined }}
            >
              {elapsed}
            </span>
          ) : '—'}
        </Row>
        <Row icon={Radio} label="Call SID">
          <span className="ui-mono break-all text-[11.5px]">{call.callSid}</span>
        </Row>
      </div>

      {live ? (
        showTransfer ? (
          <div className="ui-card mt-4 p-4">
            <p className="mb-3 text-[12.5px] font-semibold" style={{ color: 'var(--ui-text)' }}>
              Transfer this call
            </p>
            <TextField
              label="Transfer to"
              value={destination}
              onChange={setDestination}
              placeholder="+919876543210"
              autoFocus
            />
            <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: 'var(--ui-text-3)' }}>
              Include the country code. The agent on this call must have call transfer switched on in
              its settings, otherwise the backend rejects the transfer.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <GhostButton disabled={transferring} onClick={() => setShowTransfer(false)}>Cancel</GhostButton>
              <PrimaryButton
                icon={PhoneForwarded}
                busy={transferring}
                disabled={!destination.trim() || transferring}
                onClick={async () => {
                  const ok = await onTransfer(call, destination.trim())
                  if (ok) setShowTransfer(false)
                }}
              >
                Transfer
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <GhostButton icon={PhoneForwarded} onClick={() => setShowTransfer(true)}>
              Transfer to a person
            </GhostButton>
          </div>
        )
      ) : null}

      {call.recordingPath ? (
        <p className="mt-4 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
          A recording has been stored for this call. It is listed on the Recordings page.
        </p>
      ) : null}
    </>
  )
}

function CallActions({ call, onClose, onRefresh, onEnd, isPending }) {
  const live = Boolean(call.status) && !isTerminalStatus(call.status)
  const refreshing = isPending('status', call.callSid)
  const ending = isPending('end', call.callSid)

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <GhostButton icon={RefreshCw} busy={refreshing} disabled={refreshing} onClick={() => onRefresh(call)}>
        Status
      </GhostButton>
      <div className="flex flex-wrap items-center gap-2">
        <GhostButton onClick={onClose}>Close</GhostButton>
        <DangerButton busy={ending} disabled={!live || ending} onClick={() => onEnd(call)}>
          {ending ? 'Ending...' : <><PhoneOff size={13} /> End call</>}
        </DangerButton>
      </div>
    </div>
  )
}
