import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  AlertCircle, CalendarDays, Check, ChevronLeft, ChevronRight, Loader2,
  Pause, Play, Plus, Search, X,
} from 'lucide-react'
import { stagger, fadeUp, scaleIn, SPRING, EASE, resolveMotion } from '../ui/motion'

/**
 * Shared building blocks for the resource pages.
 *
 * Styling lives in the `ui-*` token layer, and motion comes from the shared
 * vocabulary in components/ui/motion — so every list, form and dialog in the
 * app moves and reads the same way.
 */

export function PageShell({ children }) {
  const reduced = useReducedMotion()
  return (
    <div className="ui relative">
      <div className="relative mx-auto max-w-[1120px] px-4 py-6 sm:px-8 sm:py-9">
        <motion.div
          variants={resolveMotion(reduced, stagger(0, 0.05))}
          initial="hidden"
          animate="show"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}

/** `icon` is accepted for compatibility but intentionally not rendered — the
 *  page title carries the hierarchy instead of a coloured tile. */
export function PageHeader({ title, subtitle, action }) {
  const reduced = useReducedMotion()
  return (
    <motion.header
      variants={resolveMotion(reduced, fadeUp)}
      className="mb-7 flex flex-wrap items-end justify-between gap-4"
    >
      <div className="min-w-0">
        <h1 className="ui-title truncate">{title}</h1>
        {subtitle ? <p className="ui-sub mt-1">{subtitle}</p> : null}
      </div>
      {action}
    </motion.header>
  )
}

export function PrimaryButton({ icon: Icon = Plus, children, busy, ...rest }) {
  const reduced = useReducedMotion()
  return (
    <motion.button
      type="button"
      whileHover={reduced || rest.disabled ? undefined : { y: -1 }}
      whileTap={reduced ? undefined : { y: 1 }}
      transition={SPRING}
      {...rest}
      disabled={busy || rest.disabled}
      className="ui-btn-primary"
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {children}
    </motion.button>
  )
}

export function GhostButton({ icon: Icon, children, busy, ...rest }) {
  return (
    <button type="button" {...rest} disabled={busy || rest.disabled} className="ui-btn">
      {busy ? <Loader2 size={13} className="animate-spin" /> : Icon ? <Icon size={13} /> : null}
      {children}
    </button>
  )
}

export function DangerButton({ children, busy, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={busy || rest.disabled}
      className="ui-btn"
      style={{ color: '#e11d48', borderColor: 'rgba(244,63,94,0.30)' }}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : null}
      {children}
    </button>
  )
}

export function IconButton({ icon: Icon, label, size = 15, ...rest }) {
  return (
    <button type="button" title={label} aria-label={label} {...rest} className="ui-icon-btn">
      <Icon size={size} />
    </button>
  )
}

/**
 * Plays a voice sample, and stops it again. Holding the Audio in a ref means
 * repeated clicks toggle one clip instead of stacking overlapping playbacks.
 */
export function VoicePreviewButton({ voiceId, fetchAudio, onError, className = '' }) {
  const [state, setState] = useState('idle')
  const audioRef = useRef(null)

  const stop = useCallback(() => {
    audioRef.current?.pause()
    if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src)
    audioRef.current = null
    setState('idle')
  }, [])

  useEffect(() => stop, [stop, voiceId])

  async function toggle() {
    if (state === 'playing') { stop(); return }
    if (state === 'loading' || !voiceId) return
    setState('loading')
    try {
      const blob = await fetchAudio(voiceId)
      const audio = new Audio(URL.createObjectURL(blob))
      audio.onended = () => setState('idle')
      audioRef.current = audio
      await audio.play()
      setState('playing')
    } catch (e) {
      stop()
      onError?.(e.message || 'No sample available for this voice.')
    }
  }

  if (!voiceId) return null

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={state === 'loading'}
      className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold disabled:opacity-60 ${className}`}
      style={{ color: 'var(--ui-accent-strong)' }}
    >
      {state === 'loading'
        ? <Loader2 size={12} className="animate-spin" />
        : state === 'playing' ? <Pause size={12} /> : <Play size={12} />}
      {state === 'playing' ? 'Stop' : 'Preview'}
    </button>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative max-w-xs flex-1">
      <Search
        size={14}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--ui-text-3)' }}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ui-input ui-input-icon"
      />
    </div>
  )
}

export function FieldLabel({ children }) {
  return <label className="ui-label mb-2 block">{children}</label>
}

export function TextField({ label, value, onChange, ...rest }) {
  return (
    <div>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
        className="ui-input"
      />
    </div>
  )
}

export function TextAreaField({ label, value, onChange, rows = 4, ...rest }) {
  return (
    <div>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        {...rest}
        className="ui-input resize-y"
      />
    </div>
  )
}

/* ── dates ──────────────────────────────────────────────────────────────── */

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const pad = (n) => String(n).padStart(2, '0')

/** Local `yyyy-mm-dd`. Never via toISOString, which shifts to UTC and can
 *  hand back the previous day east of Greenwich. */
function toIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseIso(text) {
  const [year, month, day] = String(text || '').split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

/** The six-week grid a month is drawn on, Sunday first. */
function monthGrid(view) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    return day
  })
}

function formatDisplay(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`
}

