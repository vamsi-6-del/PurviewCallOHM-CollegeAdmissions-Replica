import { useCallback, useEffect, useState } from 'react'
import { UserCog, KeyRound, Pencil, Trash2, UserPlus } from 'lucide-react'
import {
  listUsers, registerUser, updateUser, deleteUser, listRoles, requestPasswordReset,
} from '../../api/resources/org'
import { listCompanies } from '../../api/resources/org'
import { can, isSuperAdmin, ROLE_LABELS } from '../../api/permissions'
import { getCurrentUser } from '../../api/auth/authService'
import {
  PageShell, PageHeader, PrimaryButton, GhostButton, DataTable, Pagination,
  Drawer, ConfirmDialog, Banner, Badge, TextField, SelectField,
} from '../../components/resource/ResourceKit'

const LIMIT = 20

/**
 * Role filters, per the backend's own rule on GET /users:
 *   Super admin   — company admins and agents everywhere (role_id 2/3/4)
 *   Company admin — only agents inside their company (role_id 3/4)
 * Offering role_id 2 to a company admin is rejected outright.
 */
const ROLE_FILTERS = [
  { id: '2', label: 'Company admin', superAdminOnly: true },
  { id: '3', label: 'Analytics agent' },
  { id: '4', label: 'Call agent' },
]

export default function UsersPage() {
  const me = getCurrentUser()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [roleId, setRoleId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [companies, setCompanies] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const [inviting, setInviting] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listUsers({
        limit: LIMIT,
        offset,
        roleId: roleId || undefined,
        companyId: companyId || undefined,
      })
      setRows(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e.message || 'Could not load users.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [offset, roleId, companyId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    listRoles().then((data) => setRoles(data.items)).catch(() => setRoles([]))
    if (isSuperAdmin()) {
      listCompanies().then((data) => setCompanies(data.items)).catch(() => setCompanies([]))
    }
  }, [])

  useEffect(() => {
    if (!success) return
    const id = setTimeout(() => setSuccess(''), 4000)
    return () => clearTimeout(id)
  }, [success])

  async function handleToggleActive(user) {
    setBusy(true)
    try {
      await updateUser(user.user_id, { is_active: !user.is_active })
      await load()
    } catch (e) {
      setError(e.message || 'Could not update the user.')
    } finally {
      setBusy(false)
    }
  }

  async function handleReset(user) {
    try {
      await requestPasswordReset(user.email)
      setSuccess(`Password reset email sent to ${user.email}.`)
    } catch (e) {
      setError(e.message || 'Could not send the reset email.')
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await deleteUser(deleting.user_id)
      setDeleting(null)
      await load()
    } catch (e) {
      setError(e.message || 'Could not delete the user.')
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    {
      key: 'email',
      header: 'User',
      render: (row) => {
        const name = [row.firstname, row.lastname].filter(Boolean).join(' ')
        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{name || row.email}</p>
            <p className="truncate text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>{row.email}</p>
          </div>
        )
      },
    },
    {
      key: 'role_name',
      header: 'Role',
      render: (r) => <Badge tone="info">{ROLE_LABELS[r.role_name] || r.role_name || '—'}</Badge>,
    },
    ...(isSuperAdmin() ? [{
      key: 'company_id',
      header: 'Company',
      render: (r) => {
        const company = companies.find((c) => c.companyID === r.company_id)
        return company?.companyName ?? r.company_id ?? '—'
      },
    }] : []),
    {
      key: 'is_active',
      header: 'Status',
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={r.is_active ? 'success' : 'neutral'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
          {r.email_verified === false ? <Badge tone="warning">Email unverified</Badge> : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <GhostButton icon={KeyRound} onClick={() => handleReset(row)}>Reset password</GhostButton>
          <GhostButton icon={Pencil} onClick={() => setEditing(row)}>Edit</GhostButton>
          {row.user_id !== me?.user_id ? (
            <GhostButton icon={Trash2} onClick={() => setDeleting(row)}>Delete</GhostButton>
          ) : null}
        </div>
      ),
    },
  ]

  if (!can.viewUsers()) {
    return (
      <PageShell>
        <Banner>You need admin access to manage users.</Banner>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        icon={UserCog}
        title="Users"
        subtitle={isSuperAdmin()
          ? 'Company admins and agents across all companies'
          : 'Analytics and call agents in your company'}
        action={<PrimaryButton icon={UserPlus} onClick={() => setInviting(true)}>Add user</PrimaryButton>}
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>
      {success ? <Banner tone="success" onDismiss={() => setSuccess('')}>{success}</Banner> : null}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-52">
          <SelectField
            value={roleId}
            onChange={(v) => { setOffset(0); setRoleId(v) }}
            placeholder="All roles"
            options={ROLE_FILTERS.filter((r) => !r.superAdminOnly || isSuperAdmin())}
          />
        </div>
        {isSuperAdmin() && companies.length ? (
          <div className="w-full sm:w-64">
            <SelectField
              value={companyId}
              onChange={(v) => { setOffset(0); setCompanyId(v) }}
              placeholder="All companies"
              options={companies.map((c) => ({ id: c.companyID, label: c.companyName }))}
            />
          </div>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(r) => r.user_id}
        empty={isSuperAdmin()
          ? 'No users match these filters.'
          : 'No agents in your company yet. Use "Add user" to create one. This list shows analytics and call agents, not other admins.'}
      />

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} hasMore={rows.length >= LIMIT} />

      <InviteUserDrawer
        open={inviting}
        roles={roles}
        companies={companies}
        defaultCompanyId={isSuperAdmin() ? companyId : me?.org_id}
        onClose={() => setInviting(false)}
        onCreated={async () => { setInviting(false); await load() }}
        onError={setError}
      />

      <EditUserDrawer
        user={editing}
        roles={roles}
        busy={busy}
        onClose={() => setEditing(null)}
        onToggleActive={handleToggleActive}
        onSaved={async () => { setEditing(null); await load() }}
        onError={setError}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        busy={busy}
        title="Delete user"
        message={`${deleting?.email} will lose access immediately.`}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </PageShell>
  )
}

function InviteUserDrawer({ open, onClose, onCreated, onError, roles, companies, defaultCompanyId }) {
  const [form, setForm] = useState({
    email: '', password: '', firstname: '', lastname: '', roleName: 'call_agent', companyId: '',
  })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        email: '', password: '', firstname: '', lastname: '',
        roleName: 'call_agent', companyId: defaultCompanyId || '',
      })
    }
  }, [open, defaultCompanyId])

  function set(key, value) { setForm((p) => ({ ...p, [key]: value })) }

  async function submit() {
    setBusy(true)
    try {
      await registerUser({
        email: form.email,
        password: form.password,
        roleName: form.roleName,
        companyId: form.companyId || undefined,
        firstname: form.firstname || undefined,
        lastname: form.lastname || undefined,
      })
      onCreated()
    } catch (e) {
      onError(e.message || 'Could not create the user.')
    } finally {
      setBusy(false)
    }
  }

  // /roles already returns only what the caller may assign; the fallback has
  // to respect the same rule — a company admin cannot create another admin.
  const assignableFallback = isSuperAdmin()
    ? ['company_admin', 'analytics_agent', 'call_agent']
    : ['analytics_agent', 'call_agent']

  const roleOptions = roles.length
    ? roles.map((r) => ({
      id: r.role_name ?? r.name,
      label: ROLE_LABELS[r.role_name ?? r.name] || r.role_name || r.name,
    }))
    : assignableFallback.map((id) => ({ id, label: ROLE_LABELS[id] || id }))

  const valid = form.email.trim() && form.password.length >= 8 && form.roleName

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add user"
      subtitle="The user signs in with the password you set here."
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton icon={UserPlus} busy={busy} disabled={!valid} onClick={submit}>Create user</PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <TextField label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} autoFocus />
        <TextField
          label="Password"
          type="password"
          value={form.password}
          onChange={(v) => set('password', v)}
          placeholder="At least 8 characters"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="First name" value={form.firstname} onChange={(v) => set('firstname', v)} />
          <TextField label="Last name" value={form.lastname} onChange={(v) => set('lastname', v)} />
        </div>
        <SelectField
          label="Role"
          value={form.roleName}
          onChange={(v) => set('roleName', v)}
          placeholder="Choose a role"
          options={roleOptions}
        />
        {isSuperAdmin() && companies.length ? (
          <SelectField
            label="Company"
            value={form.companyId}
            onChange={(v) => set('companyId', v)}
            placeholder="No company"
            options={companies.map((c) => ({ id: c.companyID, label: c.companyName }))}
          />
        ) : null}
        <p className="text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
          The password must contain upper and lower case letters, a number and a special character.
        </p>
      </div>
    </Drawer>
  )
}

