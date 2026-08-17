import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, PhoneOff, Loader2, Radio } from 'lucide-react'
import { Room, RoomEvent, Track } from 'livekit-client'
import { createPreviewSession } from '../../api/resources/agents'
import { Drawer, GhostButton, PrimaryButton, Banner } from '../../components/resource/ResourceKit'

/**
 * Talk to an agent in the browser before putting it on a real call.
 *
 * The backend hands back a LiveKit room and token; audio flows over WebRTC, so
 * nothing here goes through the telephony provider and no credits are spent.
 *
 * The Room is held in a ref rather than state — it is a live connection, not
 * rendered data, and re-rendering must never recreate it. Every exit path
 * disconnects it, because a room left open keeps the microphone hot.
 */

/** The session response is undocumented; accept the shapes it could take. */
function readSession(res) {
  const url = res?.url ?? res?.server_url ?? res?.serverUrl ?? res?.livekit_url
    ?? res?.ws_url ?? res?.wsUrl ?? res?.livekit?.url
  const token = res?.token ?? res?.access_token ?? res?.accessToken
    ?? res?.participant_token ?? res?.livekit?.token
  return { url, token }
}

export default function AgentPreviewModal({ open, agentId, agentName, onClose }) {
  const [state, setState] = useState('idle') // idle | connecting | live | ended
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const roomRef = useRef(null)
  const audioRef = useRef(null)

  const teardown = useCallback(async () => {
    const room = roomRef.current
    roomRef.current = null
    if (room) await room.disconnect().catch(() => {})
    if (audioRef.current) audioRef.current.replaceChildren()
    setMuted(false)
    setSpeaking(false)
  }, [])

  // Closing the drawer, navigating away or unmounting all end the session.
  useEffect(() => {
    if (!open) { teardown(); setState('idle'); setError('') }
  }, [open, teardown])

  useEffect(() => () => { teardown() }, [teardown])

  async function start() {
    setError('')
    setState('connecting')
    try {
      const session = await createPreviewSession(agentId)
      const { url, token } = readSession(session)
      if (!url || !token) {
        throw new Error('The preview session did not include a room URL and token.')
      }

      const room = new Room({ adaptiveStream: true })
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio) return
        audioRef.current?.appendChild(track.attach())
      })
      room.on(RoomEvent.TrackUnsubscribed, (track) => track.detach().forEach((el) => el.remove()))
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setSpeaking(speakers.some((s) => s.identity !== room.localParticipant.identity))
      })
      room.on(RoomEvent.Disconnected, () => {
        roomRef.current = null
        setState('ended')
      })

      await room.connect(url, token)
      // Browsers only grant the microphone from a user gesture, which is the
      // click that got us here — asking any later would be blocked.
      await room.localParticipant.setMicrophoneEnabled(true)
      setState('live')
    } catch (e) {
      await teardown()
      setState('idle')
      setError(e?.message || 'Could not start the preview session.')
    }
  }

  async function toggleMute() {
    const room = roomRef.current
    if (!room) return
    const next = !muted
    await room.localParticipant.setMicrophoneEnabled(!next).catch(() => {})
    setMuted(next)
  }

  async function hangUp() {
    await teardown()
    setState('ended')
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Preview agent"
      subtitle={agentName || agentId}
      width="max-w-md"
      footer={
        state === 'live' ? (
          <>
            <GhostButton icon={muted ? MicOff : Mic} onClick={toggleMute}>
              {muted ? 'Unmute' : 'Mute'}
            </GhostButton>
            <PrimaryButton icon={PhoneOff} onClick={hangUp}>End preview</PrimaryButton>
          </>
        ) : (
          <>
            <GhostButton onClick={onClose}>Close</GhostButton>
            <PrimaryButton
              icon={state === 'connecting' ? Loader2 : Radio}
              busy={state === 'connecting'}
              onClick={start}
            >
              {state === 'ended' ? 'Start again' : 'Start preview'}
            </PrimaryButton>
          </>
        )
      }
    >
      <div className="grid gap-4">
        <Banner onDismiss={() => setError('')}>{error}</Banner>

        <div
          className="flex flex-col items-center justify-center rounded-2xl px-6 py-10"
          style={{ background: 'var(--ui-surface-2)', border: '1px solid var(--ui-border)' }}
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full transition-transform"
            style={{
              background: 'var(--ui-accent-soft)',
              color: 'var(--ui-accent-strong)',
              transform: speaking ? 'scale(1.08)' : 'scale(1)',
              boxShadow: speaking ? '0 0 0 8px var(--ui-accent-soft)' : 'none',
            }}
          >
            {state === 'connecting'
              ? <Loader2 size={24} className="animate-spin" />
              : <Radio size={24} />}
          </span>

          <p className="mt-4 text-[13.5px] font-medium" style={{ color: 'var(--ui-text)' }}>
            {state === 'live'
              ? (speaking ? 'Agent is speaking' : 'Listening, say something')
              : state === 'connecting' ? 'Connecting…'
                : state === 'ended' ? 'Preview ended'
                  : 'Ready to preview'}
          </p>
          <p className="mt-1 max-w-xs text-center text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
            {state === 'live'
              ? 'This is a browser-only conversation. No call is placed and no credits are used.'
              : 'Your microphone is used to talk to the agent. Nothing is dialled.'}
          </p>
        </div>

        {/* LiveKit attaches the agent's audio element here. */}
        <div ref={audioRef} className="hidden" />

        {state === 'live' && muted ? (
          <p className="text-center text-[11.5px]" style={{ color: '#b45309' }}>
            Your microphone is muted. The agent cannot hear you.
          </p>
        ) : null}
      </div>
    </Drawer>
  )
}
