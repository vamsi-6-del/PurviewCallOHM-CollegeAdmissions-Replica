import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plug, Trash2, RefreshCw, ChevronLeft, Link2 } from 'lucide-react'
import {
  listProviderAccounts, listServiceProviders, getCredentialSchemas,
  createProviderAccount, deleteProviderAccount, connectTelephony, syncProviderNumbers,
} from '../../api/resources/billing'
import { can } from '../../api/permissions'
import {
  PageShell, PageHeader, PrimaryButton, GhostButton, CardGrid, Drawer,
  Pagination,
  ConfirmDialog, Banner, TextField, SelectField, Badge,
} from '../../components/resource/ResourceKit'
import { useClientPagination } from '../../hooks/useClientPagination'

/**
 * Telephony provider accounts — the Twilio/Plivo/Exotel credentials a company
 * connects before it owns any numbers.
 *
 * This is the first step of telephony setup: without an account here, the
 * numbers page has nothing to sync from and no outbound call can be placed.
 *
 * Credential fields are not hardcoded. Every provider wants a different set
 * (Twilio takes an account SID and auth token, Plivo an auth ID and token), so
 * the form is generated from /provider-accounts/credential-schemas.
 */

/* ── provider + schema shape normalisation ──────────────────────────────── */

const providerId = (p) => p?.provider_id ?? p?.id ?? p?.providerID
const providerName = (p) => p?.provider_name ?? p?.name ?? p?.label ?? p?.provider_key ?? '—'
/** The key a credential schema is filed under — not always the UUID. */
const providerKey = (p) => (p?.provider_key ?? p?.code ?? p?.slug ?? p?.provider_name ?? p?.name ?? '')
  .toString().toLowerCase()

/**
 * Turn one provider's credential schema into a field list.
 *
 * The endpoint's response shape is not documented, so accept the three forms
 * it could plausibly take — a JSON Schema object, an array of field
 * definitions, or a flat name→type map — rather than render an empty form.
 */
function normalizeFields(schema) {
  if (!schema) return []

  const entry = Array.isArray(schema) ? schema : (schema.fields ?? schema.properties ?? schema)
  if (!entry || typeof entry !== 'object') return []

  const required = new Set(
    Array.isArray(schema?.required) ? schema.required : [],
  )

  const toField = (name, def = {}) => {
    const spec = typeof def === 'object' && def !== null ? def : {}
    return {
      name,
      label: spec.title ?? spec.label ?? prettify(name),
      required: spec.required ?? required.has(name),
      secret: Boolean(spec.secret ?? spec.write_only ?? spec.writeOnly ?? /token|secret|password|key/i.test(name)),
      placeholder: spec.example ?? spec.placeholder ?? '',
    }
  }

  if (Array.isArray(entry)) {
    return entry
      .map((f) => (typeof f === 'string' ? toField(f) : toField(f.name ?? f.key ?? f.field, f)))
      .filter((f) => f.name)
  }

  return Object.entries(entry).map(([name, def]) => toField(name, def))
}

function prettify(name) {
  return String(name)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bSid\b/, 'SID')
    .replace(/\bId\b/, 'ID')
    .replace(/\bUrl\b/, 'URL')
}

/** Pick the schema belonging to a provider, whatever it is keyed by. */
function schemaFor(schemas, provider) {
  if (!schemas || !provider) return null
  const key = providerKey(provider)
  const id = providerId(provider)

  if (Array.isArray(schemas)) {
    return schemas.find((s) => {
      const candidates = [s.provider_key, s.provider_name, s.provider, s.name, s.provider_id]
      return candidates.some((c) => c && String(c).toLowerCase() === key)
        || candidates.some((c) => c && c === id)
    }) ?? null
  }

  if (typeof schemas === 'object') {
    const direct = schemas[key] ?? schemas[id] ?? schemas[providerName(provider)]
    if (direct) return direct
    const hit = Object.entries(schemas).find(([k]) => k.toLowerCase() === key)
    if (hit) return hit[1]
    // Some responses nest the map one level down.
    const nested = schemas.schemas ?? schemas.credential_schemas
    if (nested && nested !== schemas) return schemaFor(nested, provider)
  }

  return null
}

