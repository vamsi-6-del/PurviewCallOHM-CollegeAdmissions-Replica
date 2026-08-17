import { useCallback, useEffect, useState } from 'react'
import { Building2, Pencil, ShieldCheck, Trash2, SlidersHorizontal, Check } from 'lucide-react'
import {
  listCompanies, createCompany, updateCompany, deleteCompany, reviewKyc,
  listAccessPolicyPages, setAccessPolicy, listPendingKyc,
} from '../../api/resources/org'
import { NAV_SECTIONS } from '../../layouts/navConfig'
import {
  PageShell, PageHeader, PrimaryButton, GhostButton, DataTable, Drawer,
  Pagination,
  ConfirmDialog, Banner, Badge, TextField, SelectField, TextAreaField,
} from '../../components/resource/ResourceKit'
import { useClientPagination } from '../../hooks/useClientPagination'
import { formatDate, formatDateTime } from '../../utils/datetime'

const KYC_TONE = {
  verified: 'success',
  submitted: 'warning',
  under_review: 'warning',
  pending: 'neutral',
  rejected: 'danger',
}

/** Companies (tenants). Every route here is super-admin only. */
export default function CompaniesPage() {
  const [rows, setRows] = useState([])
  // This route returns the whole list, so the pager slices it client-side.
  const { offset, setOffset, total, pageItems, pageSize } = useClientPagination(rows)
  const [mode, setMode] = useState('all')
  const [pendingCount, setPendingCount] = useState(null)
  const [kycFilter, setKycFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [reviewing, setReviewing] = useState(null)
  const [policyFor, setPolicyFor] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // The KYC queue is its own endpoint rather than a status filter — it is
      // what the backend considers awaiting a decision.
      const data = mode === 'pending'
        ? await listPendingKyc()
        : await listCompanies({ kycStatus: kycFilter || undefined })
      setRows(data.items)
      if (mode === 'pending') setPendingCount(data.items.length)
    } catch (e) {
      setError(e.message || 'Could not load companies.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [kycFilter, mode])

  useEffect(() => { load() }, [load])

  // Badge the queue tab even while the full list is showing.
  useEffect(() => {
    listPendingKyc()
      .then((d) => setPendingCount(d.items.length))
      .catch(() => setPendingCount(null))
  }, [])

  async function handleSave(form) {
    setBusy(true)
    setError('')
    try {
      const payload = {
        companyName: form.companyName,
        recording_retention_days: Number(form.recording_retention_days) || 90,
      }
      if (editing?.companyID) await updateCompany(editing.companyID, payload)
      else await createCompany(payload)
      setEditing(null)
      await load()
    } catch (e) {
      setError(e.message || 'Could not save the company.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await deleteCompany(deleting.companyID)
      setDeleting(null)
      await load()
    } catch (e) {
      setError(e.message || 'Could not delete the company.')
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    {
      key: 'companyName',
      header: 'Company',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.companyName}</p>
          <p className="truncate font-mono text-[11px]" style={{ color: 'var(--ui-text-3)' }}>{row.companyID}</p>
        </div>
      ),
    },
    {
      key: 'kyc',
      header: 'KYC',
      render: (r) => {
        const status = r.kyc?.status ?? r.kyc_status
        return status ? <Badge tone={KYC_TONE[status] || 'neutral'}>{status.replace('_', ' ')}</Badge> : '—'
      },
    },
    {
      key: 'recording_retention_days',
      header: 'Retention',
      render: (r) => (r.recording_retention_days ? `${r.recording_retention_days} days` : '—'),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (r) => formatDate(r.created_at),
    },
    {
      key: 'access',
      header: 'Access',
      render: (r) => {
        const off = Object.values(policyMap(r)).filter((v) => v === false).length
        return off
          ? <Badge tone="warning">{off} page{off === 1 ? '' : 's'} off</Badge>
          : <span style={{ color: 'var(--ui-text-3)' }}>All pages</span>
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <GhostButton icon={SlidersHorizontal} onClick={() => setPolicyFor(row)}>Access</GhostButton>
          <GhostButton icon={ShieldCheck} onClick={() => setReviewing(row)}>KYC</GhostButton>
          <GhostButton icon={Pencil} onClick={() => setEditing(row)}>Edit</GhostButton>
          <GhostButton icon={Trash2} onClick={() => setDeleting(row)}>Delete</GhostButton>
        </div>
      ),
    },
  ]

  return (
    <PageShell>
      <PageHeader
        icon={Building2}
        title="Companies"
        subtitle="Tenants on this deployment"
        action={<PrimaryButton onClick={() => setEditing({ companyName: '', recording_retention_days: 90 })}>
          New company
        </PrimaryButton>}
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--ui-surface-2)' }}>
          {[
            { id: 'all', label: 'All companies' },
            { id: 'pending', label: 'KYC queue' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold"
              style={mode === tab.id
                ? { background: 'var(--ui-surface)', color: 'var(--ui-text)', boxShadow: 'var(--ui-shadow)' }
                : { color: 'var(--ui-text-3)' }}
            >
              {tab.label}
              {tab.id === 'pending' && pendingCount ? <Badge tone="warning">{pendingCount}</Badge> : null}
            </button>
          ))}
        </div>

        {mode === 'all' ? (
          <div className="w-full sm:w-56">
            <SelectField
              value={kycFilter}
              onChange={setKycFilter}
              placeholder="All KYC statuses"
              options={['pending', 'submitted', 'under_review', 'verified', 'rejected']
                .map((id) => ({ id, label: id.replace('_', ' ') }))}
            />
          </div>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={pageItems}
        loading={loading}
        rowKey={(r) => r.companyID}
        empty={mode === 'pending' ? 'Nothing waiting on a KYC decision.' : 'No companies yet.'}
      />

      <Pagination total={total} limit={pageSize} offset={offset} onChange={setOffset} />

      <CompanyDrawer company={editing} busy={busy} onClose={() => setEditing(null)} onSave={handleSave} />

      <AccessPolicyDrawer
        company={policyFor}
        onClose={() => setPolicyFor(null)}
        onDone={async () => { setPolicyFor(null); await load() }}
        onError={setError}
      />

      <KycDrawer
        company={reviewing}
        onClose={() => setReviewing(null)}
        onDone={async () => {
          setReviewing(null)
          await load()
          // A decision changes the queue even when the full list is showing.
          listPendingKyc().then((d) => setPendingCount(d.items.length)).catch(() => {})
        }}
        onError={setError}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        busy={busy}
        title="Delete company"
        message={`"${deleting?.companyName}" and every user belonging to it will be permanently deleted. This cascade cannot be undone.`}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </PageShell>
  )
}

function CompanyDrawer({ company, onClose, onSave, busy }) {
  const [form, setForm] = useState({ companyName: '', recording_retention_days: 90 })

  useEffect(() => {
    if (!company) return
    setForm({
      companyName: company.companyName ?? '',
      recording_retention_days: company.recording_retention_days ?? 90,
    })
  }, [company])

  return (
    <Drawer
      open={Boolean(company)}
      onClose={onClose}
      title={company?.companyID ? 'Edit company' : 'New company'}
      subtitle={company?.companyID}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton
            icon={Building2}
            busy={busy}
            disabled={!form.companyName.trim()}
            onClick={() => onSave(form)}
          >
            Save
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <TextField
          label="Company name"
          value={form.companyName}
          onChange={(v) => setForm((p) => ({ ...p, companyName: v }))}
          autoFocus
        />
        <TextField
          label="Recording retention (days)"
          type="number"
          min="1"
          value={form.recording_retention_days}
          onChange={(v) => setForm((p) => ({ ...p, recording_retention_days: v }))}
        />
        <p className="text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
          New companies start with KYC status <strong>pending</strong>. Users are added from the Users page.
        </p>
      </div>
    </Drawer>
  )
}

/* ── access policy ──────────────────────────────────────────────────────── */

/**
 * A company's policy as a flat `{ pageKey: boolean }` map.
 *
 * Mirrors permissions.policyAllowsPage, which is what actually enforces this:
 * an entry may be a bare boolean or `{ enabled }`, and a *missing* key means
 * allowed. Keys absent here are therefore on.
 */
function policyMap(company) {
  const policy = company?.access_policy ?? company?.accessPolicy
  const pages = policy?.pages ?? policy
  if (!pages || typeof pages !== 'object') return {}

  return Object.fromEntries(
    Object.entries(pages).map(([key, value]) => [
      key,
      typeof value === 'object' && value !== null ? Boolean(value.enabled) : Boolean(value),
    ]),
  )
}

/** The page keys the app actually gates on, with the nav's own labels. */
const NAV_PAGES = NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ key: item.page, label: item.label, section: section.section })))

