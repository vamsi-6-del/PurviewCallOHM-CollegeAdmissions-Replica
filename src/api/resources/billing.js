import { api, withAuth, qs, toList, clampLimit } from './http'

/**
 * Telephony numbers, provider accounts and credits.
 *
 * Numbers are admin work; credit balance/ledger/usage are readable by the
 * company, while top-ups, adjustments and pricing are super-admin only.
 */

/* ── telephony numbers ──────────────────────────────────────────────────── */

export function listTelephonyNumbers({ providerId, providerAccountId, companyId, outboundEnabled, status } = {}) {
  return api.get(`/telephony-numbers${qs({
    provider_id: providerId,
    provider_account_id: providerAccountId,
    company_id: companyId,
    outbound_enabled: outboundEnabled,
    status,
  })}`, withAuth()).then((res) => toList(res))
}

export function getTelephonyNumber(numberId) {
  return api.get(`/telephony-numbers/${encodeURIComponent(numberId)}`, withAuth())
}

export function updateTelephonyNumber(numberId, payload) {
  return api.put(`/telephony-numbers/${encodeURIComponent(numberId)}`, payload, withAuth())
}

export function deleteTelephonyNumber(numberId) {
  return api.del(`/telephony-numbers/${encodeURIComponent(numberId)}`, withAuth())
}

/** Search the provider's inventory for numbers available to buy. */
export function searchAvailableNumbers({ countryIso, type, pattern, services, region, city, limit = 20, offset = 0 } = {}) {
  return api.get(`/telephony-numbers/search${qs({
    country_iso: countryIso, type, pattern, services, region, city, limit: clampLimit(limit), offset,
  })}`, withAuth()).then((res) => toList(res, { limit, offset }))
}

export function quoteNumber(number) {
  return api.get(`/telephony-numbers/quote/${encodeURIComponent(number)}`, withAuth())
}

export function buyNumber(number, payload = {}) {
  return api.post(`/telephony-numbers/buy/${encodeURIComponent(number)}`, payload, withAuth())
}

export function releaseNumber(numberId, payload = null) {
  return api.post(`/telephony-numbers/release/${encodeURIComponent(numberId)}`, payload, withAuth())
}

/* ── providers ──────────────────────────────────────────────────────────── */

export function listServiceProviders({ providerDomain, activeOnly } = {}) {
  return api.get(`/service-providers${qs({ provider_domain: providerDomain, active_only: activeOnly })}`, withAuth())
    .then((res) => toList(res))
}

export function listProviderAccounts({ providerId, companyId, activeOnly } = {}) {
  return api.get(`/provider-accounts${qs({ provider_id: providerId, company_id: companyId, active_only: activeOnly })}`, withAuth())
    .then((res) => toList(res))
}

export function getCredentialSchemas() {
  return api.get('/provider-accounts/credential-schemas', withAuth())
}

export function createProviderAccount(payload) {
  return api.post('/provider-accounts', payload, withAuth())
}

export function deleteProviderAccount(providerAccountId) {
  return api.del(`/provider-accounts/${encodeURIComponent(providerAccountId)}`, withAuth())
}

export function connectTelephony(payload) {
  return api.post('/provider-accounts/connect-telephony', payload, withAuth())
}

export function syncProviderNumbers(providerAccountId) {
  return api.post(`/provider-accounts/${encodeURIComponent(providerAccountId)}/sync-numbers`, null, withAuth())
}

/* ── credits ────────────────────────────────────────────────────────────── */

export function getCreditBalance({ companyId } = {}) {
  return api.get(`/credits/balance${qs({ company_id: companyId })}`, withAuth())
}

export function getCreditLedger({ companyId, limit = 20, offset = 0 } = {}) {
  return api.get(`/credits/ledger${qs({ company_id: companyId, limit: clampLimit(limit), offset })}`, withAuth())
    .then((res) => toList(res, { limit, offset }))
}

export function getCreditUsage({ companyId, agentId, source, limit = 20, offset = 0 } = {}) {
  return api.get(`/credits/usage${qs({ company_id: companyId, agent_id: agentId, source, limit: clampLimit(limit), offset })}`, withAuth())
    .then((res) => toList(res, { limit, offset }))
}

export function getPricing({ includeHistory } = {}) {
  return api.get(`/credits/pricing${qs({ include_history: includeHistory })}`, withAuth())
}

/** Super admin only. */
export function topUpCredits({ companyId, credits, description, idempotencyKey }) {
  return api.post('/credits/admin/top-up', {
    company_id: companyId,
    credits,
    ...(description ? { description } : {}),
    ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
  }, withAuth())
}

export function adjustCredits(payload) {
  return api.post('/credits/admin/adjust', payload, withAuth())
}

export function listPlans() {
  return api.get('/plans', withAuth()).then((res) => toList(res))
}