function EditUserDrawer({ user, onClose, onSaved, onError, onToggleActive, roles, busy }) {
  const [form, setForm] = useState({ email: '', firstname: '', lastname: '', roleName: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      email: user.email ?? '',
      firstname: user.firstname ?? '',
      lastname: user.lastname ?? '',
      roleName: user.role_name ?? '',
    })
  }, [user])

  async function submit() {
    setSaving(true)
    try {
      await updateUser(user.user_id, {
        email: form.email,
        firstname: form.firstname,
        lastname: form.lastname,
        ...(form.roleName && form.roleName !== user.role_name ? { role_name: form.roleName } : {}),
      })
      onSaved()
    } catch (e) {
      onError(e.message || 'Could not save the user.')
    } finally {
      setSaving(false)
    }
  }

  // The backend only allows reassigning to the two agent roles.
  const assignable = (roles.length
    ? roles.map((r) => r.role_name ?? r.name)
    : ['analytics_agent', 'call_agent'])
    .filter((id) => id === 'analytics_agent' || id === 'call_agent')

  return (
    <Drawer
      open={Boolean(user)}
      onClose={onClose}
      title="Edit user"
      subtitle={user?.user_id}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton icon={Pencil} busy={saving} onClick={submit}>Save</PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <TextField label="Email" type="email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="First name" value={form.firstname} onChange={(v) => setForm((p) => ({ ...p, firstname: v }))} />
          <TextField label="Last name" value={form.lastname} onChange={(v) => setForm((p) => ({ ...p, lastname: v }))} />
        </div>
        <SelectField
          label="Role"
          value={form.roleName}
          onChange={(v) => setForm((p) => ({ ...p, roleName: v }))}
          placeholder="Unchanged"
          options={assignable.map((id) => ({ id, label: ROLE_LABELS[id] || id }))}
        />
        {user && !assignable.includes(user.role_name) ? (
          <p className="text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
            This user is a {ROLE_LABELS[user.role_name] || user.role_name}. The backend only allows
            reassigning users to the analytics or call agent roles.
          </p>
        ) : null}

        <div className="ui-card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[12.5px] font-medium" style={{ color: 'var(--ui-text)' }}>
              {user?.is_active ? 'Active' : 'Deactivated'}
            </p>
            <p className="text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
              Deactivated users cannot sign in.
            </p>
          </div>
          <GhostButton busy={busy} onClick={() => onToggleActive(user)}>
            {user?.is_active ? 'Deactivate' : 'Activate'}
          </GhostButton>
        </div>
      </div>
    </Drawer>
  )
}
