import { api, withAuth, qs, toList, clampLimit } from './http'
import { formatPhone, nationalDigits, phoneKey, toE164 } from '../../utils/phone'

/**
 * Contacts. Grouped by contact category on this backend, and already scoped
 * to the caller's company server-side. Extra columns live in `custom_fields`,
 * whose shape per category comes from /contacts/template-schema.
 *
 * Read is open to all users; create/update/delete are admin and above.
 */

export function normalizeContactPayload(payload = {}) {
  const countryCode = String(payload.countryCode ?? '').trim() || '+91'
  const phoneNumber = String(payload.phoneNumber ?? '').trim()
  const national = nationalDigits(countryCode, phoneNumber)

  return {
    ...payload,
    countryCode,
    // Store the subscriber portion only; the dial code lives separately, so a
    // pasted value like "+91 917659042468" or "919876543210" is canonicalised
    // before the API call rather than being allowed to create a duplicate row.
    phoneNumber: national || phoneNumber,
  }
}

export function listContacts({ categoryId, limit = 20, offset = 0 } = {}) {
  return api.get(`/contacts${qs({ category_id: categoryId, limit: clampLimit(limit), offset })}`, withAuth())
    .then((res) => toList(res, { limit, offset }))
}

/** Filter without a category — the only route that does not require one. */
export function searchContacts({ categoryId, phoneNumber, name, size = 100 } = {}) {
  const normalizedPhone = phoneNumber ? toE164('', phoneNumber) || String(phoneNumber).trim() : ''
  return api.get(`/contacts/search${qs({
    category_id: categoryId, phone_number: normalizedPhone, name, size,
  })}`, withAuth()).then((res) => toList(res))
}

/** Company admins can list another user's contacts. */
export function listContactsForUser({ categoryId, userId, limit = 20, offset = 0 }) {
  return api.get(`/contacts/admin${qs({
    category_id: categoryId, user_id: userId, limit: clampLimit(limit), offset,
  })}`, withAuth()).then((res) => toList(res, { limit, offset }))
}

/** payload: { contactName, countryCode, phoneNumber, categoryID?, custom_fields? } */
export async function createContact(payload) {
  const cleaned = normalizeContactPayload(payload)
  const phoneNumber = String(cleaned.phoneNumber ?? '').trim()
  const countryCode = String(cleaned.countryCode ?? '').trim()
  const candidateKey = phoneKey(countryCode, phoneNumber)

  if (candidateKey) {
    try {
      const existing = await searchContacts({
        categoryId: cleaned.categoryID,
        phoneNumber: toE164(countryCode, phoneNumber),
        size: 50,
      }).catch(() => ({ items: [] }))

      const clash = existing.items?.find((c) => phoneKey(c.countryCode, c.phoneNumber) === candidateKey)
      if (clash) {
        throw new Error(`${clash.contactName || 'A contact'} already has ${formatPhone(countryCode, phoneNumber)}.`)
      }
    } catch (error) {
      if (error?.message?.includes('already has')) throw error
    }
  }

  return api.post('/contacts', cleaned, withAuth())
}

export function updateContact(customerId, payload) {
  return api.put(`/contacts/${encodeURIComponent(customerId)}`, {
    customerID: customerId,
    ...normalizeContactPayload(payload),
  }, withAuth())
}

export function deleteContact(customerId) {
  return api.del(`/contacts/${encodeURIComponent(customerId)}`, withAuth())
}

export function deleteContactByPhone(phoneNumber) {
  return api.del(`/contacts/phone/${encodeURIComponent(phoneNumber)}`, withAuth())
}

/** Ensure a dial code reads as "+91" whichever way the backend spelled it. */
function withPlus(value) {
  const digits = String(value ?? '').replace(/\D+/g, '')
  return digits ? `+${digits}` : ''
}

/**
 * Normalise the country-code list to `{ dialCode, name, isoCode }`.
 *
 * This route documents an empty response schema, so the envelope and the field
 * names are both unknown: a bare array, a `{ items }` envelope, a list of plain
 * strings and an `{ IN: "+91" }` map are all shapes it can take. Reading only
 * one of them leaves the list empty, and an empty list silently degrades the
 * contact form to a free-text prefix box — which is why the picker appeared to
 * offer India alone.
 */
export function normalizeCountryCodes(res) {
  const rows = Array.isArray(res) ? res : toList(res).items

  if (rows.length) {
    return rows.map((row) => {
      if (row == null || typeof row !== 'object') {
        return { dialCode: withPlus(row), name: '', isoCode: '' }
      }
      return {
        dialCode: withPlus(row.country_code ?? row.dial_code ?? row.dialCode ?? row.phone_code ?? row.code),
        name: row.country_name ?? row.name ?? row.country ?? '',
        isoCode: row.iso_code ?? row.isoCode ?? row.iso2 ?? row.iso ?? '',
      }
    }).filter((row) => row.dialCode)
  }

  // A plain { iso: dial } map has no array to find.
  if (res && typeof res === 'object') {
    return Object.entries(res)
      .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
      .map(([key, value]) => ({ dialCode: withPlus(value), name: '', isoCode: key }))
      .filter((row) => row.dialCode)
  }
  return []
}

export function listCountryCodes() {
  return api.get('/contacts/country-codes', withAuth()).then(normalizeCountryCodes)
}

/** The custom-field definitions for a category. */
export function getTemplateSchema(categoryId) {
  return api.get(`/contacts/template-schema${qs({ category_id: categoryId })}`, withAuth())
}

/**
 * Replace a category's custom fields.
 *
 * The route wants `{"fields": [...]}`, not a bare array — sending the array on
 * its own is rejected by the body validator with "Input should be a valid
 * dictionary". Each entry is `{label, type, required, order}`; the stable `key`
 * a contact's `custom_fields` is stored under is derived from the label
 * server-side, so it is not sent. `{"fields": []}` clears the template.
 */
export function setTemplateSchema(categoryId, fields) {
  return api.put(
    `/contacts/template-schema${qs({ category_id: categoryId })}`,
    { fields: Array.isArray(fields) ? fields : (fields?.fields ?? []) },
    withAuth(),
  )
}

export function downloadTemplate({ categoryId, format = 'excel' }) {
  return api.getBlob(`/contacts/template${qs({ category_id: categoryId, format })}`, withAuth())
}

export function uploadContacts({ categoryId, file }) {
  const fd = new FormData()
  fd.append('file', file)
  return api.postForm(`/contacts/upload${qs({ category_id: categoryId })}`, fd, withAuth())
}