/**
 * Date picker with its own calendar.
 *
 * The native control was replaced because it renders in the browser's chrome,
 * not the app's — a different look per browser, unstyleable in dark mode, and
 * on Firefox no picker at all. This one is a plain popover, so it matches
 * every other control here.
 *
 * The value stays ISO (`yyyy-mm-dd`) as before, while the backend's filters
 * expect `dd/mm/yyyy` — keep using `toApiDate` at the call site.
 * `min`/`max` are ISO strings too and compare lexicographically, which is
 * exactly what ISO ordering guarantees.
 */
export function DateField({ label, value, onChange, min, max, disabled, placeholder = 'Any date' }) {
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => parseIso(value) ?? new Date())
  const wrapRef = useRef(null)

  const selected = parseIso(value)
  const selectedIso = selected ? toIso(selected) : ''
  const todayIso = toIso(new Date())

  useEffect(() => {
    if (!open) return
    function onPointer(event) {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    function onKey(event) { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    if (disabled) return
    // Reopening always lands on the selected month rather than wherever the
    // user browsed to last time.
    if (!open) setView(parseIso(value) ?? new Date())
    setOpen((v) => !v)
  }

  function pick(day) {
    onChange(toIso(day))
    setOpen(false)
  }

  const outOfRange = (iso) => (min && iso < min) || (max && iso > max)

  return (
    <div ref={wrapRef} className="relative">
      {label ? <FieldLabel>{label}</FieldLabel> : null}

      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        className="ui-input flex items-center gap-2 text-left"
        style={{ color: selected ? 'var(--ui-text)' : 'var(--ui-text-3)' }}
      >
        <CalendarDays size={14} style={{ color: 'var(--ui-text-3)' }} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        {selected && !disabled ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear date"
            onClick={(e) => { e.stopPropagation(); onChange('') }}
            className="shrink-0 rounded p-0.5"
            style={{ color: 'var(--ui-text-3)' }}
          >
            <X size={12} />
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16, ease: EASE }}
            className="ui-card absolute left-0 z-50 mt-1.5 w-[268px] p-3"
            style={{ boxShadow: 'var(--ui-shadow-lg)' }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                className="ui-icon-btn"
                style={{ height: 28, width: 28 }}
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[12.5px] font-semibold" style={{ color: 'var(--ui-text)' }}>
                {MONTHS[view.getMonth()]} {view.getFullYear()}
              </span>
              <button
                type="button"
                className="ui-icon-btn"
                style={{ height: 28, width: 28 }}
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((day, i) => (
                <span
                  key={`${day}-${i}`}
                  className="flex h-7 items-center justify-center text-[10.5px] font-semibold"
                  style={{ color: 'var(--ui-text-3)' }}
                >
                  {day}
                </span>
              ))}

              {monthGrid(view).map((day) => {
                const iso = toIso(day)
                const isCurrentMonth = day.getMonth() === view.getMonth()
                const isSelected = iso === selectedIso
                const isToday = iso === todayIso
                const blocked = outOfRange(iso)

                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={blocked}
                    onClick={() => pick(day)}
                    className="flex h-8 items-center justify-center rounded-lg text-[12px] transition-colors disabled:opacity-30"
                    style={{
                      background: isSelected ? 'var(--ui-accent-strong)' : 'transparent',
                      color: isSelected
                        ? '#fff'
                        : isCurrentMonth ? 'var(--ui-text)' : 'var(--ui-text-3)',
                      fontWeight: isSelected || isToday ? 600 : 400,
                      border: isToday && !isSelected ? '1px solid var(--ui-accent-ring)' : '1px solid transparent',
                    }}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 pt-2" style={{ borderTop: '1px solid var(--ui-border)' }}>
              <button
                type="button"
                className="text-[11.5px] font-semibold"
                style={{ color: 'var(--ui-accent-strong)' }}
                disabled={outOfRange(todayIso)}
                onClick={() => pick(new Date())}
              >
                Today
              </button>
              <button
                type="button"
                className="text-[11.5px] font-semibold"
                style={{ color: 'var(--ui-text-3)' }}
                onClick={() => { onChange(''); setOpen(false) }}
              >
                Clear
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

/** `yyyy-mm-dd` (from a date input) → `dd/mm/yyyy` (what the API filters want). */
export function toApiDate(isoDate) {
  if (!isoDate) return undefined
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return undefined
  return `${day}/${month}/${year}`
}

export function SelectField({ label, value, onChange, options, placeholder = 'Select...', ...rest }) {
  return (
    <div>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
        className="ui-input"
        style={{ appearance: 'auto' }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * A select that can create a new option inline, for records the user is
 * permitted to add. Where they are not (voices, models are super-admin
 * provisioned), pass `emptyHint` so an empty list explains itself.
 */
export function SelectWithCreate({
  label, value, onChange, options, placeholder = 'Select...', disabled,
  canCreate, onCreate, createPlaceholder = 'Name', emptyHint, required,
  inline = false,
}) {
  const reduced = useReducedMotion()
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!draft.trim()) return
    setBusy(true); setError('')
    try {
      const created = await onCreate(draft.trim())
      if (created?.id) onChange(created.id)
      setCreating(false); setDraft('')
    } catch (e) {
      setError(e.message || 'Could not create it.')
    } finally {
      setBusy(false)
    }
  }

  // Inline mode keeps everything on one line so the control lines up with its
  // neighbours in a filter bar; the stacked layout is for forms.
  if (inline) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
        <AnimatePresence mode="wait" initial={false}>
          {creating ? (
            <motion.div
              key="create"
              initial={reduced ? false : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? undefined : { opacity: 0, x: -4 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <input
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); submit() }
                  if (e.key === 'Escape') setCreating(false)
                }}
                placeholder={createPlaceholder}
                className="ui-input"
                style={{ minWidth: 0, flex: '1 1 auto', maxWidth: 240 }}
              />
              <button
                type="button"
                className="ui-btn-primary shrink-0"
                onClick={submit}
                disabled={busy || !draft.trim()}
                style={{ padding: '0 12px' }}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button type="button" className="ui-icon-btn shrink-0" onClick={() => setCreating(false)}>
                <X size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="select"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <select
                value={value ?? ''}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className="ui-input"
                style={{ appearance: 'auto', minWidth: 0, flex: '1 1 auto', maxWidth: 240 }}
              >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              {canCreate && !disabled ? (
                <button
                  type="button"
                  onClick={() => { setCreating(true); setError('') }}
                  className="ui-icon-btn shrink-0"
                  title={createPlaceholder}
                >
                  <Plus size={15} />
                </button>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {error ? <p className="text-[11.5px]" style={{ color: '#e11d48' }}>{error}</p> : null}
      </div>
    )
  }

  return (
    <div>
      {label ? (
        <label className="ui-label mb-2 block">
          {label}{required ? <span style={{ color: 'var(--ui-accent)' }}> *</span> : null}
        </label>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        {creating ? (
          <motion.div
            key="create"
            initial={reduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="flex gap-2"
          >
            <input
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
              placeholder={createPlaceholder}
              className="ui-input"
            />
            <button
              type="button"
              className="ui-btn-primary shrink-0"
              onClick={submit}
              disabled={busy || !draft.trim()}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button type="button" className="ui-icon-btn shrink-0" onClick={() => setCreating(false)}>
              <X size={14} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="select"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            <select
              value={value ?? ''}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              className="ui-input"
              style={{ appearance: 'auto' }}
            >
              <option value="">{placeholder}</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-1.5 flex items-start justify-between gap-3">
        <p className="text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
          {!creating && !options.length && emptyHint ? emptyHint : ''}
        </p>
        {canCreate && !creating && !disabled ? (
          <button
            type="button"
            onClick={() => { setCreating(true); setError('') }}
            className="flex shrink-0 items-center gap-1 text-[11.5px] font-semibold"
            style={{ color: 'var(--ui-accent-strong)' }}
          >
            <Plus size={12} /> New
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-1 text-[11.5px]" style={{ color: '#e11d48' }}>{error}</p> : null}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: {},
    success: { color: '#0f9d6e', background: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.22)' },
    warning: { color: '#b45309', background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.24)' },
    danger: { color: '#e11d48', background: 'rgba(244,63,94,0.09)', borderColor: 'rgba(244,63,94,0.22)' },
    info: {
      color: 'var(--ui-accent-strong)',
      background: 'var(--ui-accent-soft)',
      borderColor: 'var(--ui-accent-ring)',
    },
  }
  return <span className="ui-chip" style={tones[tone] || tones.neutral}>{children}</span>
}

export function Banner({ tone = 'danger', children, onDismiss }) {
  const danger = tone === 'danger'
  return (
    <AnimatePresence>
      {children ? (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.24, ease: EASE }}
          className="overflow-hidden"
        >
          <div
            className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-[12.5px]"
            style={{
              background: danger ? 'rgba(244,63,94,0.07)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${danger ? 'rgba(244,63,94,0.20)' : 'rgba(16,185,129,0.22)'}`,
              color: danger ? '#e11d48' : '#0f9d6e',
            }}
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span className="flex-1">{children}</span>
            {onDismiss ? (
              <button type="button" onClick={onDismiss}><X size={13} /></button>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function SkeletonRows({ columns, count = 5 }) {
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-4"
          style={{ borderTop: i === 0 ? 'none' : '1px solid var(--ui-border)' }}
        >
          {columns.map((col, c) => (
            <div key={col.key} className={c === 0 ? 'flex-1' : 'hidden w-24 sm:block'}>
              <div className="ui-skeleton h-3" style={{ width: c === 0 ? '45%' : '100%' }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Card layout used below the `sm` breakpoint.
 *
 * A six-column table cannot be read on a 360px screen, and horizontal
 * scrolling hides data behind a gesture — so each row becomes a card: the
 * first column is the heading, columns with a header become labelled pairs,
 * and header-less columns (the actions) go to the footer.
 */
function MobileCards({ columns, rows, rowKey, onRowClick, reduced }) {
  const [first, ...rest] = columns
  const fields = rest.filter((col) => col.header)
  const actions = rest.filter((col) => !col.header)

  return (
    <motion.div
      variants={resolveMotion(reduced, stagger(0.02, 0.03))}
      initial="hidden"
      animate="show"
      className="sm:hidden"
    >
      {rows.map((row, index) => (
        <motion.div
          key={rowKey ? rowKey(row, index) : index}
          variants={resolveMotion(reduced, fadeUp)}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          className={`px-4 py-4 ${onRowClick ? 'cursor-pointer' : ''}`}
          style={{ borderTop: index === 0 ? 'none' : '1px solid var(--ui-border)' }}
        >
          <div className="text-[13.5px]" style={{ color: 'var(--ui-text)' }}>
            {first.render ? first.render(row) : (row[first.key] ?? '—')}
          </div>

          {fields.length ? (
            <dl className="mt-3 grid gap-2">
              {fields.map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-3">
                  <dt className="ui-label shrink-0 pt-0.5">{col.header}</dt>
                  <dd className="min-w-0 text-right text-[12.5px]" style={{ color: 'var(--ui-text)' }}>
                    {col.render ? col.render(row) : (row[col.key] ?? '—')}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {actions.length ? (
            <div
              className="mt-3 flex flex-wrap justify-end gap-1.5 pt-3"
              style={{ borderTop: '1px solid var(--ui-border)' }}
            >
              {actions.map((col) => (
                <div key={col.key}>{col.render ? col.render(row) : null}</div>
              ))}
            </div>
          ) : null}
        </motion.div>
      ))}
    </motion.div>
  )
}

/**
 * Table with built-in loading, empty and error states.
 * `columns`: [{ key, header, render?, className? }]
 *
 * Renders as a table from `sm` upward and as stacked cards below it.
 */
export function DataTable({ columns, rows, loading, empty = 'Nothing here yet.', rowKey, onRowClick }) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      variants={resolveMotion(reduced, fadeUp)}
      className="ui-card ui-card-raised overflow-hidden"
    >
      {!loading && rows.length ? (
        <MobileCards
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          onRowClick={onRowClick}
          reduced={reduced}
        />
      ) : null}

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr style={{ background: 'var(--ui-surface-2)', borderBottom: '1px solid var(--ui-border)' }}>
              {columns.map((col) => (
                <th key={col.key} className={`ui-label px-5 py-3 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          {!loading && rows.length ? (
            <motion.tbody
              variants={resolveMotion(reduced, stagger(0.02, 0.03))}
              initial="hidden"
              animate="show"
            >
              {rows.map((row, index) => (
                <motion.tr
                  key={rowKey ? rowKey(row, index) : index}
                  variants={resolveMotion(reduced, fadeUp)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`ui-row ${onRowClick ? 'cursor-pointer' : ''}`}
                  style={{ borderTop: index === 0 ? 'none' : '1px solid var(--ui-border)' }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-3.5 text-[13px] ${col.className || ''}`}
                      style={{ color: 'var(--ui-text)' }}
                    >
                      {col.render ? col.render(row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </motion.tbody>
          ) : null}
        </table>
      </div>

      {loading ? <SkeletonRows columns={columns} /> : null}

      {!loading && !rows.length ? (
        <div className="px-5 py-14 text-center sm:px-6 sm:py-16">
          <p className="text-[13.5px]" style={{ color: 'var(--ui-text-2)' }}>{empty}</p>
        </div>
      ) : null}
    </motion.div>
  )
}

function SkeletonCards({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="ui-card min-w-0 p-5">
          <div className="flex items-center gap-3">
            <div className="ui-skeleton h-10 w-10 rounded-xl" />
            <div className="flex-1">
              <div className="ui-skeleton h-3.5 w-32" />
              <div className="ui-skeleton mt-2 h-2.5 w-20" />
            </div>
          </div>
          <div className="ui-skeleton mt-5 h-2.5 w-full" />
          <div className="ui-skeleton mt-2 h-2.5 w-2/3" />
        </div>
      ))}
    </div>
  )
}

/**
 * Card layout for browsing records, where a table's columns say less than a
 * tile does — agents, prompts, categories.
 *
 * `card(row)` describes one tile: an avatar (`initial` letter or `icon`), a
 * title and subtitle, an optional `badge`, free-form `body`, labelled `meta`
 * pairs, and `actions` pinned to the footer. Loading and empty states match
 * DataTable so the two can be swapped per page.
 */
export function CardGrid({
  rows, card, loading, empty = 'Nothing here yet.', rowKey, onCardClick,
  columns = 3, emptyIcon: EmptyIcon, emptyAction,
}) {
  const reduced = useReducedMotion()
  /* `grid-cols-1` is not cosmetic. Without an explicit column the phone layout
     falls back to an implicit `auto` track, which is sized to the widest card's
     content — a long agent name never wraps, so the track (and every card in
     it) grew past the viewport and the page scrolled sideways. `grid-cols-1`
     is `minmax(0, 1fr)`, which cannot exceed the container. */
  const cols = columns === 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  if (loading) return <SkeletonCards count={columns === 2 ? 4 : 6} />

  if (!rows.length) {
    return (
      <motion.div
        variants={resolveMotion(reduced, fadeUp)}
        className="ui-card ui-card-raised px-5 py-14 text-center sm:px-6 sm:py-16"
      >
        {EmptyIcon ? (
          <span
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: 'var(--ui-accent-soft)', color: 'var(--ui-accent-strong)' }}
          >
            <EmptyIcon size={20} />
          </span>
        ) : null}
        <p className="text-[13.5px]" style={{ color: 'var(--ui-text-2)' }}>{empty}</p>
        {emptyAction ? <div className="mt-5 flex justify-center">{emptyAction}</div> : null}
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={resolveMotion(reduced, stagger(0.02, 0.04))}
      initial="hidden"
      animate="show"
      className={`grid gap-4 ${cols}`}
    >
      <AnimatePresence initial={false}>
        {rows.map((row, index) => {
          const c = card(row, index) || {}
          const Icon = c.icon
          const clickable = Boolean(onCardClick)

          return (
            <motion.div
              key={rowKey ? rowKey(row, index) : index}
              layout={reduced ? false : true}
              variants={resolveMotion(reduced, fadeUp)}
              exit={reduced ? undefined : { opacity: 0, scale: 0.97 }}
              whileHover={reduced || !clickable ? undefined : { y: -3 }}
              transition={SPRING}
              onClick={clickable ? () => onCardClick(row) : undefined}
              className={`ui-card ui-card-raised group flex min-w-0 flex-col p-5 ${clickable ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[14px] font-semibold"
                  style={{ background: 'var(--ui-accent-soft)', color: 'var(--ui-accent-strong)' }}
                >
                  {Icon ? <Icon size={17} /> : (c.initial || '?')}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold" style={{ color: 'var(--ui-text)' }}>
                    {c.title || 'Untitled'}
                  </p>
                  {c.subtitle ? (
                    <p className="ui-mono truncate text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
                      {c.subtitle}
                    </p>
                  ) : null}
                </div>

                {c.badge ? <div className="shrink-0">{c.badge}</div> : null}
              </div>

              {c.body ? (
                <div
                  className="mt-4 min-w-0 text-[12.5px] leading-relaxed"
                  // Prompt bodies carry long unbroken tokens like
                  // {{organization_location}}, which have no break opportunity
                  // and would otherwise push past the card edge.
                  style={{ color: 'var(--ui-text-2)', overflowWrap: 'anywhere' }}
                >
                  {c.body}
                </div>
              ) : null}

              {/*
                Each row is `min-w-0`: as a grid item it would otherwise take
                `min-width: auto` — its min-content width — and because the
                value is `truncate` (so `white-space: nowrap`), min-content is
                the *whole* string. The row then grows past the card instead of
                shrinking, and the value gets clipped at its own oversized box,
                which is how long text ended up spilling outside the card.

                A value marked `wrap` stacks under its label and clamps to two
                lines. A sentence has nowhere to go on one right-aligned line,
                while short values (a model, a voice) still read best inline.
              */}
              {c.meta?.length ? (
                <dl className="mt-4 grid gap-2">
                  {c.meta.map((item) => (item.wrap ? (
                    <div key={item.label} className="min-w-0">
                      <dt className="ui-label">{item.label}</dt>
                      <dd
                        className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed"
                        style={{ color: 'var(--ui-text)', overflowWrap: 'anywhere' }}
                        title={typeof item.value === 'string' ? item.value : undefined}
                      >
                        {item.value ?? '—'}
                      </dd>
                    </div>
                  ) : (
                    <div key={item.label} className="flex min-w-0 items-start justify-between gap-3">
                      <dt className="ui-label shrink-0 pt-0.5">{item.label}</dt>
                      <dd
                        className="min-w-0 truncate text-right text-[12.5px]"
                        style={{ color: 'var(--ui-text)' }}
                        title={typeof item.value === 'string' ? item.value : undefined}
                      >
                        {item.value ?? '—'}
                      </dd>
                    </div>
                  )))}
                </dl>
              ) : null}

              {c.actions ? (
                <div
                  className="mt-auto flex flex-wrap justify-end gap-1.5 pt-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {c.actions}
                </div>
              ) : null}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </motion.div>
  )
}

/** Offset pagination — the scheme every list endpoint on this backend uses. */
/**
 * Pager for a list, whether or not the route reports how many rows there are.
 *
 * `total` cannot be trusted on its own. Several routes here document an empty
 * response schema and omit a count, so toList() falls back to `items.length` —
 * which on a full page is exactly `limit`. The old `total <= limit` guard read
 * that as "one page", hid itself, and left every later page unreachable on any
 * route without a count.
 *
 * So a caller that cannot know the total passes `hasMore` instead — normally
 * `rows.length >= limit`, i.e. "this page came back full, so assume there is
 * another". The count and the page-of-pages indicator are then dropped rather
 * than guessed at, because "1 / 3" invented from a page length is a claim the
 * data does not support. Overshooting by one empty page is the cost, and it is
 * cheaper than a page of rows nobody can reach.
 */
export function Pagination({ total, limit, offset, onChange, hasMore }) {
  const reported = Number(total)
  const knownTotal = Number.isFinite(reported) && reported > limit ? reported : null
  const more = (knownTotal != null && offset + limit < knownTotal) || Boolean(hasMore)

  // Nothing to page through, and nothing paged past.
  if (knownTotal == null && !more && offset === 0) return null

  const page = Math.floor(offset / limit) + 1
  const pages = knownTotal != null ? Math.ceil(knownTotal / limit) : null

  return (
    <div className="mt-4 flex items-center justify-between text-[12.5px]" style={{ color: 'var(--ui-text-3)' }}>
      <span className="ui-mono">
        {knownTotal != null
          ? `${offset + 1}–${Math.min(offset + limit, knownTotal)} of ${knownTotal}`
          : `${offset + 1}–${offset + limit}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="ui-btn"
          disabled={offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
        >
          Previous
        </button>
        <span className="ui-mono px-1">{pages != null ? `${page} / ${pages}` : `Page ${page}`}</span>
        <button
          type="button"
          className="ui-btn"
          disabled={!more}
          onClick={() => onChange(offset + limit)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

/**
 * Modal shell for drawers and confirm dialogs.
 *
 * Rendered through a portal rather than in place. The page background rule
 * `.ui > * { position: relative }` in index.css matches Tailwind's `.fixed` on
 * specificity and wins on source order, so a dialog that happens to be a direct
 * child of a `.ui` root lost its fixed positioning: it dropped into normal flow
 * below the page content and took its backdrop with it, dimming only the strip
 * it occupied. Which pages broke depended purely on how deeply the dialog was
 * nested. Mounting on document.body puts it out of reach of page-level CSS.
 */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-lg' }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // While a modal is up, the page behind it must not scroll.
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
            style={{ background: 'rgba(10,10,16,0.45)', backdropFilter: 'blur(3px)' }}
          />
          <motion.div
            variants={resolveMotion(reduced, scaleIn)}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
            className={`ui-card relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden ${width}`}
            style={{ boxShadow: 'var(--ui-shadow-lg)' }}
          >
            <div
              className="flex shrink-0 items-start justify-between gap-4 px-5 py-4"
              style={{ borderBottom: '1px solid var(--ui-border)' }}
            >
              <div className="min-w-0">
                <h3 className="ui-h2 truncate">{title}</h3>
                {subtitle ? (
                  <p className="ui-mono mt-0.5 truncate text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
                    {subtitle}
                  </p>
                ) : null}
              </div>
              <button type="button" onClick={onClose} className="ui-icon-btn shrink-0">
                <X size={14} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

            {footer ? (
              <div
                className="flex shrink-0 justify-end gap-2 px-5 py-4"
                style={{ borderTop: '1px solid var(--ui-border)', background: 'var(--ui-surface-2)' }}
              >
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', busy }) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-md"
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <DangerButton busy={busy} onClick={onConfirm}>{confirmLabel}</DangerButton>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(244,63,94,0.10)', color: '#e11d48' }}
        >
          <AlertCircle size={18} />
        </span>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ui-text-2)' }}>{message}</p>
      </div>
    </Drawer>
  )
}
