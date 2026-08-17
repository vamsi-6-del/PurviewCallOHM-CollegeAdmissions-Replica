/**
 * Phone-number normalisation.
 *
 * Contacts are stored as a separate dialing prefix and subscriber number, but
 * uploads and manual entry both let the prefix end up repeated inside
 * `phoneNumber` — the same person then exists twice, as
 * (+91, 7659042468) and (+91, 917659042468). Both rows are real backend data,
 * so the list has to recognise them as one contact and dial one E.164 number.
 */

export function digitsOnly(value) {
  return String(value ?? '').replace(/\D+/g, '')
}

/**
 * Digits of the number as dialed, with a repeated country code collapsed.
 *
 * The prefix is only treated as duplicated when removing it still leaves a
 * full-length national number: "9198765432" with a +91 prefix is a valid
 * ten-digit Indian mobile that happens to start with 91, and must be left
 * alone, while "917659042468" is twelve digits and clearly carries the prefix.
 */
export function fullDigits(countryCode, phoneNumber) {
  const cc = digitsOnly(countryCode)
  const num = digitsOnly(phoneNumber)
  if (!num) return ''
  if (!cc) return num
  const national = num.startsWith(cc) && num.length >= 11 && num.length - cc.length >= 7
    ? num.slice(cc.length)
    : num
  return `${cc}${national}`
}

/**
 * The subscriber number on its own, with the dialing prefix removed.
 *
 * This is the form to *store*: contacts keep the prefix in `countryCode`, so
 * writing "917659042468" alongside "+91" is what creates the second row for a
 * person who already exists. Normalising on save stops new duplicates at the
 * point they would be created rather than papering over them at render time.
 */
export function nationalDigits(countryCode, phoneNumber) {
  const cc = digitsOnly(countryCode)
  const digits = fullDigits(countryCode, phoneNumber)
  return cc && digits.startsWith(cc) ? digits.slice(cc.length) : digits
}

/** E.164 for dialing — `+` plus the collapsed digits. Empty when there is no number. */
export function toE164(countryCode, phoneNumber) {
  const digits = fullDigits(countryCode, phoneNumber)
  return digits ? `+${digits}` : ''
}

/**
 * Identity key for "is this the same number".
 *
 * Compares the last ten digits, which survives a missing, duplicated or
 * differently formatted country code — the formats that actually differ
 * between duplicate contact rows.
 */
export function phoneKey(countryCode, phoneNumber) {
  const digits = fullDigits(countryCode, phoneNumber)
  return digits.length > 10 ? digits.slice(-10) : digits
}

/**
 * One entry per unique contact.
 *
 * Keyed by normalised number rather than by id, because the duplicates are
 * distinct rows with distinct `customerID`s. The first occurrence wins, so the
 * order the backend returned is preserved.
 */
export function dedupeContacts(contacts = []) {
  const seen = new Set()
  const out = []
  for (const contact of contacts) {
    const key = phoneKey(contact?.countryCode, contact?.phoneNumber)
      || `id:${contact?.customerID ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(contact)
  }
  return out
}

/** Display form: "+91 76590 42468" is overkill here — prefix, space, rest. */
export function formatPhone(countryCode, phoneNumber) {
  const cc = digitsOnly(countryCode)
  const digits = fullDigits(countryCode, phoneNumber)
  if (!digits) return ''
  if (cc && digits.startsWith(cc)) return `+${cc} ${digits.slice(cc.length)}`
  return `+${digits}`
}
