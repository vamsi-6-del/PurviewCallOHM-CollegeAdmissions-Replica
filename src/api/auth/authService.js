import { api } from '../client'

const STORAGE_KEY = 'callohm_auth'

/* ---------------------------------------------------------------------------
 * Backend: Twilio Voice Bot API (192.168.0.191:7860)
 *
 * /auth/login returns tokens only — no role or company. The role comes from
 * GET /auth/me, and its vocabulary differs from the one the routes and layout
 * guard on, so it is normalised here at the session boundary:
 *
 *   super_admin     → super_admin
 *   company_admin   → org_admin
 *   call_agent      → org_user
 *   analytics_agent → org_user
 * ------------------------------------------------------------------------ */

const ROLE_FROM_API = {
  super_admin: 'super_admin',
  company_admin: 'org_admin',
  call_agent: 'org_user',
  analytics_agent: 'org_user',
}

export function normalizeRole(roleName) {
  return ROLE_FROM_API[roleName] ?? roleName ?? null
}

export function saveSession(data) {
  const existing = getSession()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    role: data.role ?? existing?.role ?? null,
    // The backend's own role vocabulary, used for permission checks.
    roleName: data.role_name ?? existing?.roleName ?? null,
    orgId: data.org_id ?? existing?.orgId ?? null,
    email: data.email ?? existing?.email ?? null,
    userId: data.user_id ?? existing?.userId ?? null,
    name: data.name ?? existing?.name ?? null,
    accessPolicy: data.access_policy ?? existing?.accessPolicy ?? null,
  }))
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

/** Decode the JWT payload (no signature check - for client-side info only). */
function decodeToken(accessToken) {
  try {
    const payload = accessToken.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

/**
 * Current user, from the stored session first (populated by /auth/me at login)
 * and falling back to the JWT claims.
 */
export function getCurrentUser() {
  const session = getSession()
  if (!session?.accessToken) return null
  const claims = decodeToken(session.accessToken) ?? {}
  return {
    user_id: session.userId ?? claims.sub ?? null,
    email: session.email ?? claims.email ?? null,
    role: session.role ?? normalizeRole(claims.role_name ?? claims.role),
    org_id: session.orgId ?? claims.company_id ?? claims.org_id ?? null,
  }
}

/** GET /auth/me */
export function fetchMe(accessToken) {
  return api.get('/auth/me', { token: accessToken })
}

/**
 * Fills in the profile fields permission checks depend on (role name, company,
 * access policy) when the stored session predates them or /auth/me failed at
 * login. Returns true when the session was updated.
 */
export async function ensureProfileLoaded() {
  const session = getSession()
  if (!session?.accessToken || session.roleName) return false

  const me = await fetchMe(session.accessToken)
  saveSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    role: normalizeRole(me?.role_name),
    role_name: me?.role_name ?? null,
    org_id: me?.company_id ?? null,
    email: me?.email ?? null,
    user_id: me?.user_id ?? null,
    name: [me?.firstname, me?.lastname].filter(Boolean).join(' ') || null,
    access_policy: me?.access_policy ?? null,
  })
  return true
}

export async function login(email, password) {
  const data = await api.post('/auth/login', { email, password })
  saveSession(data)

  // Tokens carry no role on this backend — read the profile to fill it in.
  try {
    const me = await fetchMe(data.access_token)
    saveSession({
      ...data,
      role: normalizeRole(me?.role_name),
      role_name: me?.role_name ?? null,
      org_id: me?.company_id ?? null,
      email: me?.email ?? email,
      user_id: me?.user_id ?? null,
      name: [me?.firstname, me?.lastname].filter(Boolean).join(' ') || null,
      access_policy: me?.access_policy ?? null,
    })
    return { ...data, role: normalizeRole(me?.role_name), org_id: me?.company_id ?? null }
  } catch {
    // Keep the session; the JWT fallback in getCurrentUser still applies.
    return data
  }
}

export async function refreshSession() {
  const session = getSession()
  if (!session?.refreshToken) throw new Error('No refresh token available')

  const data = await api.post('/auth/refresh', { refresh_token: session.refreshToken })
  // Server rotates the refresh token - save both new tokens, keep role/org.
  saveSession(data)
  return data
}

export async function logout() {
  const session = getSession()
  if (!session) return

  try {
    await api.post(
      '/auth/logout',
      { refresh_token: session.refreshToken },
      { token: session.accessToken }
    )
  } finally {
    clearSession()
  }
}
