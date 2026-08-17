import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE } from '../ui/motion'

/**
 * Chart primitives, drawn as inline SVG.
 *
 * Three forms, each picked for the job its data does:
 *   AreaChart   — one measure over time (shape of the trend matters)
 *   DonutChart  — parts of a whole (share of a fixed set of outcomes)
 *   ColumnChart — many small ordered buckets (24 hours side by side)
 *
 * Colours come from the --viz-* tokens in index.css, which were validated as a
 * set (see the comment there). Series colour is bound to the *entity*, so the
 * caller passes an explicit slot rather than an array index.
 *
 * Every form carries a hover layer: the hit target is always wider than the
 * mark it selects, and the tooltip is the only place a per-point number is
 * spelled out, which keeps the plot itself free of label clutter.
 */

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif'

/** A rect with only its top corners rounded, so the fill stays anchored to the baseline. */
function topRoundedRect(x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height))
  return `M${x},${y + height}V${y + r}a${r},${r} 0 0 1 ${r},${-r}h${width - 2 * r}a${r},${r} 0 0 1 ${r},${r}V${y + height}Z`
}

/** Tooltip anchored in the chart's own padding box. Positioned by percentage so it survives resize. */
function Tooltip({ xPct, yPct, title, children }) {
  return (
    <div className="viz-tip" style={{ left: `${xPct}%`, top: `${yPct}%`, marginTop: -10 }}>
      <div style={{ color: 'var(--ui-text-3)', fontSize: 10.5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {title}
      </div>
      <div className="ui-mono" style={{ color: 'var(--ui-text)', fontWeight: 600, fontSize: 13 }}>{children}</div>
    </div>
  )
}

function EmptyPlot({ height, children }) {
  return (
    <div
      className="grid place-items-center text-[12.5px]"
      style={{ height, color: 'var(--ui-text-3)' }}
    >
      {children}
    </div>
  )
}

/* ── area ───────────────────────────────────────────────────────────────── */

/**
 * Volume over time. A single series, so no legend — the panel title names it.
 * Ticks are thinned to first/middle/last rather than one per day, which is what
 * keeps a 30-day range readable at this width.
 */
export function AreaChart({ data, height = 208, slot = 1, empty = 'No data.', valueLabel = 'calls' }) {
  const reduced = useReducedMotion()
  const [active, setActive] = useState(null)
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const W = 720
  const H = height
  const PAD = { top: 14, right: 12, bottom: 26, left: 34 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const geometry = useMemo(() => {
    if (!rows.length) return null
    const values = rows.map((r) => Number(r.count) || 0)
    const peak = Math.max(...values)
    // A flat all-zero series still needs a scale, and a peak of 0 would divide by zero.
    const top = peak > 0 ? peak : 1

    /*
     * Two kinds of x axis, and using the wrong one misstates the data.
     *
     * Evenly spaced by index is right for buckets that are themselves evenly
     * spaced — one per day, one per hour. It is wrong for events at arbitrary
     * times: spacing 20 timestamps evenly puts a 90-minute gap and a 7-minute
     * gap the same distance apart while the axis is labelled with clock times,
     * so the chart reads as a trend it is not. When every row carries a numeric
     * `x` (a timestamp), positions are scaled to it and the gaps are real.
     */
    const stamps = rows.map((row) => Number(row.x))
    const timed = stamps.every(Number.isFinite) && rows.length > 1
      && Math.max(...stamps) > Math.min(...stamps)
    const minX = timed ? Math.min(...stamps) : 0
    const spanX = timed ? Math.max(...stamps) - minX : 1
    const stepX = rows.length > 1 ? plotW / (rows.length - 1) : 0

    const points = values.map((value, i) => ({
      x: PAD.left + (timed
        ? ((stamps[i] - minX) / spanX) * plotW
        : (rows.length > 1 ? i * stepX : plotW / 2)),
      y: PAD.top + plotH - (value / top) * plotH,
      value,
      label: rows[i].label,
      tip: rows[i].tip ?? rows[i].label,
    }))

    // Hover bands run to the midpoint between neighbours, so an unevenly
    // spaced series still hands every point a target proportional to its gap.
    points.forEach((point, i) => {
      const previous = points[i - 1]
      const next = points[i + 1]
      point.from = previous ? (previous.x + point.x) / 2 : PAD.left
      point.to = next ? (point.x + next.x) / 2 : PAD.left + plotW
    })

    const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('')
    const base = PAD.top + plotH
    const area = `${line}L${points[points.length - 1].x.toFixed(2)},${base}L${points[0].x.toFixed(2)},${base}Z`
    return { points, line, area, top, base }
  }, [rows, plotH, plotW, PAD.left, PAD.top])

  if (!geometry) return <EmptyPlot height={height}>{empty}</EmptyPlot>

  const { points, line, area, top, base } = geometry
  const color = `var(--viz-series-${slot})`
  const gradientId = `viz-area-${slot}`
  // Credit amounts run to fractions of a unit, so rounding ticks to integers
  // would collapse a 0–1.1 axis to "0, 1, 1". Scale the precision to the range.
  const decimals = top >= 10 ? 0 : (top >= 1 ? 2 : 3)
  const formatTick = (n) => (decimals ? Number(n.toFixed(decimals)).toString() : Math.round(n).toLocaleString())
  const ticks = [0, 0.5, 1].map((t) => top * t)

  /*
   * Thin the x labels by distance, not by index.
   *
   * Every-nth-point works only while spacing is uniform; on a real time axis
   * clustered events would print their labels on top of each other. Keeping a
   * minimum gap in view units, and always keeping the last point, gives a
   * readable axis whichever way the points fall.
   */
  const MIN_LABEL_GAP = 78
  const labelled = new Set()
  let lastLabelX = -Infinity
  points.forEach((point, i) => {
    if (point.x - lastLabelX >= MIN_LABEL_GAP) {
      labelled.add(i)
      lastLabelX = point.x
    }
  })
  const lastIndex = points.length - 1
  if (points[lastIndex].x - lastLabelX >= MIN_LABEL_GAP / 2) labelled.add(lastIndex)

  return (
    <div className="relative" style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} role="img" style={{ display: 'block', overflow: 'visible', fontFamily: FONT }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Recessive chrome: hairline gridlines, values on the axis, no chart junk. */}
        {ticks.map((value, i) => {
          const y = base - (i / (ticks.length - 1)) * plotH
          return (
            <g key={i}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--viz-grid)" strokeWidth="1" />
              <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" fontSize="10.5" style={{ fill: 'var(--ui-text-3)', fontVariantNumeric: 'tabular-nums' }}>
                {formatTick(value)}
              </text>
            </g>
          )
        })}

        <motion.path
          d={area}
          fill={`url(#${gradientId})`}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
        />

        {points.map((p, i) => (
          labelled.has(i) ? (
            <text
              key={`x${i}`}
              x={p.x}
              y={H - 8}
              // The end labels are anchored inward so they cannot overhang the
              // plot once a point sits exactly on the left or right edge.
              textAnchor={i === 0 ? 'start' : (i === points.length - 1 ? 'end' : 'middle')}
              fontSize="10.5"
              style={{ fill: 'var(--ui-text-3)' }}
            >
              {p.label}
            </text>
          ) : null
        ))}

        {/* Crosshair + marker for the hovered point. The 2px surface ring keeps
            the marker legible where it overlaps the line. */}
        {active != null && points[active] ? (
          <g>
            <line
              x1={points[active].x} x2={points[active].x} y1={PAD.top} y2={base}
              stroke="var(--viz-axis)" strokeWidth="1" strokeDasharray="3 3"
            />
            <circle cx={points[active].x} cy={points[active].y} r="5" fill={color} stroke="var(--ui-surface)" strokeWidth="2" />
          </g>
        ) : null}

        {/* Hit targets: a full-height band per point, far easier to land on than
            the line. Bounds come from the midpoints between neighbours so the
            bands tile the plot exactly, however unevenly the points fall. */}
        {points.map((p, i) => (
          <rect
            key={`hit${i}`}
            className="viz-hit"
            x={p.from}
            y={PAD.top}
            width={Math.max(1, p.to - p.from)}
            height={plotH}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          />
        ))}
      </svg>

      {active != null && points[active] ? (
        <Tooltip
          xPct={(points[active].x / W) * 100}
          yPct={(points[active].y / H) * 100}
          title={points[active].tip}
        >
          {points[active].value} {valueLabel}
        </Tooltip>
      ) : null}
    </div>
  )
}

/* ── donut ──────────────────────────────────────────────────────────────── */

/**
 * Share of a fixed set of outcomes, with the headline figure in the hole.
 *
 * Segments are separated by a 2px gap in the surface colour so neighbouring
 * fills never touch. A zero-count outcome draws no arc but keeps its legend
 * row, so the set of possible outcomes stays visible and the colour bound to
 * each one never moves.
 */
export function DonutChart({ data, height = 208, centerLabel = 'total', empty = 'No data.' }) {
  const reduced = useReducedMotion()
  const [active, setActive] = useState(null)
  const rows = Array.isArray(data) ? data : []
  const total = rows.reduce((sum, r) => sum + (Number(r.count) || 0), 0)

  if (!rows.length) return <EmptyPlot height={height}>{empty}</EmptyPlot>

  const SIZE = 168
  const stroke = 22
  const radius = (SIZE - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const GAP = 2

  // Each arc starts where the previous one ended, so the running offset is
  // accumulated rather than mutated across the render.
  const arcs = rows.reduce((acc, row) => {
    const value = Number(row.count) || 0
    const fraction = total > 0 ? value / total : 0
    const previous = acc[acc.length - 1]
    const offset = previous ? previous.offset + previous.length : 0
    acc.push({ ...row, value, fraction, length: fraction * circumference, offset })
    return acc
  }, [])

  const shown = active != null ? arcs[active] : null

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={radius}
            fill="none" stroke="var(--viz-track)" strokeWidth={stroke}
          />
          {arcs.map((arc, i) => {
            if (arc.length <= 0) return null
            const visible = Math.max(0, arc.length - GAP)
            return (
              <motion.circle
                key={i}
                cx={SIZE / 2} cy={SIZE / 2} r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={active === i ? stroke + 3 : stroke}
                strokeDasharray={`${visible} ${circumference - visible}`}
                strokeDashoffset={-arc.offset}
                strokeLinecap="butt"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.05 }}
                style={{ transition: 'stroke-width 140ms ease', cursor: 'pointer' }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
            )
          })}
        </svg>

        {/* Hero figure — the hole is the one place a big number belongs. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div
              className="ui-mono font-semibold"
              style={{ color: 'var(--ui-text)', fontSize: 27, letterSpacing: '-0.03em', lineHeight: 1.05 }}
            >
              {shown ? `${Math.round(shown.fraction * 100)}%` : total}
            </div>
            <div className="mt-0.5 text-[10.5px]" style={{ color: 'var(--ui-text-3)' }}>
              {shown ? shown.label : centerLabel}
            </div>
          </div>
        </div>
      </div>

      {/* The legend is also the relief for the sub-3:1 hues: every value is
          spelled out here, so nothing depends on reading the colour alone. */}
      <ul className="grid w-full gap-1.5">
        {arcs.map((arc, i) => (
          <li
            key={i}
            className="flex items-center gap-2.5 rounded-lg px-1.5 py-1"
            style={{ background: active === i ? 'var(--ui-surface-2)' : 'transparent', cursor: 'pointer' }}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: arc.color, opacity: arc.value > 0 ? 1 : 0.35 }}
            />
            <span className="flex-1 truncate text-[12px]" style={{ color: 'var(--ui-text-2)' }}>{arc.label}</span>
            <span className="ui-mono text-[12px] font-semibold" style={{ color: 'var(--ui-text)', fontVariantNumeric: 'tabular-nums' }}>
              {arc.value}
            </span>
            <span className="ui-mono w-9 text-right text-[11px]" style={{ color: 'var(--ui-text-3)', fontVariantNumeric: 'tabular-nums' }}>
              {total > 0 ? `${Math.round(arc.fraction * 100)}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── columns ────────────────────────────────────────────────────────────── */

/**
 * Many small ordered buckets — the 24 hours of a day.
 *
 * Each column keeps its slot whether or not anything happened in that hour, so
 * the shape of the day is readable and a quiet hour is visibly quiet rather
 * than missing. Only the peak is labelled directly; the rest are on hover.
 */
export function ColumnChart({ data, height = 200, slot = 1, empty = 'No data.', valueLabel = 'calls' }) {
  const reduced = useReducedMotion()
  const [active, setActive] = useState(null)
  const rows = Array.isArray(data) ? data : []

  if (!rows.length) return <EmptyPlot height={height}>{empty}</EmptyPlot>

  const W = 720
  const H = height
  const PAD = { top: 20, right: 6, bottom: 24, left: 6 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const base = PAD.top + plotH

  const values = rows.map((r) => Number(r.count) || 0)
  const peak = Math.max(...values)
  const top = peak > 0 ? peak : 1
  const peakIndex = values.indexOf(peak)

  const GAP = 2 // surface gap so neighbouring fills never touch
  const bandW = plotW / rows.length
  const barW = Math.max(3, bandW - GAP)
  const color = `var(--viz-series-${slot})`
  const labelEvery = Math.max(1, Math.ceil(rows.length / 8))

  return (
    <div className="relative" style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} role="img" style={{ display: 'block', overflow: 'visible', fontFamily: FONT }}>
        <line x1={PAD.left} x2={W - PAD.right} y1={base} y2={base} stroke="var(--viz-axis)" strokeWidth="1" />

        {rows.map((row, i) => {
          const value = values[i]
          const x = PAD.left + i * bandW + GAP / 2
          const barH = value > 0 ? Math.max(3, (value / top) * plotH) : 0
          const y = base - barH
          const isActive = active === i

          return (
            <g key={i}>
              {/* An empty hour still gets a faint stub, so the axis reads as 24 slots. */}
              {value > 0 ? (
                <motion.path
                  className={`viz-mark${isActive ? ' is-active' : ''}`}
                  d={topRoundedRect(x, y, barW, barH, 4)}
                  fill={color}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: Math.min(i * 0.015, 0.3) }}
                />
              ) : (
                <rect x={x} y={base - 2} width={barW} height={2} rx={1} fill="var(--viz-track)" />
              )}

              {/* Direct-label the peak only — a number on every column is noise. */}
              {i === peakIndex && value > 0 && !isActive ? (
                <text
                  x={x + barW / 2} y={y - 7} textAnchor="middle" fontSize="11"
                  style={{ fill: 'var(--ui-text-2)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                >
                  {value}
                </text>
              ) : null}

              {i % labelEvery === 0 ? (
                <text x={x + barW / 2} y={H - 7} textAnchor="middle" fontSize="10.5" style={{ fill: 'var(--ui-text-3)' }}>
                  {row.label}
                </text>
              ) : null}

              {/* Full-height hit target — a 3px-tall bar is impossible to hover otherwise. */}
              <rect
                className="viz-hit"
                x={PAD.left + i * bandW}
                y={PAD.top}
                width={bandW}
                height={plotH}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
            </g>
          )
        })}
      </svg>

      {active != null && rows[active] ? (
        <Tooltip
          xPct={((PAD.left + active * bandW + bandW / 2) / W) * 100}
          yPct={((base - (values[active] / top) * plotH) / H) * 100}
          title={rows[active].tip ?? rows[active].label}
        >
          {values[active]} {valueLabel}
        </Tooltip>
      ) : null}
    </div>
  )
}