function prettifyKey(key) {
  return String(key).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="ui-row flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left"
    >
      <span className="min-w-0">
        <span className="block truncate text-[13px]" style={{ color: 'var(--ui-text)' }}>{label}</span>
        {hint ? (
          <span className="ui-mono block truncate text-[11px]" style={{ color: 'var(--ui-text-3)' }}>{hint}</span>
        ) : null}
      </span>
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
        style={{
          background: checked ? 'var(--ui-accent-soft)' : 'transparent',
          border: `1px solid ${checked ? 'var(--ui-accent-ring)' : 'var(--ui-border-strong)'}`,
          color: 'var(--ui-accent-strong)',
        }}
      >
        {checked ? <Check size={13} /> : null}
      </span>
    </button>
  )
}

/**
 * Switches individual pages off for one company.
 *
 * Every known key is written explicitly on save, including the enabled ones:
 * an omitted key reads as allowed, so writing only the disabled ones would
 * make "off" silently revert the next time the policy is replaced.
 */
function AccessPolicyDrawer({ company, onClose, onDone, onError }) {
  const [pages, setPages] = useState(NAV_PAGES)
  const [state, setState] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!company) return
    const current = policyMap(company)
    setState(Object.fromEntries(pages.map((p) => [p.key, current[p.key] !== false])))
    // Only on a company change: the page list can arrive after the drawer is
    // already open, and reacting to that here would discard toggles in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company])

  // Keys that arrive with the backend's list get their policy value; anything
  // the user has already touched is left alone.
  useEffect(() => {
    if (!company) return
    const current = policyMap(company)
    setState((prev) => {
      const next = { ...prev }
      for (const page of pages) {
        if (!(page.key in next)) next[page.key] = current[page.key] !== false
      }
      return next
    })
  }, [company, pages])

  // The backend owns the canonical list; the nav is only the fallback, and any
  // key it does not know about is still shown so an existing policy stays
  // editable rather than being silently dropped on save.
  useEffect(() => {
    if (!company) return
    listAccessPolicyPages()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.pages ?? res?.items ?? [])
        const fromApi = (Array.isArray(raw) ? raw : Object.keys(raw))
          .map((entry) => (typeof entry === 'string'
            ? { key: entry, label: prettifyKey(entry) }
            : { key: entry.key ?? entry.page ?? entry.name, label: entry.label ?? prettifyKey(entry.key ?? entry.page ?? entry.name) }))
          .filter((p) => p.key)
        if (!fromApi.length) return

        const navLabels = new Map(NAV_PAGES.map((p) => [p.key, p.label]))
        setPages(fromApi.map((p) => ({ ...p, label: navLabels.get(p.key) ?? p.label })))
      })
      .catch(() => { /* nav keys remain the fallback */ })
  }, [company])

  async function save(clear = false) {
    setBusy(true)
    try {
      await setAccessPolicy(
        company.companyID,
        clear ? null : { pages: Object.fromEntries(pages.map((p) => [p.key, state[p.key] !== false])) },
      )
      onDone()
    } catch (e) {
      onError(e.message || 'Could not save the access policy.')
    } finally {
      setBusy(false)
    }
  }

  const offCount = pages.filter((p) => state[p.key] === false).length

  return (
    <Drawer
      open={Boolean(company)}
      onClose={onClose}
      title="Page access"
      subtitle={company?.companyName}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <GhostButton busy={busy} onClick={() => save(true)}>Allow all</GhostButton>
          <PrimaryButton icon={SlidersHorizontal} busy={busy} onClick={() => save(false)}>
            Save policy
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ui-text-2)' }}>
          Switched-off pages disappear from this company's sidebar, and their URLs redirect. Roles still
          apply on top. This can only take access away, never grant it.
        </p>

        <div className="grid gap-1">
          {pages.map((page) => (
            <Toggle
              key={page.key}
              label={page.label}
              hint={page.key}
              checked={state[page.key] !== false}
              onChange={(next) => setState((p) => ({ ...p, [page.key]: next }))}
            />
          ))}
        </div>

        <p className="text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
          {offCount
            ? `${offCount} page${offCount === 1 ? '' : 's'} will be hidden for this company.`
            : 'Every page is allowed. "Allow all" clears the policy entirely.'}
        </p>
      </div>
    </Drawer>
  )
}

