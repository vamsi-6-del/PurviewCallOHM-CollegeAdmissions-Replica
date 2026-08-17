import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Upload, Download, Pencil, Trash2, PhoneCall, ChevronLeft, Users, Columns3, Plus, X,
} from 'lucide-react'
import {
  listContacts, searchContacts, createContact, updateContact, deleteContact,
  downloadTemplate, uploadContacts, getTemplateSchema, setTemplateSchema,
} from '../../api/resources/contacts'
import { listCategories } from '../../api/resources/catalog'
import { can } from '../../api/permissions'
import {
  PageShell, PageHeader, PrimaryButton, GhostButton, DataTable, Pagination,
  Drawer, ConfirmDialog, Banner, SearchBox, TextField, SelectField, Badge,
} from '../../components/resource/ResourceKit'
import { CountryCodeField } from '../../components/resource/CountryCodeField'
import { formatPhone, nationalDigits, phoneKey, toE164 } from '../../utils/phone'
import { validatePhoneNumberForCountry } from '../../utils/countryCodes'
import { useDialCodes } from '../../hooks/useDialCodes'
import { formatDate, formatDateTime } from '../../utils/datetime'

const LIMIT = 20

const DISPOSITION_TONE = {
  interested: 'success',
  enrolled: 'success',
  converted: 'success',
  callback: 'warning',
  follow_up: 'warning',
  not_interested: 'danger',
  wrong_number: 'danger',
  dnd: 'danger',
}

/**
 * The contacts inside one category, reached from the category grid.
 *
 * The backend models contacts per category — /contacts requires a category_id,
 * and the import template is generated from that category's fields — so the
 * category comes from the route rather than a picker.
 */