/* ── page ───────────────────────────────────────────────────────────────── */

export default function ProviderAccountsPage() {
  const [rows, setRows] = useState([])
  // This route returns the whole list, so the pager slices it client-side.
  const { offset, setOffset, total, pageItems, pageSize } = useClientPagination(rows)
  const [providers, setProviders] = useState([])
  const [schemas, setSchemas] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const editable = can.manageTelephony()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listProviderAccounts()
      setRows(data.items)
    } catch (e) {
      setError(e.message || 'Could not load provider accounts.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!editable) return
    // The provider list covers every domain the platform integrates; only the
    // telephony ones can back a phone number.
    listServiceProviders({ activeOnly: true })
      .then((data) => setProviders(data.items))
      .catch(() => setProviders([]))
    getCredentialSchemas().then(setSchemas).catch(() => setSchemas(null))
  }, [editable])

  const telephonyProviders = useMemo(() => {
    const domainOf = (p) => (p.provider_domain ?? p.domain ?? p.type ?? '').toString().toLowerCase()
    const telephony = providers.filter((p) => domainOf(p).includes('telephon'))
    // If the field is absent the list is not domain-tagged — show everything
    // rather than an empty picker.
    return telephony.length ? telephony : providers
  }, [providers])

  async function handleCreate(form) {
    setBusy(true)
    setError('')
    try {
      const created = await createProviderAccount({
        provider_id: form.providerId,
        label: form.label,
        credentials: form.credentials,
      })
      const id = created?.provider_account_id ?? created?.id

      // Creating the account records the credentials; connect-telephony is what
      // makes it the account numbers are provisioned against. If that second
      // step fails the account still exists, so the card offers a retry rather
      // than leaving a half-finished setup behind.
      try {
        if (id) await connectTelephony({ provider_account_id: id })
      } catch {
        setSuccess('Account saved. Use "Connect" on the card to finish linking it to telephony.')
      }

      setConnecting(false)
      await load()
    } catch (e) {
      setError(e.message || 'Could not connect the provider.')
    } finally {
      setBusy(false)
    }
  }

  async function handleConnect(account) {
    setBusy(true)
    setError('')
    try {
      await connectTelephony({ provider_account_id: accountId(account) })
      setSuccess('Provider connected to telephony.')
      await load()
    } catch (e) {
      setError(e.message || 'Could not connect this account to telephony.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSync(account) {
    setBusy(true)
    setError('')
    try {
      await syncProviderNumbers(accountId(account))
      setSuccess('Numbers synced. Check the Telephony numbers page.')
    } catch (e) {
      setError(e.message || 'Could not sync numbers from this provider.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await deleteProviderAccount(accountId(deleting))
      setDeleting(null)
      await load()
    } catch (e) {
      setError(e.message || 'Could not delete the provider account.')
    } finally {
      setBusy(false)
    }
  }

  const card = (row) => {
    const active = row.is_active ?? row.active ?? true
    return {
      icon: Plug,
      title: row.label ?? row.account_name ?? row.provider_name ?? 'Provider account',
      subtitle: accountId(row),
      badge: (
        <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Badge>
      ),
      meta: [
        { label: 'Provider', value: row.provider_name ?? row.provider_key ?? '—' },
        ...(row.account_sid || row.account_identifier
          ? [{ label: 'Account', value: row.account_sid ?? row.account_identifier }]
          : []),
      ],
      actions: editable ? (
        <>
          <GhostButton icon={Link2} busy={busy} onClick={() => handleConnect(row)}>Connect</GhostButton>
          <GhostButton icon={RefreshCw} busy={busy} onClick={() => handleSync(row)}>Sync numbers</GhostButton>
          <GhostButton icon={Trash2} onClick={() => setDeleting(row)}>Delete</GhostButton>
        </>
      ) : null,
    }
  }

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
        icon={Plug}
        title="Provider accounts"
        subtitle="Connect Twilio, Plivo or another provider before buying or syncing numbers"
        action={editable ? (
          <PrimaryButton onClick={() => setConnecting(true)}>Connect provider</PrimaryButton>
        ) : null}
      />

      <Pagination total={total} limit={pageSize} offset={offset} onChange={setOffset} />

      <Banner onDismiss={() => setError('')}>{error}</Banner>
      {success ? <Banner tone="success" onDismiss={() => setSuccess('')}>{success}</Banner> : null}

      <CardGrid
        rows={pageItems}
        card={card}
        loading={loading}
        rowKey={accountId}
        emptyIcon={Plug}
        empty={editable
          ? 'No provider accounts yet. Connect one to start provisioning numbers.'
          : 'No provider accounts have been connected yet.'}
        emptyAction={editable ? (
          <PrimaryButton onClick={() => setConnecting(true)}>Connect provider</PrimaryButton>
        ) : null}
      />

      <ConnectDrawer
        open={connecting}
        busy={busy}
        providers={telephonyProviders}
        schemas={schemas}
        onClose={() => setConnecting(false)}
        onSave={handleCreate}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        busy={busy}
        title="Delete provider account"
        message={`"${deleting?.label ?? deleting?.provider_name ?? 'This account'}" will be removed. Numbers provisioned through it may stop working.`}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </PageShell>
  )
}

const accountId = (a) => a?.provider_account_id ?? a?.id ?? a?.account_id

function ConnectDrawer({ open, onClose, onSave, busy, providers, schemas }) {
  const [providerIdValue, setProviderIdValue] = useState('')
  const [label, setLabel] = useState('')
  const [credentials, setCredentials] = useState({})

  useEffect(() => {
    if (!open) return
    setProviderIdValue('')
    setLabel('')
    setCredentials({})
  }, [open])

  const provider = providers.find((p) => providerId(p) === providerIdValue) ?? null
  const fields = useMemo(() => normalizeFields(schemaFor(schemas, provider)), [schemas, provider])

  /** Switching provider invalidates whatever was typed for the previous one. */
  function pickProvider(value) {
    setProviderIdValue(value)
    setCredentials({})
  }

  const missing = fields.filter((f) => f.required && !String(credentials[f.name] ?? '').trim())
  const valid = providerIdValue && label.trim() && !missing.length

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Connect a provider"
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton
            icon={Plug}
            busy={busy}
            disabled={!valid}
            onClick={() => onSave({ providerId: providerIdValue, label: label.trim(), credentials })}
          >
            Connect
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <SelectField
          label="Provider"
          value={providerIdValue}
          onChange={pickProvider}
          placeholder={providers.length ? 'Choose a provider' : 'No providers available'}
          options={providers.map((p) => ({ id: providerId(p), label: providerName(p) }))}
        />

        <TextField
          label="Label"
          value={label}
          onChange={setLabel}
          placeholder="Main Twilio account"
        />

        {providerIdValue ? (
          fields.length ? (
            <div className="grid gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ui-text-3)' }}>
                Credentials
              </p>
              {fields.map((field) => (
                <TextField
                  key={field.name}
                  label={field.required ? `${field.label} *` : field.label}
                  type={field.secret ? 'password' : 'text'}
                  autoComplete="off"
                  placeholder={field.placeholder}
                  value={credentials[field.name] ?? ''}
                  onChange={(v) => setCredentials((p) => ({ ...p, [field.name]: v }))}
                />
              ))}
            </div>
          ) : (
            <p className="text-[12.5px]" style={{ color: 'var(--ui-text-3)' }}>
              No credential fields are published for this provider. Saving will create the account
              without credentials, so you may need to add them from the provider console.
            </p>
          )
        ) : null}
      </div>
    </Drawer>
  )
}
