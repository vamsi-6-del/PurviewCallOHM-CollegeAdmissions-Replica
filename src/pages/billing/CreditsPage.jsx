import { useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Wallet, Plus, Scale, Lock, TrendingDown } from 'lucide-react'
import {
  getCreditBalance, getCreditLedger, getCreditUsage, topUpCredits,
  listPlans, adjustCredits,
} from '../../api/resources/billing'
import { listCompanies } from '../../api/resources/org'
import { listAgents } from '../../api/resources/agents'
import { can, isSuperAdmin } from '../../api/permissions'
import {
  PageShell, PageHeader, PrimaryButton, GhostButton, DataTable, Pagination,
  Drawer, Banner, Badge, TextField, TextAreaField, SelectField,
} from '../../components/resource/ResourceKit'
import { AreaChart } from '../../components/resource/Charts'
import { SPRING } from '../../components/ui/motion'
// The credit routes stamp their rows in UTC, unlike the call routes — see the
// note in utils/datetime. Every date on this page goes through `utcApi`.
import { utcApi } from '../../utils/datetime'

const LIMIT = 20

const TABS = [
  { id: 'ledger', label: 'Ledger' },
  { id: 'usage', label: 'Usage' },
  { id: 'plans', label: 'Plans' },
]

/**
 * Field names for the credit routes.
 *
 * /credits/ledger and /credits/usage both document an empty response schema, so
 * the field names cannot be read off the contract — they have to be probed.
 * Each row here is the set of names seen or plausible for one column, tried in
 * order of specificity.
 *
 * The important part is what happens on a miss: an unresolved amount renders as
 * "—", never as 0. A hardcoded 0 in a credits column is a *wrong number* that
 * reads as authoritative — "this call cost nothing" — while a dash reads as
 * "not reported", which is the truth.
 */
const FIELDS = {
  when: ['created_at', 'createdAt', 'occurred_at', 'used_at', 'settled_at', 'recorded_at',
    'event_time', 'timestamp', 'ts', 'date'],
  entryType: ['entry_type', 'type', 'txn_type', 'transaction_type', 'entry_kind', 'kind',
    'event_type', 'reason', 'category'],
  credits: ['credits', 'credit_delta', 'credits_delta', 'amount_credits', 'credit_amount',
    'delta', 'change', 'amount'],
  charged: ['total_credits_used', 'credits_charged', 'credits_used', 'charged_credits',
    'cost_credits', 'credits_spent', 'credits'],
  agent: ['agent_name', 'agentName', 'agent_id', 'agentID'],
}

/**
 * A credit figure from the balance response.
 *
 * /credits/balance reports the same amount three ways — whole credits, millionths
 * (`*_micro`) and a currency conversion (`*_rupees`). Credits are the unit the
 * rest of this page speaks, with micro as the fallback since it is the precise
 * one; the currency figure is only ever shown as a secondary hint.
 */
function balanceCredits(balance, keys, microKey) {
  const direct = pickNumber(balance, keys)
  if (direct != null) return direct
  const micro = pickNumber(balance, [microKey])
  return micro == null ? null : micro / 1e6
}

/** Credits for a stat tile: two decimals at most, "—" when not reported. */
function fmtCredits(value) {
  return value == null ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

/** The money-equivalent hint, e.g. "≈ ₹984.67". */
function currencyHint(balance, key) {
  const amount = pickNumber(balance, [key])
  if (amount == null) return null
  const currency = String(balance?.currency ?? '').toUpperCase()
  const formatted = amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (currency === 'INR' || key.includes('rupees')) return `≈ ₹${formatted}`
  return currency ? `≈ ${currency} ${formatted}` : `≈ ${formatted}`
}

/**
 * Credits charged. `total_credits_used_micro` is the same figure in millionths,
 * used as the fallback so a row that only reports the precise integer still
 * shows a value rather than a dash.
 */
function usageCharged(row) {
  const direct = pickNumber(row, FIELDS.charged)
  if (direct != null) return direct
  const micro = pickNumber(row, ['total_credits_used_micro'])
  return micro == null ? null : micro / 1e6
}

/** First present field from `keys`, or null. Zero counts as present; empty string does not. */
function pick(row, keys) {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== undefined && value !== null && value !== '') return { key, value }
  }
  return null
}

