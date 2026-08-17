import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PhoneCall, Search, ShoppingCart, ChevronLeft, Loader2 } from 'lucide-react'
import { searchAvailableNumbers, quoteNumber, buyNumber } from '../../api/resources/billing'
import { can } from '../../api/permissions'
import {
  PageShell, PageHeader, GhostButton, PrimaryButton, DataTable, Pagination,
  Drawer, Banner, Badge, TextField, SelectField,
} from '../../components/resource/ResourceKit'

const LIMIT = 20

/** ISO codes the platform's providers commonly sell in. */
const COUNTRIES = [
  { id: 'IN', label: 'India' },
  { id: 'US', label: 'United States' },
  { id: 'GB', label: 'United Kingdom' },
  { id: 'AE', label: 'United Arab Emirates' },
  { id: 'SG', label: 'Singapore' },
  { id: 'AU', label: 'Australia' },
]

/**
 * Search the provider's inventory and buy a number.
 *
 * Buying spends real money, so the flow is search → quote → confirm: the quote
 * is fetched for the specific number and shown before the purchase call, never
 * assumed from a list price.
 */
export default function BuyNumberPage() {
  const [filters, setFilters] = useState({ countryIso: 'IN', type: '', pattern: '' })
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [buying, setBuying] = useState(null)

  const editable = can.manageTelephony()

  async function search(nextOffset = 0) {
    setLoading(true)
    setError('')
    setSearched(true)
    try {
      const data = await searchAvailableNumbers({
        countryIso: filters.countryIso || undefined,
        type: filters.type || undefined,
        pattern: filters.pattern.trim() || undefined,
        limit: LIMIT,
        offset: nextOffset,
      })
      setRows(data.items)
      setTotal(data.total)
      setOffset(nextOffset)
    } catch (e) {
      setError(e.message || 'Could not search for numbers.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      key: 'number',
      header: 'Number',
      render: (r) => (
        <span className="ui-mono text-[13px] font-medium">{r.e164_number ?? r.number ?? r.phone_number ?? '—'}</span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (r) => [r.city, r.region, r.country_iso].filter(Boolean).join(', ') || '—',
    },
    { key: 'number_type', header: 'Type', render: (r) => r.number_type ?? r.type ?? '—' },
    {
      key: 'capabilities',
      header: 'Capabilities',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.voice_enabled ?? r.voice ? <Badge tone="info">Voice</Badge> : null}
          {r.sms_enabled ?? r.sms ? <Badge tone="info">SMS</Badge> : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          {editable ? (
            <GhostButton icon={ShoppingCart} onClick={() => setBuying(row)}>Buy</GhostButton>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <PageShell>
      <Link
        to="/app/telephony"
        className="mb-4 inline-flex items-center gap-1 text-[12.5px] font-semibold"
        style={{ color: 'var(--ui-text-3)' }}
      >
        <ChevronLeft size={14} /> Telephony numbers
      </Link>

      <PageHeader
        icon={PhoneCall}
        title="Buy a number"
        subtitle="Search your provider's inventory and provision a new line"
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>
      {success ? <Banner tone="success" onDismiss={() => setSuccess('')}>{success}</Banner> : null}

      {!editable ? (
        <Banner>Buying numbers requires a company admin.</Banner>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-48">
          <SelectField
            label="Country"
            value={filters.countryIso}
            onChange={(v) => setFilters((p) => ({ ...p, countryIso: v }))}
            placeholder="Any country"
            options={COUNTRIES}
          />
        </div>
        <div className="w-full sm:w-40">
          <SelectField
            label="Type"
            value={filters.type}
            onChange={(v) => setFilters((p) => ({ ...p, type: v }))}
            placeholder="Any type"
            options={[
              { id: 'local', label: 'Local' },
              { id: 'mobile', label: 'Mobile' },
              { id: 'toll_free', label: 'Toll free' },
            ]}
          />
        </div>
        <div className="w-full sm:w-44">
          <TextField
            label="Pattern"
            value={filters.pattern}
            onChange={(v) => setFilters((p) => ({ ...p, pattern: v }))}
            placeholder="e.g. 900"
          />
        </div>
        <PrimaryButton icon={Search} busy={loading} onClick={() => search(0)}>Search</PrimaryButton>
      </div>

      {searched ? (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            rowKey={(r) => r.e164_number ?? r.number ?? r.phone_number}
            empty="No numbers match those filters."
          />
          <Pagination
            total={total}
            limit={LIMIT}
            offset={offset}
            onChange={search}
            hasMore={rows.length >= LIMIT}
          />
        </>
      ) : (
        <div className="ui-card ui-card-raised px-6 py-16 text-center">
          <p className="text-[13.5px]" style={{ color: 'var(--ui-text-2)' }}>
            Choose a country and search to see what is available to buy.
          </p>
        </div>
      )}

      <BuyDrawer
        number={buying}
        onClose={() => setBuying(null)}
        onError={setError}
        onBought={(label) => {
          setBuying(null)
          setSuccess(`${label} is being provisioned. It appears on the Telephony numbers page once ready.`)
          search(offset)
        }}
      />
    </PageShell>
  )
}

const numberOf = (n) => n?.e164_number ?? n?.number ?? n?.phone_number

/** Quote first, then buy — the price is never assumed from the search row. */
function BuyDrawer({ number, onClose, onError, onBought }) {
  const [quote, setQuote] = useState(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [busy, setBusy] = useState(false)

  const value = numberOf(number)

  async function loadQuote() {
    setLoadingQuote(true)
    setQuote(null)
    try {
      setQuote(await quoteNumber(value))
    } catch (e) {
      onError(e.message || 'Could not fetch a price for this number.')
    } finally {
      setLoadingQuote(false)
    }
  }

  async function confirm() {
    setBusy(true)
    try {
      await buyNumber(value)
      onBought(value)
    } catch (e) {
      onError(e.message || 'Could not buy this number.')
    } finally {
      setBusy(false)
    }
  }

  const priceRows = quote && typeof quote === 'object' ? Object.entries(quote) : []

  return (
    <Drawer
      open={Boolean(number)}
      onClose={onClose}
      title="Buy this number"
      subtitle={value}
      width="max-w-md"
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton icon={ShoppingCart} busy={busy} onClick={confirm}>Confirm purchase</PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ui-text-2)' }}>
          Buying charges your provider account and, depending on the country, may require
          regulatory documents before the number goes live.
        </p>

        {priceRows.length ? (
          <dl className="ui-card grid gap-2 p-4">
            {priceRows.map(([key, item]) => (
              <div key={key} className="flex items-start justify-between gap-3">
                <dt className="ui-label shrink-0 pt-0.5">{key.replace(/[_-]+/g, ' ')}</dt>
                <dd className="ui-mono min-w-0 break-all text-right text-[12px]" style={{ color: 'var(--ui-text)' }}>
                  {item === null || item === undefined || item === ''
                    ? '—'
                    : typeof item === 'object' ? JSON.stringify(item) : String(item)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <button type="button" className="ui-btn w-full" onClick={loadQuote} disabled={loadingQuote}>
            {loadingQuote ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Get price
          </button>
        )}
      </div>
    </Drawer>
  )
}
