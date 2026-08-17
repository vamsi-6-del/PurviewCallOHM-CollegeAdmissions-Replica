import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PhoneCall, RefreshCw, Trash2, Plug, ShoppingCart } from 'lucide-react'
import {
  listTelephonyNumbers, releaseNumber, listProviderAccounts, syncProviderNumbers,
} from '../../api/resources/billing'
import { can } from '../../api/permissions'
import {
  PageShell, PageHeader, GhostButton, DataTable, Banner, Badge, SelectField, ConfirmDialog,
  Pagination,
} from '../../components/resource/ResourceKit'
import { useClientPagination } from '../../hooks/useClientPagination'

const STATUS_TONE = { active: 'success', pending: 'warning', released: 'neutral', suspended: 'danger' }

/**
 * Telephony numbers owned by the company. These are what outbound calls dial
 * from — an agent needs one assigned before it can place a call.
 */
export default function TelephonyPage() {
  const [rows, setRows] = useState([])
  // This route returns the whole list, so the pager slices it client-side.
  const { offset, setOffset, total, pageItems, pageSize } = useClientPagination(rows)
  const [accounts, setAccounts] = useState([])
  const [accountsLoaded, setAccountsLoaded] = useState(false)
  const [accountId, setAccountId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [releasing, setReleasing] = useState(null)

  const editable = can.manageTelephony()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listTelephonyNumbers({ providerAccountId: accountId || undefined })
      setRows(data.items)
    } catch (e) {
      setError(e.message || 'Could not load telephony numbers.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    listProviderAccounts({ activeOnly: true })
      .then((data) => { setAccounts(data.items); setAccountsLoaded(true) })
      .catch(() => { setAccounts([]); setAccountsLoaded(false) })
  }, [])

  async function handleRelease() {
    setBusy(true)
    try {
      await releaseNumber(releasing.number_id)
      setReleasing(null)
      await load()
    } catch (e) {
      setError(e.message || 'Could not release the number.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSync() {
    if (!accountId) {
      setError(accounts.length
        ? 'Choose a provider account to sync numbers from.'
        : 'No provider account is connected yet. Connect one first.')
      return
    }
    setBusy(true)
    try {
      await syncProviderNumbers(accountId)
      await load()
    } catch (e) {
      setError(e.message || 'Sync failed.')
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    {
      key: 'number',
      header: 'Number',
      render: (row) => (
        <div className="min-w-0">
          <p className="ui-mono font-medium">{row.e164_number ?? '—'}</p>
          {row.alias ? (
            <p className="truncate text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>{row.alias}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'country_iso',
      header: 'Country',
      render: (r) => [r.city, r.region, r.country_iso].filter(Boolean).join(', ') || '—',
    },
    { key: 'number_type', header: 'Type', render: (r) => r.number_type || '—' },
    {
      key: 'capabilities',
      header: 'Capabilities',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.voice_enabled ? <Badge tone="info">Voice</Badge> : null}
          {r.sms_enabled ? <Badge tone="info">SMS</Badge> : null}
          {r.outbound_enabled ? <Badge tone="success">Outbound</Badge> : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={STATUS_TONE[r.status] || 'neutral'}>{r.status || 'unknown'}</Badge>,
    },
    {
      key: 'number_id',
      header: 'ID',
      render: (r) => (
        <span className="font-mono text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
          {r.number_id ?? '—'}
        </span>
      ),
    },
    ...(editable ? [{
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <GhostButton icon={Trash2} onClick={() => setReleasing(row)}>Release</GhostButton>
        </div>
      ),
    }] : []),
  ]

  return (
    <PageShell>
      <PageHeader
        icon={PhoneCall}
        title="Telephony numbers"
        subtitle="The numbers your agents call from"
        action={editable ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/app/telephony/providers" className="ui-btn">
              <Plug size={13} />
              Provider accounts
            </Link>
            <GhostButton icon={RefreshCw} busy={busy} onClick={handleSync}>Sync from provider</GhostButton>
            <Link to="/app/telephony/buy" className="ui-btn-primary">
              <ShoppingCart size={14} />
              Buy a number
            </Link>
          </div>
        ) : null}
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>

      {/* Only prompt when the account list genuinely came back empty. Numbers
          already on the account prove a provider is connected, whatever this
          endpoint reports, so claiming otherwise would be wrong. */}
      {accountsLoaded && !accounts.length && !rows.length && !loading && editable ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
          style={{ background: 'var(--ui-accent-soft)', border: '1px solid var(--ui-accent-ring)' }}
        >
          <p className="text-[12.5px]" style={{ color: 'var(--ui-text-2)' }}>
            No provider account is connected yet. Numbers can only be synced or bought once one is.
          </p>
          <Link to="/app/telephony/providers" className="ui-btn shrink-0">
            <Plug size={13} />
            Connect a provider
          </Link>
        </div>
      ) : null}

      {accounts.length ? (
        <div className="mb-4 w-full sm:w-72">
          <SelectField
            label="Provider account"
            value={accountId}
            onChange={setAccountId}
            placeholder="All accounts"
            options={accounts.map((a) => ({
              id: a.provider_account_id ?? a.id,
              label: a.label ?? a.account_name ?? a.provider_name ?? (a.provider_account_id ?? a.id),
            }))}
          />
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={pageItems}
        loading={loading}
        rowKey={(r) => r.number_id ?? r.e164_number}
        empty="No numbers yet. Connect a provider account, then sync its numbers."
      />

      <Pagination total={total} limit={pageSize} offset={offset} onChange={setOffset} />

      <p className="mt-4 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
        Place a call dials from the number pinned in <code className="font-mono">VITE_TELEPHONY_ID</code>,
        or from the first outbound-enabled number here when that is not set. You can pick a different
        one per call.
      </p>

      <ConfirmDialog
        open={Boolean(releasing)}
        busy={busy}
        title="Release number"
        confirmLabel="Release"
        message={`${releasing?.e164_number ?? 'This number'} will be released back to the provider. This cannot be undone and the number may not be reclaimable.`}
        onClose={() => setReleasing(null)}
        onConfirm={handleRelease}
      />
    </PageShell>
  )
}