/** A number if the field resolved, otherwise null so the caller can show "—". */
function pickNumber(row, keys) {
  const found = pick(row, keys)
  if (!found) return null
  const numeric = Number(found.value)
  return Number.isFinite(numeric) ? numeric : null
}

function StatCard({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className="ui-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="ui-label">{label}</p>
        <span
          className="grid size-7 shrink-0 place-items-center rounded-lg"
          style={accent
            ? { background: 'var(--ui-accent-soft)', color: 'var(--ui-accent-strong)' }
            : { background: 'var(--ui-surface-2)', color: 'var(--ui-text-3)' }}
        >
          <Icon size={13} />
        </span>
      </div>
      <p
        className="mt-2 font-semibold"
        style={{ color: 'var(--ui-text)', fontSize: 27, letterSpacing: '-0.03em', lineHeight: 1.05 }}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>{hint}</p> : null}
    </div>
  )
}

/** Timestamp from whichever field carries it, split over two lines to stay narrow. */
function formatWhen(row) {
  const found = pick(row, FIELDS.when)
  if (!found) return <span style={{ color: 'var(--ui-text-3)' }}>—</span>
  // parseApiDate returns null on an unparseable value, so show the raw string
  // rather than calling into a null date.
  if (!utcApi.parse(found.value)) {
    return <span className="ui-mono text-[12px]">{String(found.value)}</span>
  }
  return (
    <div className="leading-tight">
      <div className="text-[12.5px]" style={{ color: 'var(--ui-text)' }}>{utcApi.date(found.value)}</div>
      <div className="ui-mono text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
        {utcApi.time(found.value)}
      </div>
    </div>
  )
}

/**
 * Name the fields that could not be resolved, once per load, in dev only.
 *
 * These routes ship no response schema, so the candidate lists above are the
 * only record of their shape. When a column comes up empty this prints the keys
 * the row actually has, which turns "why is this blank" into a one-line answer
 * instead of another round of guessing.
 */
function warnUnresolved(tab, row) {
  if (!import.meta.env.DEV || !row) return
  const needed = tab === 'ledger'
    ? ['when', 'entryType', 'credits']
    : ['when', 'charged']
  const missing = needed.filter((name) => !pick(row, FIELDS[name]))
  if (tab === 'usage' && usageCharged(row) != null) {
    const index = missing.indexOf('charged')
    if (index >= 0) missing.splice(index, 1)
  }
  if (!missing.length) return

  // Two very different faults look identical in the UI: a field this app calls
  // by the wrong name (fixable here) versus a field the backend returns as null
  // (fixable only server-side). Say which, so the next step is unambiguous.
  const detail = missing.map((name) => {
    const nulls = FIELDS[name].filter((key) => key in row && (row[key] === null || row[key] === ''))
    return nulls.length
      ? `${name}: key present but empty (${nulls.join(', ')}) — backend is not reporting it`
      : `${name}: no candidate key on the row — needs the real field name`
  })
  console.warn(
    `[credits/${tab}] unresolved columns\n  ${detail.join('\n  ')}\n`
    + `  row keys: ${Object.keys(row).join(', ')}`,
  )
}

/**
 * Right-aligned credit amount.
 *
 * Deductions are ordinary ink, not red. Every row on a usage-driven ledger is a
 * deduction, so colouring them all red paints the whole column as a problem and
 * leaves nothing for a real exception to stand out against — the minus sign
 * already carries the direction. Only an *increase* is tinted, because against
 * a page of deductions that is the genuinely notable event.
 */
