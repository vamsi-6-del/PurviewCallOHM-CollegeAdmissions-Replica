import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Loader2, Pause, Play, RotateCcw, RotateCw, Volume2 } from 'lucide-react'

/**
 * Playback for one call recording.
 *
 * The audio is fetched rather than pointed at: every recording route needs the
 * Authorization header, so a bare <audio src="/call-history/recording/…"> gets a
 * 401 — the bytes come down as a blob and play from an object URL. That fetch is
 * deferred until the first press, so opening a call detail does not pull a few
 * hundred KB of audio nobody asked to hear.
 *
 * The native <audio controls> widget is kept out of the layout because its
 * chrome is the browser's, not this app's, and it looks foreign in a drawer. The
 * element is still what plays; only the controls are ours.
 */

function clockTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

const SPEEDS = [1, 1.5, 2]

export default function AudioPlayer({ fetchAudio, fileName = 'recording.mp3', onError, hint }) {
  const audioRef = useRef(null)
  const urlRef = useRef('')
  const wantPlayRef = useRef(false)

  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)

  // Object URLs outlive the component unless revoked by hand.
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = ''
  }, [])

  const load = useCallback(async ({ thenPlay = true } = {}) => {
    if (loading) return
    setLoading(true)
    wantPlayRef.current = thenPlay
    try {
      const blob = await fetchAudio()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = URL.createObjectURL(blob)
      setUrl(urlRef.current)
    } catch (e) {
      wantPlayRef.current = false
      onError?.(e.message || 'Could not load the audio for this call.')
    } finally {
      setLoading(false)
    }
  }, [fetchAudio, loading, onError])

  function toggle() {
    if (!url) { load({ thenPlay: true }); return }
    const el = audioRef.current
    if (!el) return
    if (el.paused) el.play().catch((e) => onError?.(e.message)); else el.pause()
  }

  function seekBy(delta) {
    const el = audioRef.current
    if (!el || !Number.isFinite(el.duration)) return
    el.currentTime = Math.min(Math.max(0, el.currentTime + delta), el.duration)
  }

  function seekTo(value) {
    const el = audioRef.current
    if (!el) return
    el.currentTime = Number(value)
    setCurrent(Number(value))
  }

  function cycleSpeed() {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  function download() {
    if (!url) { load({ thenPlay: false }); return }
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--ui-surface-2)', border: '1px solid var(--ui-border)' }}
    >
      {url ? (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onLoadedMetadata={(e) => {
            setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)
            e.currentTarget.playbackRate = speed
            if (wantPlayRef.current) {
              wantPlayRef.current = false
              e.currentTarget.play().catch(() => {})
            }
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setCurrent(0) }}
          onError={() => onError?.('The recording could not be played.')}
          className="hidden"
        />
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          aria-label={playing ? 'Pause recording' : 'Play recording'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition"
          style={{
            background: 'var(--ui-accent)',
            color: '#fff',
            boxShadow: 'var(--ui-shadow-accent)',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading
            ? <Loader2 size={18} className="animate-spin" />
            : playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            disabled={!url || !duration}
            onChange={(e) => seekTo(e.target.value)}
            aria-label="Seek"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, var(--ui-accent) ${progress}%, var(--ui-border-strong) ${progress}%)`,
              accentColor: 'var(--ui-accent)',
            }}
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className="ui-mono text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
              {clockTime(current)}
            </span>
            <span className="ui-mono text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
              {url ? clockTime(duration) : (hint || 'Press play to load')}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => seekBy(-10)}
            disabled={!url}
            title="Back 10 seconds"
            aria-label="Back 10 seconds"
            className="ui-icon-btn"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={() => seekBy(10)}
            disabled={!url}
            title="Forward 10 seconds"
            aria-label="Forward 10 seconds"
            className="ui-icon-btn"
          >
            <RotateCw size={14} />
          </button>
          <button
            type="button"
            onClick={cycleSpeed}
            title="Playback speed"
            aria-label={`Playback speed ${speed}x`}
            className="ui-mono ui-icon-btn text-[11px] font-semibold"
            style={{ width: 34 }}
          >
            {speed}x
          </button>
          <button
            type="button"
            onClick={download}
            title="Download recording"
            aria-label="Download recording"
            className="ui-icon-btn"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {!url && !loading ? (
        <p className="mt-3 flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
          <Volume2 size={12} />
          Audio is fetched when you press play.
        </p>
      ) : null}
    </div>
  )
}
