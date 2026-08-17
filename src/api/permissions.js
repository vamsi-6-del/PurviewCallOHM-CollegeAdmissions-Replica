import { getSession } from './auth/authService'

/**
 * Access model of the Twilio Voice Bot API.
 *
 * The backend documents each route with one of these tiers (see the
 * "User Access:" line on every endpoint summary):
 *
 *   All Users            — any authenticated user
 *   Call Agent and Above — call_agent, company_admin, super_admin
 *   Admin and Above      — company_admin, super_admin
 *   Company Admin Only   — company_admin (a super admin has no company)
 *   Only Super Admin     — super_admin
 *
 * Roles are ranked so a single numeric comparison answers "and above".
 * `analytics_agent` and `call_agent` are both non-admin roles; only
 * call_agent may operate live calls.
 */
export const ROLE_RANK = {
  analytics_agent: 1,
  call_agent: 2,
  company_admin: 3,
  super_admin: 4,
}

/** App-facing role names ↔ the backend's role_name vocabulary. */
export const ROLE_TO_API = {
  org_user: 'call_agent',
  org_admin: 'company_admin',
  super_admin: 'super_admin',
}

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  company_admin: 'Company Admin',
  analytics_agent: 'Analytics Agent',
  call_agent: 'Call Agent',
}

/**
 * The signed-in user's backend role name.
 *
 * `roleName` is written from /auth/me at login. Sessions created before that
 * field existed, or a login where /auth/me failed, fall back to the app-facing
 * role and then to the JWT claims — otherwise every check would fail closed and
 * the UI would hide controls the user is entitled to.
 */
export function currentRole() {
  const session = getSession()
  if (!session) return null
  if (session.roleName) return session.roleName
  if (session.role && ROLE_TO_API[session.role]) return ROLE_TO_API[session.role]

  try {
    const payload = session.accessToken?.split('.')[1]
    if (!payload) return null
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return claims.role_name ?? claims.role ?? null
  } catch {
    return null
  }
}

function rank(role = currentRole()) {
  return ROLE_RANK[role] ?? 0
}

export const isSuperAdmin = (role) => (role ?? currentRole()) === 'super_admin'
export const isCompanyAdmin = (role) => (role ?? currentRole()) === 'company_admin'
export const isAdminOrAbove = (role) => rank(role) >= ROLE_RANK.company_admin
export const isCallAgentOrAbove = (role) => rank(role) >= ROLE_RANK.call_agent
export const isAuthenticated = () => Boolean(getSession()?.accessToken)

/**
 * Per-resource capabilities, mirroring the tiers the backend enforces.
 * Pages use these to hide controls that would 403 — the server remains the
 * authority; this only keeps the UI honest.
 */
export const can = {
  // Companies — every route is super-admin only.
  viewCompanies: (r) => isSuperAdmin(r),
  manageCompanies: (r) => isSuperAdmin(r),
  reviewKyc: (r) => isSuperAdmin(r),

  // Users — listing is scoped by the backend; creating users is admin work.
  viewUsers: (r) => isAdminOrAbove(r),
  manageUsers: (r) => isAdminOrAbove(r),

  // Contacts & categories.
  viewContacts: () => true,
  manageContacts: (r) => isAdminOrAbove(r),
  viewContactsOfOtherUsers: (r) => isCompanyAdmin(r),
  viewCategories: () => true,
  manageCategories: (r) => isAdminOrAbove(r),

  // Agents and their building blocks.
  viewAgents: () => true,
  manageAgents: (r) => isAdminOrAbove(r),
  /**
   * Deleting an agent is a soft delete any admin may do. Purging it from the
   * trash is offered to the same tier: DELETE /agents/{id}/permanent documents
   * no role rule of its own (unlike the soft delete, which names super admin
   * and company admin explicitly), and it only ever acts on an agent already
   * trashed from the caller's own company.
   *
   * Since that access rule is undocumented rather than confirmed, the trash page
   * reports a refusal from the server plainly instead of assuming success.
   */
  purgeAgents: (r) => isAdminOrAbove(r),
  viewPrompts: () => true,
  managePrompts: (r) => isAdminOrAbove(r),
  /**
   * DELETE /prompts/{id} allows a company admin to delete any prompt in their
   * own company, not just a super admin — gating this to super admin hid a
   * control that the backend would have accepted.
   *
   * Call agents may also delete prompts *mapped to them*, but the list carries
   * no mapping, so the button would appear on every row and 403 on most of
   * them. They are left out until the row can say which prompts are theirs.
   * Unlike an agent, a deleted prompt is gone for good: the backend has no
   * prompt trash or restore route.
   */
  deletePrompts: (r) => isAdminOrAbove(r),
  viewVoices: () => true,
  manageVoices: (r) => isSuperAdmin(r),

  // Knowledge base — folders are company-admin work, documents are shared.
  viewKnowledge: () => true,
  manageKnowledge: (r) => isAdminOrAbove(r),

  // Calls.
  placeCalls: (r) => isCallAgentOrAbove(r),
  controlLiveCalls: (r) => isCallAgentOrAbove(r),
  viewCallHistory: () => true,
  viewRecordings: () => true,
  deleteRecordings: (r) => isAdminOrAbove(r),

  viewAnalytics: () => true,

  // Telephony & billing.
  viewTelephony: (r) => isAdminOrAbove(r),
  manageTelephony: (r) => isAdminOrAbove(r),
  viewCredits: () => true,
  manageCredits: (r) => isSuperAdmin(r),
}

/**
 * A company may further restrict pages via its `access_policy`, returned on
 * /auth/me. When the policy names pages, treat it as an allowlist; when it is
 * absent or empty, role alone decides.
 */
export function policyAllowsPage(pageKey) {
  const policy = getSession()?.accessPolicy
  if (!policy || typeof policy !== 'object') return true

  const pages = policy.pages ?? policy
  if (!pages || typeof pages !== 'object') return true

  const entry = pages[pageKey]
  if (entry === undefined) return true
  if (typeof entry === 'boolean') return entry
  if (typeof entry === 'object' && entry !== null && 'enabled' in entry) {
    return Boolean(entry.enabled)
  }
  return true
}

/** Role check and company policy combined — what the nav and routes use. */
export function canViewPage(pageKey, roleCheck) {
  if (!isAuthenticated()) return false
  if (roleCheck && !roleCheck()) return false
  return policyAllowsPage(pageKey)
}