function CreditAmount({ value, signed }) {
  if (value == null) return <span style={{ color: 'var(--ui-text-3)' }}>—</span>
  const positive = signed && value > 0
  return (
    <span
      className="ui-mono"
      style={{
        color: positive ? '#0f9d6e' : 'var(--ui-text)',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: positive ? 600 : 500,
      }}
    >
      {positive ? '+' : ''}{value.toLocaleString(undefined, { maximumFractionDigits: 3 })}
    </span>
  )
}

/** Credit balance, ledger and usage. Top-ups are super-admin only. */
export default function CreditsPage() {
  const reduced = useReducedMotion()
  const [tab, setTab] = useState('ledger')
  const [balance, setBalance] = useState(null)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Super admins pick which company they are looking at.
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState('')
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [hasPlans, setHasPlans] = useState(false)
  const [agentNames, setAgentNames] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Plans are a platform catalogue rather than a company ledger, so they
      // are not paged or company-scoped.
      const fetcher = tab === 'plans'
        ? () => listPlans()
        : tab === 'ledger' ? getCreditLedger : getCreditUsage
      const [balanceData, listData] = await Promise.all([
        getCreditBalance({ companyId: companyId || undefined }).catch(() => null),
        fetcher({ companyId: companyId || undefined, limit: LIMIT, offset }),
      ])
      setBalance(balanceData)
      setRows(listData.items)
      setTotal(tab === 'plans' ? 0 : listData.total)
      if (tab !== 'plans') warnUnresolved(tab, listData.items[0])
    } catch (e) {
      setError(e.message || 'Could not load credits.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [tab, offset, companyId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!isSuperAdmin()) return
    listCompanies()
      .then((data) => setCompanies(data.items))
      .catch(() => setCompanies([]))
  }, [])

  /**
   * Plans are a platform catalogue, and this deployment has none configured —
   * /plans comes back empty. Rather than offer a tab whose only content is
   * "nothing here", it is hidden until plans exist. The tab and its column set
   * are kept because a deployment that does sell plans still needs them; the
   * check is on the data, not on the feature being deleted.
   */
  useEffect(() => {
    listPlans()
      .then((data) => setHasPlans(data.items.length > 0))
      .catch(() => setHasPlans(false))
  }, [])

  // Usage rows identify their agent by id only; this is the lookup that turns
  // AGENT_3F6F397C157C into the name the reader recognises.
  useEffect(() => {
    listAgents({ limit: 100 })
      .then((data) => setAgentNames(
        Object.fromEntries(data.items.map((a) => [a.agentID, a.agentName]).filter(([, n]) => n)),
      ))
      .catch(() => setAgentNames({}))
  }, [])

  const tabs = TABS.filter((entry) => entry.id !== 'plans' || hasPlans)

  // The Type column is dropped when every row carries the same value — on this
  // company every entry is a "usage deduction", so the column repeated one word
  // down the page and earned none of its width. It reappears by itself the
  // moment a top-up or adjustment lands and the values actually differ.
  const entryTypes = new Set(
    rows.map((r) => pick(r, FIELDS.entryType)?.value).filter((v) => v != null),
  )

  const ledgerColumns = [
    { key: 'when', header: 'When', render: (r) => formatWhen(r) },
    ...(entryTypes.size > 1 ? [{
      key: 'entryType',
      header: 'Type',
      render: (r) => {
        const found = pick(r, FIELDS.entryType)
        if (!found) return <span style={{ color: 'var(--ui-text-3)' }}>—</span>
        const credit = pickNumber(r, FIELDS.credits)
        return (
          <Badge tone={credit != null && credit > 0 ? 'success' : 'neutral'}>
            {String(found.value).replace(/_/g, ' ')}
          </Badge>
        )
      },
    }] : []),
    { key: 'description', header: 'Description', render: (r) => r.description || '—' },
    {
      key: 'credits',
      header: 'Credits',
      className: 'text-right',
      render: (r) => <CreditAmount value={pickNumber(r, FIELDS.credits)} signed />,
    },
  ]

  /**
   * Deductions across the entries currently loaded, oldest first.
   *
   * Grouping by day was the obvious choice and the wrong one: this company's
   * entries all fall on a single day, so a daily chart is one dot. Per entry
   * over its own timestamp shows the actual shape — which settlements are
   * expensive and how they cluster.
   */
  const spendSeries = rows
    .map((row) => ({ when: pick(row, FIELDS.when), credits: pickNumber(row, FIELDS.credits) }))
    .filter((entry) => entry.when && entry.credits != null && entry.credits < 0)
    .map((entry) => ({
      raw: entry.when.value,
      valid: Boolean(utcApi.parse(entry.when.value)),
      count: Math.abs(entry.credits),
    }))
    .filter((entry) => entry.valid)
    .reverse()
    // Evenly spaced by entry, not by timestamp. AreaChart will scale to a real
    // time axis if given an `x` per point, which is more truthful about gaps but
    // collapses settlements seconds apart into a spike; even spacing keeps every
    // deduction equally readable, which is what this panel is for.
    .map((entry) => ({
      label: utcApi.clock(entry.raw),
      tip: utcApi.dateTime(entry.raw),
      count: entry.count,
    }))

  const usageColumns = [
    { key: 'when', header: 'When', render: (r) => formatWhen(r) },
    {
      key: 'source',
      header: 'Source',
      render: (r) => (r.source ? <Badge tone="info">{String(r.source).replace(/_/g, ' ')}</Badge> : '—'),
    },
    {
      key: 'agent',
      header: 'Agent',
      render: (r) => {
        // Usage records carry only agent_id, so the id is resolved against the
        // agent list — an opaque AGENT_3F6F… tells the reader nothing.
        const id = r.agent_id ?? r.agentID
        // Not every charge is agent-scoped: a call summary is billed to the
        // company, so a blank agent here is correct rather than missing data.
        if (!id) return <span style={{ color: 'var(--ui-text-3)' }}>Company</span>
        const name = agentNames[id]
        return (
          <span className="truncate" title={id}>
            {name ?? <span className="ui-mono text-[11.5px]">{id}</span>}
          </span>
        )
      },
    },
    {
      key: 'charged',
      header: 'Charged',
      className: 'text-right',
      render: (r) => <CreditAmount value={usageCharged(r)} />,
    },
  ]

  const planColumns = [
    {
      key: 'name',
      header: 'Plan',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.name ?? r.plan_name ?? '—'}</p>
          {r.description ? (
            <p className="truncate text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>{r.description}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'credits',
      header: 'Credits',
      render: (r) => (r.credits != null ? Number(r.credits).toLocaleString() : '—'),
    },
    {
      key: 'price',
      header: 'Price',
      render: (r) => {
        const price = r.price ?? r.amount ?? r.cost
        if (price == null) return '—'
        return `${r.currency ?? ''} ${Number(price).toLocaleString()}`.trim()
      },
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (r) => {
        const active = r.is_active ?? r.active
        return active === undefined
          ? '—'
          : <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Badge>
      },
    },
  ]

  return (
    <PageShell>
      <PageHeader
        icon={Wallet}
        title="Credits"
        subtitle="Balance, transactions and consumption"
        action={can.manageCredits() ? (
          <div className="flex flex-wrap items-center gap-2">
            <GhostButton icon={Scale} onClick={() => setAdjustOpen(true)}>Adjust</GhostButton>
            <PrimaryButton icon={Plus} onClick={() => setTopUpOpen(true)}>Top up</PrimaryButton>
          </div>
        ) : null}
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>

      {/* Adjustments can subtract as well as add, so they are kept apart from
          top-ups rather than folded into one form. */}
      <AdjustDrawer
        open={adjustOpen}
        companies={companies}
        defaultCompanyId={companyId}
        onClose={() => setAdjustOpen(false)}
        onDone={async () => { setAdjustOpen(false); await load() }}
        onError={setError}
      />

      {isSuperAdmin() && companies.length ? (
        <div className="mb-4 w-full sm:w-72">
          <SelectField
            label="Company"
            value={companyId}
            onChange={(v) => { setOffset(0); setCompanyId(v) }}
            placeholder="Select a company"
            options={companies.map((c) => ({ id: c.companyID, label: c.companyName }))}
          />
        </div>
      ) : null}

      {/*
        Balance, reserved and available — the three figures /credits/balance
        actually reports. "Lifetime spend" used to sit in the third slot and was
        dropped: the endpoint has no such field, and the only alternatives were
        to print a fabricated 0 or to page the entire usage history to add it up.
        Available is the more useful number anyway — it is what can be spent
        right now, once the holds against live calls are taken off.
      */}
      {balance ? (
        <>
          <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              icon={Wallet}
              accent
              label="Balance"
              value={fmtCredits(balanceCredits(balance, ['credits', 'balance'], 'balance_micro'))}
              hint={currencyHint(balance, 'balance_rupees') ?? 'Credits on the account'}
            />
            <StatCard
              icon={Lock}
              label="Reserved"
              value={fmtCredits(balanceCredits(balance, ['reserved_credits', 'reserved'], 'reserved_micro'))}
              hint="Held for calls in progress"
            />
            <StatCard
              icon={TrendingDown}
              label="Available"
              value={fmtCredits(balanceCredits(balance, ['available_credits', 'available'], 'available_micro'))}
              hint={currencyHint(balance, 'available_rupees') ?? 'Spendable now'}
            />
          </div>
          {balance.updated_at ? (
            <p className="mb-5 text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
              Balance as of {utcApi.dateTime(balance.updated_at)}
            </p>
          ) : <div className="mb-5" />}
        </>
      ) : null}

      {/* Segmented control: the active tab is a moving panel rather than a
          colour swap, so the selection reads as one control. */}
      <div
        className="mb-4 inline-flex rounded-xl p-1"
        style={{ background: 'var(--ui-surface-2)', border: '1px solid var(--ui-border)' }}
      >
        {tabs.map((entry) => {
          const active = tab === entry.id
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => { setTab(entry.id); setOffset(0) }}
              className="relative rounded-lg px-4 py-1.5 text-[12.5px] font-medium"
              style={{ color: active ? 'var(--ui-text)' : 'var(--ui-text-3)' }}
            >
              {active ? (
                <motion.span
                  layoutId="credits-tab"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'var(--ui-surface)', boxShadow: 'var(--ui-shadow)' }}
                  transition={reduced ? { duration: 0 } : SPRING}
                />
              ) : null}
              <span className="relative">{entry.label}</span>
            </button>
          )
        })}
      </div>

      {tab === 'ledger' && spendSeries.length > 1 ? (
        <div className="ui-card mb-3 p-5">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <p className="ui-h2">Credits spent</p>
            <span className="text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
              {spendSeries.length} most recent deductions
            </span>
          </div>
          <AreaChart data={spendSeries} height={168} valueLabel="credits" empty="No deductions to plot." />
        </div>
      ) : null}

      <DataTable
        columns={tab === 'plans' ? planColumns : tab === 'ledger' ? ledgerColumns : usageColumns}
        rows={rows}
        loading={loading}
        rowKey={(r, i) => r.id ?? r.entry_id ?? r.plan_id ?? i}
        empty={tab === 'plans'
          ? 'No plans configured on this deployment.'
          : tab === 'ledger' ? 'No credit transactions yet.' : 'No usage recorded yet.'}
      />

      {/* The credit routes report no `total`, so paging is driven by "did this
          page come back full" rather than by a count. Plans are a catalogue
          fetched whole and are not paged. */}
      {tab === 'plans' ? null : (
        <Pagination
          total={total}
          limit={LIMIT}
          offset={offset}
          onChange={setOffset}
          hasMore={rows.length >= LIMIT}
        />
      )}

      <TopUpDrawer
        open={topUpOpen}
        companies={companies}
        defaultCompanyId={companyId}
        onClose={() => setTopUpOpen(false)}
        onDone={async () => { setTopUpOpen(false); await load() }}
        onError={setError}
      />
    </PageShell>
  )
}

