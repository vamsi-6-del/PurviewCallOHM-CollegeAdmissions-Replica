import { useCallback, useEffect, useState } from 'react'
import { BarChart3, PhoneCall, Radio, Timer, TrendingUp, Users } from 'lucide-react'
import {
  getAnalyticsSummary, getCallVolume, getCallStatusBreakdown,
  getAgentStats, getHourlyDistribution,
} from '../../api/resources/calls'
import { describeError } from '../../api/resources/http'
import { motion, useReducedMotion } from 'framer-motion'
import {
  PageShell, PageHeader, DataTable, Banner, Badge, SelectField, Pagination,
} from '../../components/resource/ResourceKit'
import { AreaChart, DonutChart, ColumnChart } from '../../components/resource/Charts'
import { fadeUp, stagger, SPRING, resolveMotion } from '../../components/ui/motion'
import { useClientPagination } from '../../hooks/useClientPagination'

const PERIODS = [
  { id: '24h', label: 'Last 24 hours' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
]

function StatCard({ icon: Icon, label, value, hint, index = 0 }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      variants={resolveMotion(reduced, fadeUp)}
      whileHover={reduced ? undefined : { y: -2 }}
      transition={SPRING}
      custom={index}
      className="ui-card p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="ui-label">{label}</p>
        <Icon size={13} style={{ color: 'var(--ui-text-3)' }} />
      </div>
      <p
        className="ui-mono mt-2 text-[26px] font-semibold"
        style={{ color: 'var(--ui-text)', letterSpacing: '-0.03em', lineHeight: 1.1 }}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>{hint}</p> : null}
    </motion.div>
  )
}

/** Card wrapper for a plot: title, an optional right-aligned hint, the chart. */
function Panel({ title, hint, children }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      variants={resolveMotion(reduced, fadeUp)}
      initial="hidden"
      animate="show"
      className="ui-card p-5"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="ui-h2">{title}</p>
        {hint ? <span className="text-[11px]" style={{ color: 'var(--ui-text-3)' }}>{hint}</span> : null}
      </div>
      {children}
    </motion.div>
  )
}

/**
 * Outcome → colour, bound to the outcome itself so a quiet day cannot repaint
 * the chart. Only three hues are safe in a donut, where a zero-count slice
 * drops out and changes which segments end up adjacent (see index.css), so
 * everything past the three headline outcomes — live calls, unrecognised
 * statuses — folds into one neutral bucket instead of taking a fourth hue.
 * Live calls have their own stat card above, so nothing is lost by the fold.
 */
const OUTCOME_SLOTS = [
  ['succeeded', 'Succeeded', 'var(--viz-series-1)'],
  ['error', 'Error', 'var(--viz-series-2)'],
  ['disconnected', 'Disconnected', 'var(--viz-series-3)'],
]

function toOutcomes(rows) {
  if (!rows.length) return []
  const slots = OUTCOME_SLOTS.map(([key, label, color]) => ({ key, label, color, count: 0 }))
  let folded = 0

  for (const row of rows) {
    const key = String(row.label ?? '').trim().toLowerCase()
    const slot = slots.find((s) => s.key === key)
    if (slot) slot.count += Number(row.count) || 0
    else folded += Number(row.count) || 0
  }

  // Show the fold when it holds something — or when nothing else does, so the
  // ring is never blank while the API is reporting rows.
  const showFold = folded > 0 || !slots.some((s) => s.count > 0)
  return showFold
    ? [...slots, { label: 'Other', color: 'var(--viz-series-none)', count: folded }]
    : slots
}

/** "14:00" reads as "14" on a 24-column axis; the tooltip keeps the full label. */
function toHours(rows) {
  return rows.map((row) => {
    const label = String(row.label ?? '')
    return { count: row.count, tip: label, label: label.replace(/:00$/, '') }
  })
}

/** First of `keys` present on `entry`, or undefined. */
function pick(entry, keys) {
  for (const key of keys) {
    if (entry?.[key] != null) return { key, value: entry[key] }
  }
  return undefined
}

/**
 * Normalise the various shapes the analytics endpoints return into rows.
 *
 * The analytics routes document an empty response schema, so neither the
 * envelope key nor the per-entry field names can be known ahead of time —
 * /analytics/call-volume may wrap its buckets under `data`, `volume` or
 * `call_volume`. Falling back to "the first array-valued property", and then to
 * the first string/number field on an entry, keeps an unfamiliar shape from
 * silently reading as "no calls in this period" (same reasoning as toList()).
 */