function KycDrawer({ company, onClose, onDone, onError }) {
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (company) { setStatus(company.kyc?.status ?? ''); setNotes('') }
  }, [company])

  async function submit() {
    setBusy(true)
    try {
      await reviewKyc(company.companyID, { status, notes: notes || undefined })
      onDone()
    } catch (e) {
      onError(e.message || 'Could not update KYC.')
    } finally {
      setBusy(false)
    }
  }

  const kyc = company?.kyc

  return (
    <Drawer
      open={Boolean(company)}
      onClose={onClose}
      title="KYC review"
      subtitle={company?.companyName}
      footer={
        <>
          <GhostButton onClick={onClose}>Close</GhostButton>
          <PrimaryButton icon={ShieldCheck} busy={busy} disabled={!status} onClick={submit}>
            Update status
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        {kyc ? (
          <div className="ui-card p-4 text-[12.5px]" style={{ color: 'var(--ui-text-3)' }}>
            <p>Current status: <Badge tone={KYC_TONE[kyc.status] || 'neutral'}>{kyc.status}</Badge></p>
            {kyc.legal_name ? <p className="mt-2">Legal name: {kyc.legal_name}</p> : null}
            {kyc.submitted_at ? <p>Submitted {formatDateTime(kyc.submitted_at)}</p> : null}
          </div>
        ) : (
          <p className="text-[12.5px]" style={{ color: 'var(--ui-text-3)' }}>
            No KYC has been submitted for this company yet.
          </p>
        )}

        <SelectField
          label="Move to"
          value={status}
          onChange={setStatus}
          placeholder="Choose a status"
          options={[
            { id: 'under_review', label: 'Under review' },
            { id: 'verified', label: 'Verified' },
            { id: 'rejected', label: 'Rejected' },
          ]}
        />
        <TextAreaField label="Notes" rows={3} value={notes} onChange={setNotes} />
      </div>
    </Drawer>
  )
}
