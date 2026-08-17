import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import { FieldLabel } from './ResourceKit'

/**
 * A select with a search box — for lists too long to scan.
 *
 * A native <select> stops being usable somewhere around a few dozen options:
 * it opens as an unstyled OS list with no way to filter, so finding "+971" or
 * "Malayalam" means scrolling past a hundred rows. This is a combobox instead,
 * filtering on the label, the id and the hint at once, so a language is found
 * by name or by code.
 *
 * The panel renders through a portal. Callers sit inside containers that clip —
 * the contact drawer is `overflow-hidden` around a scrolling body, and a filter
 * bar can sit in an `overflow-x` scroller — so an absolutely-positioned panel
 * would be cut off. Fixed positioning against the trigger's viewport rect
 * avoids that, at the cost of re-measuring on scroll and resize.
 *
 * Options are `{ id, label, hint? }`. The hint is the secondary identifier
 * shown right-aligned and searchable — a dial code, a language code.
 */

const PANEL_MAX_HEIGHT = 300

function matches(option, query) {
  if (!query) return true
  const needle = query.trim().toLowerCase()
  return (
    String(option.label ?? '').toLowerCase().includes(needle)
    || String(option.hint ?? '').toLowerCase().includes(needle)
    || String(option.id ?? '').toLowerCase().includes(needle)
  )
}

function displayFor(option) {
  if (!option) return ''
  const hint = option.hint && option.hint !== option.label ? ` (${option.hint})` : ''
  return `${option.label}${hint}`
}

export function SearchSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  searchPlaceholder = 'Search',
  emptyText = 'Nothing matches',
  /** Label for a leading "no filter" row. Omit for a required choice. */
  allOption,
  disabled,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [rect, setRect] = useState(null)

  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef(null)
  const activeRef = useRef(null)

  // The "all" row is a real option so keyboard navigation and filtering treat
  // it like any other, rather than as a special case scattered through the list.
  const allRows = useMemo(
    () => (allOption ? [{ id: '', label: allOption, hint: '' }, ...options] : options),
    [allOption, options],
  )
  const selected = allRows.find((option) => option.id === value) ?? null
  const filtered = useMemo(() => allRows.filter((option) => matches(option, query)), [allRows, query])

  const measure = () => {
    const node = triggerRef.current
    if (node) setRect(node.getBoundingClientRect())
  }

  useLayoutEffect(() => {
    if (!open) return undefined
    measure()
    const onMove = () => measure()
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const id = requestAnimationFrame(() => searchRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (triggerRef.current?.contains(event.target)) return
      if (panelRef.current?.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, query])

  function openPanel() {
    setOpen(true)
    setQuery('')
    setActiveIndex(Math.max(0, allRows.findIndex((option) => option.id === value)))
  }

  function choose(option) {
    onChange(option.id)
    setOpen(false)
    setQuery('')
    triggerRef.current?.focus()
  }

  function onKeyDown(event) {
    if (!open) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault()
        openPanel()
      }
      return
    }
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (filtered[activeIndex]) choose(filtered[activeIndex])
    }
  }

  // Flip above the trigger when the panel would run off the bottom.
  const spaceBelow = rect ? window.innerHeight - rect.bottom - 12 : 0
  const flip = rect ? spaceBelow < Math.min(PANEL_MAX_HEIGHT, 220) && rect.top > spaceBelow : false
  const panelHeight = Math.min(PANEL_MAX_HEIGHT, Math.max(180, flip ? rect?.top - 16 : spaceBelow))

  return (
    <div>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={onKeyDown}
        className="ui-input flex w-full items-center justify-between gap-2 text-left"
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className="truncate"
          style={{ color: selected && selected.id !== '' ? 'var(--ui-text)' : 'var(--ui-text-3)' }}
        >
          {selected ? displayFor(selected) : placeholder}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--ui-text-3)', flexShrink: 0 }} />
      </button>

      {open && rect ? createPortal(
        <div
          ref={panelRef}
          className="ui-card"
          style={{
            position: 'fixed',
            zIndex: 80,
            left: Math.min(rect.left, window.innerWidth - Math.max(rect.width, 270) - 12),
            top: flip ? undefined : rect.bottom + 6,
            bottom: flip ? window.innerHeight - rect.top + 6 : undefined,
            width: Math.max(rect.width, 270),
            padding: 0,
            overflow: 'hidden',
            boxShadow: 'var(--ui-shadow-lg)',
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ borderBottom: '1px solid var(--ui-border)' }}
          >
            <Search size={13} style={{ color: 'var(--ui-text-3)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-[13px] outline-none"
              style={{ color: 'var(--ui-text)' }}
            />
          </div>

          <ul role="listbox" style={{ maxHeight: panelHeight, overflowY: 'auto', padding: 4 }}>
            {filtered.length ? filtered.map((option, index) => {
              const isSelected = option.id === value
              const isActive = index === activeIndex
              return (
                <li key={`${option.id}-${index}`}>
                  <button
                    ref={isActive ? activeRef : null}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px]"
                    style={{
                      background: isActive ? 'var(--ui-surface-2)' : 'transparent',
                      color: option.id === '' ? 'var(--ui-text-3)' : 'var(--ui-text)',
                    }}
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="ui-mono text-[12px]" style={{ color: 'var(--ui-text-3)' }}>
                        {option.hint}
                      </span>
                    ) : null}
                    {isSelected ? <Check size={13} style={{ color: 'var(--ui-accent)' }} /> : null}
                  </button>
                </li>
              )
            }) : (
              <li className="px-2.5 py-3 text-[12.5px]" style={{ color: 'var(--ui-text-3)' }}>
                {emptyText} “{query}”.
              </li>
            )}
          </ul>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}

export default SearchSelect