function toRows(payload, labelKeys, valueKeys) {
  const source = Array.isArray(payload)
    ? payload
    : (payload?.data ?? payload?.items ?? payload?.buckets
      ?? (payload && typeof payload === 'object' ? Object.values(payload).find(Array.isArray) : null))

  if (Array.isArray(source)) {
    return source.map((entry) => {
      if (entry == null || typeof entry !== 'object') {
        return { label: '—', count: Number(entry) || 0 }
      }
      const label = pick(entry, labelKeys)
        ?? pick(entry, Object.keys(entry).filter((k) => typeof entry[k] === 'string'))
      const count = pick(entry, valueKeys)
        ?? pick(entry, Object.keys(entry).filter((k) => k !== label?.key && typeof entry[k] === 'number'))
      return { label: label?.value ?? '—', count: count?.value ?? 0 }
    })
  }

  // Some endpoints return a plain { key: count } map.
  if (payload && typeof payload === 'object') {
    return Object.entries(payload)
      .filter(([, value]) => typeof value === 'number')
      .map(([label, count]) => ({ label, count }))
  }
  return []
}

/**
 * Field names on /analytics/agent-stats.
 *
 * Another route with an empty response schema, so the names are probed rather
 * than read off a contract. The route documents `success_rate` alongside the
 * counts; it carries no duration of any kind, which is why the table reports a
 * rate per agent and leaves average duration to the account-wide KPI tile.
 */
const AGENT_FIELDS = {
  calls: ['total_calls', 'calls', 'call_count', 'total', 'count'],
  completed: ['completed', 'completed_calls', 'succeeded', 'succeeded_calls',
    'successful_calls', 'success_count', 'success'],
  successRate: ['success_rate', 'successRate', 'success_percentage', 'success_pct'],
}

function numberFrom(row, keys) {
  const found = pick(row, keys)
  if (!found) return null
  const value = Number(found.value)
  return Number.isFinite(value) ? value : null
}

/**
 * Percentage of this agent's calls that succeeded.
 *
 * The reported rate wins; falling back to completed/calls keeps the column
 * populated if the route ever drops the field. A rate given as a 0–1 fraction
 * is scaled up — the documented shape is 0–100 (`81.2`), but both appear.
 */
function agentSuccessRate(row) {
  const direct = numberFrom(row, AGENT_FIELDS.successRate)
  if (direct != null) return direct > 0 && direct <= 1 ? direct * 100 : direct

  const completed = numberFrom(row, AGENT_FIELDS.completed)
  const calls = numberFrom(row, AGENT_FIELDS.calls)
  if (completed == null || !calls) return null
  return (completed / calls) * 100
}

