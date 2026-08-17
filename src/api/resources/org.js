import { api, withAuth, qs, toList, clampLimit } from './http'

/**
 * Companies, users and roles.
 *
 * Every /companies route is super-admin only. /users is visible to admins and
 * is scoped by the backend: a super admin may filter by company_id, a company
 * admin only ever sees their own company.
 */

/* ── companies ──────────────────────────────────────────────────────────── */

export function listCompanies({ kycStatus } = {}) {
  return api.get(`/companies/${qs({ kyc_status: kycStatus })}`, withAuth())
    .then((res) => toList(res))
}

export function getCompany(companyId) {
  return api.get(`/companies/${encodeURIComponent(companyId)}`, withAuth())
}

/** payload: { companyName, recording_retention_days?, access_policy? } */
export function createCompany(payload) {
  return api.post('/companies/', payload, withAuth())
}

export function updateCompany(companyId, payload) {
  return api.put(`/companies/${encodeURIComponent(companyId)}`, payload, withAuth())
}

/** Cascade-deletes every user in the company. */
export function deleteCompany(companyId) {
  return api.del(`/companies/${encodeURIComponent(companyId)}`, withAuth())
}

export function listAccessPolicyPages() {
  return api.get('/companies/access-policy/pages', withAuth())
}

/** Replaces the policy outright; pass null to clear it. */
export function setAccessPolicy(companyId, accessPolicy) {
  return api.put(
    `/companies/${encodeURIComponent(companyId)}/access-policy`,
    { access_policy: accessPolicy },
    withAuth()
  )
}

export function listPendingKyc() {
  return api.get('/companies/kyc/pending', withAuth()).then((res) => toList(res))
}

/** status: 'under_review' | 'verified' | 'rejected' */
export function reviewKyc(companyId, { status, notes }) {
  return api.post(`/companies/${encodeURIComponent(companyId)}/kyc/review`, {
    status,
    ...(notes ? { notes } : {}),
  }, withAuth())
}

/* ── users & roles ──────────────────────────────────────────────────────── */

export function listUsers({ limit = 20, offset = 0, roleId, companyId } = {}) {
  return api.get(`/users${qs({ limit: clampLimit(limit), offset, role_id: roleId, company_id: companyId })}`, withAuth())
    .then((res) => toList(res, { limit, offset }))
}

/** payload: { email, firstname?, lastname?, role_name?, is_active? } */
export function updateUser(userId, payload) {
  return api.put(`/users/${encodeURIComponent(userId)}`, payload, withAuth())
}

export function deleteUser(userId) {
  return api.del(`/users/${encodeURIComponent(userId)}`, withAuth())
}

/**
 * Users are created through the admin register route.
 * role_name: super_admin | company_admin | analytics_agent | call_agent
 */
export function registerUser({ email, password, roleName, companyId, firstname, lastname }) {
  return api.post('/auth/register', {
    email,
    password,
    role_name: roleName,
    ...(companyId ? { company_id: companyId } : {}),
    ...(firstname ? { firstname } : {}),
    ...(lastname ? { lastname } : {}),
  }, withAuth())
}

export function listRoles() {
  return api.get('/roles', withAuth()).then((res) => toList(res))
}

/** Admin-initiated reset: the backend emails the user a reset link. */
export function requestPasswordReset(email) {
  return api.post('/auth/password-reset/request', { email }, withAuth())
}

export function changeOwnPassword({ currentPassword, newPassword }) {
  return api.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  }, withAuth())
}