/**
 * A manual correction to a balance, in either direction.
 *
 * Unlike a top-up this can be negative — for a refund reversal or a
 * miscount — so the sign is explicit and a reason is required rather than
 * optional: an unexplained adjustment is unauditable.
 */
function AdjustDrawer({ open, onClose, onDone, onError, companies, defaultCompanyId }) {
  const [form, setForm] = useState({ companyId: '', direction: 'add', credits: '', reason: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setForm({ companyId: defaultCompanyId || '', direction: 'add', credits: '', reason: '' })
  }, [open, defaultCompanyId])

  async function submit() {
    setBusy(true)
    try {
      const magnitude = Math.abs(Number(form.credits))
      await adjustCredits({
        company_id: form.companyId,
        credits: form.direction === 'remove' ? -magnitude : magnitude,
        reason: form.reason,
        description: form.reason,
      })
      onDone()
    } catch (e) {
      onError(e.message || 'Adjustment failed.')
    } finally {
      setBusy(false)
    }
  }

  const valid = form.companyId && Number(form.credits) > 0 && form.reason.trim()

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Adjust credits"
      subtitle="Corrects a balance up or down, with a reason on the ledger."
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton icon={Scale} busy={busy} disabled={!valid} onClick={submit}>
            Apply adjustment
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <SelectField
          label="Company"
          value={form.companyId}
          onChange={(v) => setForm((p) => ({ ...p, companyId: v }))}
          options={companies.map((c) => ({ id: c.companyID, label: c.companyName }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_1fr]">
          <SelectField
            label="Direction"
            value={form.direction}
            onChange={(v) => setForm((p) => ({ ...p, direction: v }))}
            placeholder="Add"
            options={[
              { id: 'add', label: 'Add credits' },
              { id: 'remove', label: 'Remove credits' },
            ]}
          />
          <TextField
            label="Credits"
            type="number"
            min="1"
            value={form.credits}
            onChange={(v) => setForm((p) => ({ ...p, credits: v }))}
          />
        </div>
        <TextAreaField
          label="Reason"
          rows={3}
          value={form.reason}
          onChange={(v) => setForm((p) => ({ ...p, reason: v }))}
          placeholder="Why this balance is being corrected"
        />
        <p className="text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
          {form.direction === 'remove'
            ? 'Credits will be deducted immediately. This shows on the company ledger.'
            : 'Credits will be added immediately. This shows on the company ledger.'}
        </p>
      </div>
    </Drawer>
  )
}

function TopUpDrawer({ open, onClose, onDone, onError, companies, defaultCompanyId }) {
  const [form, setForm] = useState({ companyId: '', credits: '', description: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setForm({ companyId: defaultCompanyId || '', credits: '', description: '' })
  }, [open, defaultCompanyId])

  async function submit() {
    setBusy(true)
    try {
      await topUpCredits({
        companyId: form.companyId,
        credits: Number(form.credits),
        description: form.description || undefined,
      })
      onDone()
    } catch (e) {
      onError(e.message || 'Top-up failed.')
    } finally {
      setBusy(false)
    }
  }

  const valid = form.companyId && Number(form.credits) > 0

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Top up credits"
      subtitle="Adds credits to a company's balance immediately."
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton icon={Wallet} busy={busy} disabled={!valid} onClick={submit}>Add credits</PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <SelectField
          label="Company"
          value={form.companyId}
          onChange={(v) => setForm((p) => ({ ...p, companyId: v }))}
          options={companies.map((c) => ({ id: c.companyID, label: c.companyName }))}
        />
        <TextField
          label="Credits"
          type="number"
          min="1"
          value={form.credits}
          onChange={(v) => setForm((p) => ({ ...p, credits: v }))}
        />
        <TextAreaField
          label="Description"
          rows={3}
          value={form.description}
          onChange={(v) => setForm((p) => ({ ...p, description: v }))}
          placeholder="Reason for this adjustment"
        />
      </div>
    </Drawer>
  )
}
