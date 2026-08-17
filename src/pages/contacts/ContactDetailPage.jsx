import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, User, PhoneOutgoing, Phone } from 'lucide-react'
import { listContacts, getTemplateSchema } from '../../api/resources/contacts'
import { listCategories } from '../../api/resources/catalog'
import { filterCallHistory } from '../../api/resources/calls'
import { fetchAllPages } from '../../api/resources/http'
import {
  PageShell, PageHeader, GhostButton, DataTable, Banner, Badge, Pagination,
} from '../../components/resource/ResourceKit'
import { formatPhone } from '../../utils/phone'
import { useClientPagination } from '../../hooks/useClientPagination'
import { formatDateTime } from '../../utils/datetime'

const STATUS_TONE = {
  completed: 'success',
  failed: 'danger',
  'no-answer': 'warning',
  busy: 'warning',
  canceled: 'neutral',
}

/**
 * One contact, with every call placed to them.
 *
 * There is no GET /contacts/{id} on this backend, so the record is found by
 * paging the category it belongs to — bounded by fetchAllPages so a large
 * category cannot spin. Call history is matched on the phone number, which is
 * what call records actually carry.
 */
export default function ContactDetailPage() {
  const { categoryId, contactId } = useParams()

  const [contact, setContact] = useState(null)
  const [category, setCategory] = useState(null)
  const [fields, setFields] = useState([])
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingCalls, setLoadingCalls] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { items } = await fetchAllPages(
        ({ limit, offset }) => listContacts({ categoryId, limit, offset }),
      )
      const found = items.find((c) => c.customerID === contactId) ?? null
      setContact(found)
      if (!found) setError('This contact is no longer in the category.')
    } catch (e) {
      setError(e.message || 'Could not load this contact.')
    } finally {
      setLoading(false)
    }
  }, [categoryId, contactId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    listCategories()
      .then((d) => setCategory(
        d.items.find((c) => (c.categoryID ?? c.category_id) === categoryId) ?? null,
      ))
      .catch(() => setCategory(null))
    getTemplateSchema(categoryId)
      .then((res) => setFields(Array.isArray(res) ? res : (res?.fields ?? res?.items ?? [])))
      .catch(() => setFields([]))
  }, [categoryId])

  // Call history is keyed by phone number, so it can only be fetched once the
  // contact record has arrived.
  useEffect(() => {
    const phone = contact?.phoneNumber
    if (!phone) return
    setLoadingCalls(true)
    filterCallHistory({ phoneNumber: phone, limit: 50 })
      .then((d) => setCalls(d.items))
      .catch(() => setCalls([]))
      .finally(() => setLoadingCalls(false))
  }, [contact?.phoneNumber])

  const columns = [
    {
      key: 'started_at',
      header: 'When',
      render: (r) => {
        const at = r.start_time ?? r.created_at ?? r.call_date
        return formatDateTime(at)
      },
    },
    { key: 'agent_name', header: 'Agent', render: (r) => r.agent_name ?? r.agentName ?? '—' },
    {
      key: 'call_status',
      header: 'Status',
      render: (r) => {
        const status = r.call_status ?? r.status
        return status ? <Badge tone={STATUS_TONE[status] || 'neutral'}>{status}</Badge> : '—'
      },
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (r) => {
        const secs = Number(r.duration ?? r.call_duration)
        if (!Number.isFinite(secs) || secs <= 0) return '—'
        return `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}`
      },
    },
  ]

  // /call-history/filters is fetched in one 50-row request here, so the pager
  // over that list is client-side.
  const { offset, setOffset, total, pageItems, pageSize } = useClientPagination(calls, 10)

  const phone = formatPhone(contact?.countryCode, contact?.phoneNumber)
  const categoryName = category?.categoryName ?? category?.category_name

  return (
    <PageShell>
      <Link
        to={`/app/contacts/${categoryId}`}
        className="mb-4 inline-flex items-center gap-1 text-[12.5px] font-semibold"
        style={{ color: 'var(--ui-text-3)' }}
      >
        <ChevronLeft size={14} /> {categoryName || 'Contacts'}
      </Link>

      <PageHeader
        icon={User}
        title={loading ? 'Loading…' : (contact?.contactName || 'Contact')}
        subtitle={phone || contactId}
        action={contact ? (
          <Link to="/app/calls/new" className="ui-btn-primary">
            <PhoneOutgoing size={15} />
            Place a call
          </Link>
        ) : null}
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>

      {contact ? (
        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <section className="ui-card p-5">
            <h2 className="ui-h2 mb-4">Details</h2>
            <dl className="grid gap-3">
              <Row label="Name" value={contact.contactName} />
              <Row label="Phone" value={phone} mono />
              <Row label="Category" value={categoryName} />
              <Row label="Contact ID" value={contact.customerID} mono />
              {fields.map((field) => {
                // `key` first: the template route derives it from the label and
                // it is what `custom_fields` is keyed by.
                const key = field.key ?? field.name ?? field.field_name
                return (
                  <Row
                    key={key}
                    label={field.label ?? key}
                    value={contact.custom_fields?.[key]}
                  />
                )
              })}
            </dl>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Phone size={14} style={{ color: 'var(--ui-text-3)' }} />
              <h2 className="ui-h2">Call history</h2>
              {calls.length ? <Badge>{calls.length}</Badge> : null}
            </div>
            <DataTable
              columns={columns}
              rows={pageItems}
              loading={loadingCalls}
              rowKey={(r) => r.callID ?? r.call_id ?? r.call_sid}
              empty="No calls to this contact yet."
            />

            <Pagination total={total} limit={pageSize} offset={offset} onChange={setOffset} />
          </section>
        </div>
      ) : null}

      {!loading && !contact ? (
        <GhostButton icon={ChevronLeft} onClick={() => window.history.back()}>Go back</GhostButton>
      ) : null}
    </PageShell>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="ui-label shrink-0 pt-0.5">{label}</dt>
      <dd
        className={`min-w-0 break-all text-right text-[12.5px] ${mono ? 'ui-mono' : ''}`}
        style={{ color: 'var(--ui-text)' }}
      >
        {value || '—'}
      </dd>
    </div>
  )
}
