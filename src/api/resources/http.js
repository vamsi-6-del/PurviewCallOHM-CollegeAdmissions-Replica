import { api } from '../client'
import { getSession } from '../auth/authService'

/** Shared helpers for the resource services. */

export function withAuth(options = {}) {
  const session = getSession()
  if (!session?.accessToken) throw new Error('You need to sign in again.')
  return { token: session.accessToken, ...options }
}

/**
 * Abort signal for routes that talk to the telephony provider.
 *
 * /call-status, /end-call and /transfer-call all make an outbound request to
 * Twilio or Plivo, so they can sit open far longer than a database read. Without
 * a deadline a stalled one leaves its button spinning for the rest of the
 * session.
 */
export function timeoutSignal(ms = 20000) {
  try { return AbortSignal.timeout(ms) } catch { return undefined }
}

/** Turn an aborted request into something worth showing a user. */
export function describeError(e, fallback = 'Request failed.') {
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
    return 'The backend did not respond in time.'
  }
  return e?.message || fallback
}

/** Build a query string, dropping empty values. `?` included when non-empty. */
export function qs(params = {}) {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue
    q.set(key, String(value))
  }
  const out = q.toString()
  return out ? `?${out}` : ''
}

/**
 * Every paginated route on this backend caps `limit` at 100 and rejects
 * anything larger with a validation error, so clamp rather than let a caller
 * silently get back nothing.
 */
export const MAX_PAGE_SIZE = 100

export function clampLimit(limit) {
  const n = Number(limit)
  if (!Number.isFinite(n)) return 10
  return Math.min(Math.max(1, Math.trunc(n)), MAX_PAGE_SIZE)
}

/**
 * Page through a list endpoint for the selector dropdowns, which need the
 * whole catalog rather than one page. Bounded so a large tenant cannot spin
 * this forever.
 */
export async function fetchAllPages(fetcher, { pageSize = MAX_PAGE_SIZE, maxItems = 500 } = {}) {
  const items = []
  let offset = 0
  for (;;) {
    const page = await fetcher({ limit: pageSize, offset })
    items.push(...page.items)
    const done = page.items.length < pageSize
      || items.length >= Math.min(maxItems, page.total ?? Infinity)
    if (done) break
    offset += pageSize
  }
  return { items, total: items.length }
}

/**
 * Normalise a list response.
 *
 * Routes here return a bare array, a `{ total, limit, offset, items }`
 * envelope, or a resource-named key — and several document their response as
 * an empty schema, so the key cannot be known ahead of time. Falling back to
 * "the first array-valued property" keeps an unfamiliar envelope from
 * silently reading as an empty list.
 */
export function toList(res, { limit, offset } = {}) {
  if (Array.isArray(res)) {
    return { items: res, total: res.length, limit: limit ?? res.length, offset: offset ?? 0 }
  }

  let items = res?.items ?? res?.data ?? res?.results ?? res?.records
  if (!Array.isArray(items) && res && typeof res === 'object') {
    items = Object.values(res).find(Array.isArray)
  }
  if (!Array.isArray(items)) items = []

  return {
    items,
    total: res?.total ?? items.length,
    limit: res?.limit ?? limit ?? items.length,
    offset: res?.offset ?? offset ?? 0,
  }
}

export { api }