/** One decimal only when it says something: "56%", not "56.0%". */
function formatRate(value) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`
}

/** "1m 24s" once past a minute; plain seconds below that. */
function formatSeconds(value) {
  if (value == null) return '—'
  const seconds = Math.round(value)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

/**
 * Name the fields that could not be resolved, once per load, in dev only.
 *
 * The same trick that settled the credits columns: print the keys the row
 * actually has, and say whether a candidate key is missing entirely or present
 * but empty — the first is fixable here, the second only server-side.
 */
function warnAgentStats(row) {
  if (!import.meta.env.DEV || !row) return
  if (agentSuccessRate(row) != null) return
  const empties = [...AGENT_FIELDS.successRate, ...AGENT_FIELDS.completed]
    .filter((key) => key in row && (row[key] === null || row[key] === ''))
  console.warn(
    '[analytics/agent-stats] success rate unresolved — '
    + (empties.length
      ? `key present but empty (${empties.join(', ')}); the backend is not reporting it`
      : 'no candidate key on the row; it needs the real field name')
    + `\n  row keys: ${Object.keys(row).join(', ')}`,
  )
}

export default function DashboardPage() {
  const reduced = useReducedMotion()
  const [period, setPeriod] = useState('7d')
  const [summary, setSummary] = useState(null)
  const [volume, setVolume] = useState([])
  const [statuses, setStatuses] = useState([])
  const [agentStats, setAgentStats] = useState([])
  const [hourly, setHourly] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // /analytics/agent-stats takes no limit or offset, so the per-agent table is
  // paged over the rows already returned.
  const { offset, setOffset, total, pageItems, pageSize } = useClientPagination(agentStats, 10)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const panels = [
        ['the summary', getAnalyticsSummary({ period })],
        ['call volume', getCallVolume({ period })],
        ['outcomes', getCallStatusBreakdown({ period })],
        ['agent activity', getAgentStats({ period })],
        ['calls by hour', getHourlyDistribution({})],
      ]
      const [s, v, st, a, h] = await Promise.allSettled(panels.map(([, p]) => p))

      // Every panel reports its own failure: a rejected call-volume request
      // otherwise renders identically to a genuinely empty period.
      const failed = [s, v, st, a, h]
        .map((result, i) => (result.status === 'rejected'
          ? `${panels[i][0]} (${describeError(result.reason)})`
          : null))
        .filter(Boolean)
      if (failed.length) setError(`Could not load ${failed.join(', ')}.`)

      if (s.status === 'fulfilled') setSummary(s.value)

      setVolume(v.status === 'fulfilled' ? toRows(v.value, ['date', 'day', 'bucket', 'label'], ['count', 'calls', 'total']) : [])
      setStatuses(st.status === 'fulfilled' ? toRows(st.value, ['status', 'call_status', 'label'], ['count', 'total']) : [])
      setHourly(h.status === 'fulfilled' ? toRows(h.value, ['hour', 'label'], ['count', 'calls', 'total']) : [])

      const agentPayload = a.status === 'fulfilled' ? a.value : null
      // Same "first array-valued property" fallback the other lists use, since
      // this route's envelope key is undocumented too.
      const agentRows = Array.isArray(agentPayload)
        ? agentPayload
        : (agentPayload?.data ?? agentPayload?.items
          ?? (agentPayload && typeof agentPayload === 'object'
            ? Object.values(agentPayload).find(Array.isArray)
            : null)
          ?? [])
      setAgentStats(agentRows)
      warnAgentStats(agentRows[0])
    } catch (e) {
      setError(e.message || 'Could not load analytics.')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  return (
    <PageShell>
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        subtitle="Call volume, outcomes and agent activity"
        action={(
          <div className="w-full sm:w-44">
            <SelectField value={period} onChange={setPeriod} placeholder="Period" options={PERIODS} />
          </div>
        )}
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>

      <motion.div
        variants={resolveMotion(reduced, stagger(0, 0.04))}
        initial="hidden"
        animate="show"
        className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <StatCard icon={PhoneCall} label="Total calls" value={summary?.total_calls ?? (loading ? '—' : 0)} />
        <StatCard icon={TrendingUp} label="Today" value={summary?.today_calls ?? (loading ? '—' : 0)} />
        <StatCard icon={Radio} label="Live now" value={summary?.live_calls ?? (loading ? '—' : 0)} />
        <StatCard
          icon={Timer}
          label="Avg duration"
          value={summary?.avg_duration_seconds != null
            ? formatSeconds(summary.avg_duration_seconds)
            : (loading ? '—' : '0s')}
          hint="Across all agents"
        />
        <StatCard
          icon={TrendingUp}
          label="Success rate"
          value={summary?.success_rate != null ? `${Math.round(summary.success_rate)}%` : (loading ? '—' : '0%')}
          hint="Calls completed"
        />
        <StatCard icon={Users} label="Active agents" value={summary?.active_agents ?? (loading ? '—' : 0)} />
      </motion.div>

      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1.35fr_1fr]">
        <Panel title="Call volume" hint={PERIODS.find((p) => p.id === period)?.label}>
          <AreaChart data={volume} empty="No calls in this period." />
        </Panel>
        <Panel title="Outcomes" hint="Share of calls">
          <DonutChart data={toOutcomes(statuses)} centerLabel="calls" empty="No outcome data yet." />
        </Panel>
      </div>

      <div className="mb-5">
        <Panel title="Calls by hour" hint="Today">
          <ColumnChart data={toHours(hourly)} empty="No calls today." />
        </Panel>
      </div>

      <DataTable
        columns={[
          { key: 'agent_name', header: 'Agent', render: (r) => r.agent_name ?? r.agentName ?? r.agent_id ?? '—' },
          {
            key: 'total_calls',
            header: 'Calls',
            render: (r) => pick(r, AGENT_FIELDS.calls)?.value ?? 0,
          },
          {
            key: 'completed',
            header: 'Completed',
            // The outcome vocabulary on this backend is "succeeded", so agent-stats
            // may name the column after that rather than "completed".
            render: (r) => {
              const value = pick(r, AGENT_FIELDS.completed)?.value ?? 0
              return <Badge tone={value > 0 ? 'success' : 'neutral'}>{value}</Badge>
            },
          },
          {
            key: 'success_rate',
            header: 'Success rate',
            // Reported per agent by the route itself, so unlike a duration it
            // needs no second pass over call history to work out.
            render: (r) => {
              const rate = agentSuccessRate(r)
              if (rate == null) return '—'
              return <Badge tone={rate >= 60 ? 'success' : rate >= 30 ? 'warning' : 'danger'}>{formatRate(rate)}</Badge>
            },
          },
        ]}
        rows={pageItems}
        loading={loading}
        rowKey={(r, i) => r.agent_id ?? r.agentID ?? i}
        empty="No per-agent activity in this period."
      />

      <Pagination total={total} limit={pageSize} offset={offset} onChange={setOffset} />
    </PageShell>
  )
}
