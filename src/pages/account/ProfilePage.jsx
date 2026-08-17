import { useEffect, useState } from 'react'
import { UserCircle, KeyRound, Check } from 'lucide-react'
import { getCurrentUser, fetchMe, getSession } from '../../api/auth/authService'
import { changeOwnPassword } from '../../api/resources/org'
import { currentRole, ROLE_LABELS } from '../../api/permissions'
import {
  PageShell, PageHeader, PrimaryButton, Banner, TextField, Badge,
} from '../../components/resource/ResourceKit'

/**
 * The signed-in user's own account.
 *
 * Everything shown here already exists in the session; /auth/me is re-read on
 * open so a role or company changed by an admin since login is reflected
 * rather than shown stale.
 */
export default function ProfilePage() {
  const [me, setMe] = useState(() => getCurrentUser())
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchMe(getSession()?.accessToken)
      .then((data) => {
        setProfile(data)
        setMe((prev) => ({ ...prev, email: data?.email ?? prev?.email }))
      })
      .catch(() => setProfile(null))
  }, [])

  const role = profile?.role_name ?? currentRole()

  const fields = [
    { label: 'Email', value: me?.email ?? '—' },
    { label: 'Role', value: ROLE_LABELS[role] ?? role ?? '—' },
    { label: 'Company', value: profile?.company_name ?? profile?.company_id ?? me?.org_id ?? '—' },
    { label: 'User ID', value: profile?.user_id ?? me?.user_id ?? '—' },
  ]

  return (
    <PageShell>
      <PageHeader
        icon={UserCircle}
        title="Your account"
        subtitle="Profile details and password"
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>
      {success ? <Banner tone="success" onDismiss={() => setSuccess('')}>{success}</Banner> : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="ui-card p-5">
          <h2 className="ui-h2 mb-4">Profile</h2>
          <dl className="grid gap-3">
            {fields.map((field) => (
              <div key={field.label} className="flex items-start justify-between gap-3">
                <dt className="ui-label shrink-0 pt-0.5">{field.label}</dt>
                <dd className="min-w-0 break-all text-right text-[12.5px]" style={{ color: 'var(--ui-text)' }}>
                  {field.label === 'Role'
                    ? <Badge tone="info">{field.value}</Badge>
                    : field.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
            Your email and role are managed by an admin. Ask them to change either one.
          </p>
        </section>

        <ChangePasswordCard onError={setError} onSuccess={setSuccess} />
      </div>
    </PageShell>
  )
}

function ChangePasswordCard({ onError, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  // Mirrors the backend's own minimum so the failure is shown before the round
  // trip rather than as a validation error afterwards.
  const tooShort = newPassword.length > 0 && newPassword.length < 8
  const mismatch = confirm.length > 0 && newPassword !== confirm
  const valid = currentPassword && newPassword.length >= 8 && newPassword === confirm

  async function submit() {
    setBusy(true)
    onError('')
    try {
      await changeOwnPassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
      onSuccess('Password changed. It applies the next time you sign in.')
    } catch (e) {
      onError(e.message || 'Could not change your password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="ui-card p-5">
      <h2 className="ui-h2 mb-4">Change password</h2>
      <div className="grid gap-4">
        <TextField
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
        />

        <p className="text-[11.5px]" style={{ color: tooShort || mismatch ? '#e11d48' : 'var(--ui-text-3)' }}>
          {mismatch
            ? 'The two new passwords do not match.'
            : tooShort
              ? 'Use at least 8 characters.'
              : 'At least 8 characters.'}
        </p>

        <div className="flex justify-end">
          <PrimaryButton icon={valid ? Check : KeyRound} busy={busy} disabled={!valid} onClick={submit}>
            Update password
          </PrimaryButton>
        </div>
      </div>
    </section>
  )
}