export default function ContactsListPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(null)
  const [customFields, setCustomFields] = useState([])
  const dialCodes = useDialCodes()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [fieldsOpen, setFieldsOpen] = useState(false)
  const fileInputRef = useRef(null)

  const editable = can.manageContacts()
  const searching = Boolean(search.trim())

  /**
   * The redundant copies — the rows to delete, not merely the later ones.
   *
   * An import whose phone column already carried the dialing prefix stores
   * "919848998032" while the same person entered cleanly is stored as
   * "9848998032". The backend sees two different strings, so both rows exist.
   * This is the management view, so both stay listed and deletable: hiding one
   * would leave the user unable to clean it up, and it would still be there in
   * the next export.
   *
   * Which one to keep is decided by how it is stored, not by which came first.
   * Marking "the second row" flags the clean record whenever the malformed one
   * happens to sort above it — pointing the user at exactly the wrong delete.
   * Scoped to the loaded page: a twin on page 2 is not visible from here.
   */
  const redundantRowIds = useMemo(() => markRedundant(rows), [rows])

  const load = useCallback(async () => {
    if (!categoryId) return
    setLoading(true)
    setError('')
    try {
      // /contacts pages through a category; /contacts/search filters by name
      // but has no offset, so searching drops pagination.
      let data
      if (search.trim()) data = await searchContacts({ categoryId, name: search.trim(), size: 200 })
      else data = await listContacts({ categoryId, limit: LIMIT, offset })
      setRows(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e.message || 'Could not load contacts.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [categoryId, offset, search])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])


  // The category's own record, for the page title.
  useEffect(() => {
    listCategories()
      .then((d) => setCategory(
        d.items.find((c) => (c.categoryID ?? c.category_id) === categoryId) ?? null,
      ))
      .catch(() => setCategory(null))
  }, [categoryId])

  // Custom columns are defined per category.
  const loadFields = useCallback(async () => {
    if (!categoryId) { setCustomFields([]); return }
    try {
      const res = await getTemplateSchema(categoryId)
      setCustomFields(Array.isArray(res) ? res : (res?.fields ?? res?.items ?? []))
    } catch {
      setCustomFields([])
    }
  }, [categoryId])

  useEffect(() => { loadFields() }, [loadFields])

  async function handleSave(form) {
    setBusy(true)
    setError('')
    try {
      // Store the subscriber number without the prefix, whatever was typed or
      // pasted: "+91" plus "917659042468" is the same person as "+91" plus
      // "7659042468", and storing both spellings is what put duplicate rows in
      // this list to begin with.
      const phoneNumber = nationalDigits(form.countryCode, form.phoneNumber) || form.phoneNumber.trim()

      // A new contact whose number already exists is refused rather than added
      // as a second row. The shared create helper enforces the same guard for
      // any other create flow, so a duplicate cannot escape through a different
      // path even when the page-level check is bypassed.
      if (!editing?.customerID) {
        const existing = await searchContacts({
          categoryId,
          phoneNumber: toE164(form.countryCode, phoneNumber),
        }).catch(() => ({ items: [] }))

        const key = phoneKey(form.countryCode, phoneNumber)
        const clash = existing.items.find((c) => phoneKey(c.countryCode, c.phoneNumber) === key)
        if (clash) {
          setError(`${clash.contactName || 'A contact'} already has ${formatPhone(form.countryCode, phoneNumber)}.`)
          return
        }
      }

      const payload = {
        contactName: form.contactName,
        countryCode: form.countryCode,
        phoneNumber,
        categoryID: categoryId,
        ...(Object.keys(form.custom_fields || {}).length ? { custom_fields: form.custom_fields } : {}),
      }
      if (editing?.customerID) await updateContact(editing.customerID, payload)
      else await createContact(payload)
      setEditing(null)
      await load()
    } catch (e) {
      setError(e.message || 'Could not save the contact.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await deleteContact(deleting.customerID)
      setDeleting(null)
      await load()
    } catch (e) {
      setError(e.message || 'Could not delete the contact.')
    } finally {
      setBusy(false)
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const result = await uploadContacts({ categoryId, file })
      setSuccess(`Imported ${result?.created ?? result?.inserted ?? 0} contacts.`)
      await load()
    } catch (e) {
      setError(e.message || 'Import failed.')
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleTemplate() {
    try {
      const blob = await downloadTemplate({ categoryId, format: 'excel' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'contacts_template.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message || 'Could not download the template.')
    }
  }

  // One column per template column, in template order: the three built-in
  // fields, then the category's custom fields. The name and phone were merged
  // into a single cell before, which read well but did not match the
  // spreadsheet people import from.
  const columns = [
    {
      key: 'contactName',
      header: 'Name',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-medium">{row.contactName || '—'}</p>
          {redundantRowIds.has(row.customerID)
            ? <Badge tone="warning">Duplicate of above</Badge>
            : null}
        </div>
      ),
    },
    {
      key: 'countryCode',
      header: 'Country code',
      render: (row) => (
        <span className="ui-mono text-[12px]">{row.countryCode || '—'}</span>
      ),
    },
    {
      key: 'phoneNumber',
      header: 'Phone number',
      /*
       * The subscriber number, with what is actually stored underneath it when
       * the two differ.
       *
       * A row imported with the dialing prefix inside the number column is
       * stored as "919848998032" while its twin holds "9848998032". Showing
       * only the normalised form makes those two rows look like the same
       * record saved twice — which is why a duplicate that nobody imported
       * twice looks inexplicable. The raw value is what the backend deduped
       * on, so it is what explains the pair.
       */
      render: (row) => {
        const shown = nationalDigits(row.countryCode, row.phoneNumber)
        const raw = String(row.phoneNumber ?? '').trim()
        return (
          <div className="min-w-0">
            <span className="ui-mono text-[12px]">{shown || '—'}</span>
            {shown && raw && raw !== shown ? (
              <p className="ui-mono mt-0.5 text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
                stored as {raw}
              </p>
            ) : null}
          </div>
        )
      },
    },
    ...customFields.slice(0, 3).map((field) => {
      const key = fieldKey(field)
      return {
        key,
        header: field.label ?? key,
        render: (row) => row.custom_fields?.[key] ?? '—',
      }
    }),
    ...(editable ? [{
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <GhostButton icon={Pencil} onClick={() => setEditing(row)}>Edit</GhostButton>
          <GhostButton icon={Trash2} onClick={() => setDeleting(row)}>Delete</GhostButton>
        </div>
      ),
    }] : []),
  ]

  const categoryName = category?.categoryName ?? category?.category_name

  return (
    <PageShell>
      <Link
        to="/app/contacts"
        className="mb-4 inline-flex items-center gap-1 text-[12.5px] font-semibold"
        style={{ color: 'var(--ui-text-3)' }}
      >
        <ChevronLeft size={14} /> All categories
      </Link>

      <PageHeader
        icon={Users}
        title={categoryName || 'Contacts'}
        subtitle={total
          ? `${total} contact${total === 1 ? '' : 's'} in this category`
          : 'People your agents can call'}
        action={editable ? (
          <div className="flex flex-wrap items-center gap-2">
            <GhostButton icon={Columns3} onClick={() => setFieldsOpen(true)}>Fields</GhostButton>
            <GhostButton icon={Download} onClick={handleTemplate}>Template</GhostButton>
            <GhostButton icon={Upload} busy={busy} onClick={() => fileInputRef.current?.click()}>Import</GhostButton>
            <PrimaryButton onClick={() => setEditing({ contactName: '', countryCode: '+91', phoneNumber: '' })}>
              New contact
            </PrimaryButton>
          </div>
        ) : null}
      />

      <input ref={fileInputRef} type="file" accept=".csv,.xlsx" hidden onChange={handleUpload} />

      <Banner onDismiss={() => setError('')}>{error}</Banner>
      {success ? <Banner tone="success" onDismiss={() => setSuccess('')}>{success}</Banner> : null}

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchBox value={search} onChange={setSearch} placeholder="Search contacts by name..." />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(r) => r.customerID}
        onRowClick={(r) => navigate(`/app/contacts/${categoryId}/${r.customerID}`)}
        empty={searching ? 'No contacts match that search.' : 'No contacts in this category yet.'}
      />

      {!searching ? <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} hasMore={rows.length >= LIMIT} /> : null}

      <FieldsDrawer
        open={fieldsOpen}
        categoryId={categoryId}
        fields={customFields}
        onClose={() => setFieldsOpen(false)}
        onSaved={async () => { setFieldsOpen(false); await loadFields(); await load() }}
        onError={setError}
      />

      <ContactDrawer
        contact={editing}
        busy={busy}
        dialCodes={dialCodes}
        customFields={customFields}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        busy={busy}
        title="Delete contact"
        message={`${deleting?.contactName || 'This contact'} will be permanently removed.`}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </PageShell>
  )
}

/**
 * A number stored with its own dialing prefix baked in — "919848998032" under
 * country code "+91". Dialable either way, but it is a different string to the
 * backend, which is how one person ends up stored twice.
 */
function isPrefixBaked(row) {
  const raw = String(row?.phoneNumber ?? '').trim()
  const national = nationalDigits(row?.countryCode, row?.phoneNumber)
  return Boolean(raw && national && raw !== national)
}

/**
 * Group contacts by the number they actually dial to, and decide which row of
 * each group survives.
 *
 * The keeper is the cleanly stored row — the one whose number holds no baked-in
 * prefix — because that is the record every other part of the app writes and
 * expects. Only when a group is entirely clean (or entirely malformed) does
 * "the first one" decide it.
 */
function duplicateGroups(list = []) {
  const byNumber = new Map()
  for (const row of list) {
    const key = phoneKey(row?.countryCode, row?.phoneNumber)
    if (!key) continue
    if (!byNumber.has(key)) byNumber.set(key, [])
    byNumber.get(key).push(row)
  }

  const groups = []
  for (const [key, members] of byNumber) {
    if (members.length < 2) continue
    const keep = members.find((row) => !isPrefixBaked(row)) ?? members[0]
    groups.push({ key, keep, remove: members.filter((row) => row !== keep) })
  }
  return groups
}

/** The customer ids that `duplicateGroups` would delete. */
function markRedundant(list = []) {
  const ids = new Set()
  for (const group of duplicateGroups(list)) {
    for (const row of group.remove) ids.add(row.customerID)
  }
  return ids
}

/**
 * The key a custom field's value is stored under in `custom_fields`.
 *
 * The template route derives it from the label and returns it as `key`, so that
 * is read first; the other names are older shapes the same route has returned.
 */
const fieldKey = (field) => field?.key ?? field?.name ?? field?.field_name ?? ''

/**
 * The three columns every contact has regardless of category.
 *
 * They are hard-coded because the backend treats them as fixed: `ContactCreate`
 * names them explicitly and the template-schema route covers only the custom
 * fields beyond them. They are shown, and cannot be edited or removed.
 */
const FIXED_FIELDS = [
  { key: 'contactName', label: 'Name', type: 'text', required: true },
  { key: 'countryCode', label: 'Country code', type: 'text', required: true },
  { key: 'phoneNumber', label: 'Phone number', type: 'text', required: true },
]

/** The only types /contacts/template-schema accepts. */
const FIELD_TYPES = [
  { id: 'text', label: 'Text' },
  { id: 'number', label: 'Number' },
  { id: 'date', label: 'Date' },
]

/**
 * The extra columns this category carries.
 *
 * These drive three things at once — the contact form's "Category fields", the
 * table's extra columns, and the import template's headers — so renaming a
 * field here is not cosmetic: existing contacts keep their values under the old
 * key, which is why the name is fixed once a field has been saved.
 */
function FieldsDrawer({ open, categoryId, fields, onClose, onSaved, onError }) {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setRows(fields.map((field) => {
      const key = fieldKey(field)
      return {
        key,
        label: field.label ?? key,
        // The route accepts text | date | number. Anything else it ever
        // returns — an older "string", a "boolean" — reads as text.
        type: FIELD_TYPES.some((t) => t.id === field.type) ? field.type : 'text',
        required: Boolean(field.required),
        existing: true,
      }
    }))
  }, [open, fields])

  function update(index, patch) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  async function save() {
    setBusy(true)
    try {
      // `order` is the position in this list, so reordering here reorders the
      // template columns. The key is derived from the label server-side and is
      // deliberately not sent.
      await setTemplateSchema(
        categoryId,
        rows
          .filter((row) => row.label.trim())
          .map((row, index) => ({
            label: row.label.trim(),
            type: row.type || 'text',
            required: Boolean(row.required),
            order: index,
          })),
      )
      onSaved()
    } catch (e) {
      onError(e.message || 'Could not save the fields.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Category fields"
      subtitle={categoryId}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton icon={Columns3} busy={busy} onClick={save}>Save fields</PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ui-text-2)' }}>
          Every contact carries the three built-in fields below. Anything you add here is stored
          alongside them, and becomes a column in the import template and a field on the contact form.
        </p>

        {/*
          The template route only knows about *custom* fields — the three fixed
          ones are implicit and never come back from it. They are still columns
          in the downloaded template, so listing them here (locked) is the only
          way this drawer matches the spreadsheet it describes.
        */}
        <div>
          <p className="ui-label mb-2">Built in</p>
          <div className="grid gap-1.5">
            {FIXED_FIELDS.map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                style={{ background: 'var(--ui-surface-2)', border: '1px solid var(--ui-border)' }}
              >
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium" style={{ color: 'var(--ui-text)' }}>
                    {field.label}
                  </p>
                  <p className="ui-mono truncate text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
                    {field.key}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge tone="neutral">{field.type}</Badge>
                  {field.required ? <Badge tone="info">Required</Badge> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="ui-label">Custom</p>

        {rows.length ? (
          <div className="grid gap-3">
            {rows.map((row, index) => (
              <div key={index} className="ui-card grid gap-2 p-3">
                <TextField
                  label="Label"
                  value={row.label}
                  placeholder="Course of interest"
                  onChange={(v) => update(index, { label: v })}
                />
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div className="w-40">
                    <SelectField
                      label="Type"
                      value={row.type}
                      onChange={(v) => update(index, { type: v })}
                      placeholder="Text"
                      options={FIELD_TYPES}
                    />
                  </div>
                  <label className="flex items-center gap-2 pb-2.5 text-[12.5px]" style={{ color: 'var(--ui-text-2)' }}>
                    <input
                      type="checkbox"
                      checked={row.required}
                      onChange={(e) => update(index, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    className="ui-btn"
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <X size={13} /> Remove
                  </button>
                </div>
                {row.existing ? (
                  <p className="text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
                    Stored as
                    {' '}
                    <span className="ui-mono">{row.key || '—'}</span>
                    . Renaming the label starts a new column: values already saved stay under the old
                    name. Removing the field hides it from the form and template without deleting
                    what contacts already hold.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px]" style={{ color: 'var(--ui-text-3)' }}>
            No custom fields for this category yet.
          </p>
        )}

        <button
          type="button"
          className="ui-btn w-full"
          onClick={() => setRows((prev) => [...prev, { key: '', label: '', type: 'text', required: false, existing: false }])}
        >
          <Plus size={14} /> Add a field
        </button>
      </div>
    </Drawer>
  )
}

function ContactDrawer({ contact, onClose, onSave, busy, dialCodes, customFields }) {
  const [form, setForm] = useState({ contactName: '', countryCode: '', phoneNumber: '', custom_fields: {} })

  useEffect(() => {
    if (!contact) return
    setForm({
      contactName: contact.contactName ?? '',
      countryCode: contact.countryCode ?? '+91',
      phoneNumber: contact.phoneNumber ?? '',
      custom_fields: contact.custom_fields ?? {},
    })
  }, [contact])

  function set(key, value) { setForm((p) => ({ ...p, [key]: value })) }
  function setCustom(key, value) {
    setForm((p) => ({ ...p, custom_fields: { ...p.custom_fields, [key]: value } }))
  }

  const normalized = nationalDigits(form.countryCode, form.phoneNumber)
  // Validated against the number as it will be stored, so a pasted "+91…"
  // is not reported as two digits too long.
  const check = validatePhoneNumberForCountry({
    phoneNumber: normalized,
    dialCode: form.countryCode,
  })
  const touched = form.phoneNumber.trim().length > 0
  const valid = form.contactName.trim() && form.countryCode.trim() && check.isValid

  return (
    <Drawer
      open={Boolean(contact)}
      onClose={onClose}
      title={contact?.customerID ? 'Edit contact' : 'New contact'}
      subtitle={contact?.customerID}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton icon={PhoneCall} busy={busy} disabled={!valid} onClick={() => onSave(form)}>
            Save contact
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <TextField label="Name" value={form.contactName} onChange={(v) => set('contactName', v)} autoFocus />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[210px_1fr]">
          <CountryCodeField
            value={form.countryCode}
            onChange={(v) => set('countryCode', v)}
            options={dialCodes}
          />
          <div>
            <TextField
              label="Phone number"
              value={form.phoneNumber}
              onChange={(v) => set('phoneNumber', v)}
              inputMode="tel"
            />
            {/* One line under the field, in priority order: the problem if the
                number is wrong, otherwise what will actually be stored when the
                typed number differs from it. Errors only after something has
                been typed, so an untouched field is not scolded. */}
            {touched && !check.isValid ? (
              <p className="mt-1.5 text-[11px]" style={{ color: '#e11d48' }}>{check.message}</p>
            ) : normalized && normalized !== form.phoneNumber.trim() ? (
              <p className="mt-1.5 text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
                Saved as {formatPhone(form.countryCode, normalized)}
              </p>
            ) : null}
          </div>
        </div>

        {customFields.length ? (
          <div className="grid gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ui-text-3)' }}>
              Category fields
            </p>
            {customFields.map((field) => {
              const key = fieldKey(field)
              return (
                <TextField
                  key={key}
                  label={field.label ?? key}
                  // `date` and `number` get the matching input so the value
                  // stored matches the type the template declares.
                  type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                  required={Boolean(field.required)}
                  value={form.custom_fields?.[key] ?? ''}
                  onChange={(v) => setCustom(key, v)}
                />
              )
            })}
          </div>
        ) : null}
      </div>
    </Drawer>
  )
}
