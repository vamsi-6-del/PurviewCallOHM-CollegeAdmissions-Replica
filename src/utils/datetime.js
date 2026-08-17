/**
 * Timestamps from the API.
 *
 * The backend serialises them without a timezone designator —
 * "2026-08-11T15:38:22" rather than "…22Z" — and the wall-clock it writes is
 * the *server's own*, which runs in IST. Verified against known call times: a
 * batch placed at ~15:38 IST is stored as 15:38.
 *
 * A zone-less datetime is therefore read as IST rather than as UTC. Reading it
 * as UTC (which this file did previously) added 5h30m to every timestamp in the
 * app, so that 15:38 call displayed as 21:08. Parsing it as *browser*-local
 * would look right in India and be wrong everywhere else, so the backend's zone
 * is pinned here explicitly and the result still renders in the viewer's zone.
 *
 * Strings that already carry a zone (trailing `Z` or `±HH:MM`) are left exactly
 * as they are, so this stays correct if the backend starts sending offsets.
 *
 * Date-only values ("2026-08-11") are deliberately not touched: JavaScript
 * already treats those as UTC midnight, and appending a time would shift the
 * calendar day for anyone west of Greenwich.
 *
 * NOT EVERY ROUTE AGREES. The credit routes write `datetime.utcnow()` while the
 * call routes write the server's local clock, so the same backend serves two
 * conventions in the same format — indistinguishable from the string alone.
 * Modules reading a UTC-writing route import `utcApi` below instead of these
 * functions. Both were established by comparing displayed times against known
 * real-world event times; there is no way to detect it automatically, so a new
 * route needs the same check before its dates are trusted.
 */

/** The zone the backend's *local-clock* routes write in. */
const BACKEND_UTC_OFFSET = '+05:30'

const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i
const IS_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/

/**
 * A Date, or null when the value is absent or unparseable.
 *
 * `naiveZone` is the designator appended to a timestamp that carries none.
 */
export function parseApiDate(value, naiveZone = BACKEND_UTC_OFFSET) {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') {
    const fromEpoch = new Date(value)
    return Number.isNaN(fromEpoch.getTime()) ? null : fromEpoch
  }

  const text = String(value).trim()
  const normalised = IS_DATETIME.test(text) && !HAS_ZONE.test(text)
    ? `${text.replace(' ', 'T')}${naiveZone}`
    : text

  const date = new Date(normalised)
  return Number.isNaN(date.getTime()) ? null : date
}

/*
 * Dates are rendered day-first and the format is pinned, not left to the
 * browser's locale.
 *
 * An en-US browser renders 11 August as "8/11/2026", which a day-first reader
 * sees as 8 November — a date that is not merely oddly formatted but wrong, and
 * silently so for the first twelve days of any month. Fixing the locale means
 * every viewer of this deployment reads the same unambiguous date regardless of
 * their browser settings. The zone still follows the viewer's own.
 */
const LOCALE = 'en-GB'
const DATE_PARTS = { day: '2-digit', month: '2-digit', year: 'numeric' }
const TIME_PARTS = { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }

/** "11/08/2026, 3:38:47 pm" — day-first, in the viewer's zone. */
export function formatDateTime(value, fallback = '—', naiveZone) {
  const date = parseApiDate(value, naiveZone)
  return date ? date.toLocaleString(LOCALE, { ...DATE_PARTS, ...TIME_PARTS }) : fallback
}

/** "11/08/2026" — day-first. */
export function formatDate(value, fallback = '—', naiveZone) {
  const date = parseApiDate(value, naiveZone)
  return date ? date.toLocaleDateString(LOCALE, DATE_PARTS) : fallback
}

/** Clock time with seconds, e.g. "3:38:47 pm". */
export function formatTime(value, fallback = '—', naiveZone) {
  const date = parseApiDate(value, naiveZone)
  return date ? date.toLocaleTimeString(LOCALE, TIME_PARTS) : fallback
}

/** Short clock time for axis labels and dense rows, e.g. "3:38 pm". */
export function formatClock(value, fallback = '—', naiveZone) {
  const date = parseApiDate(value, naiveZone)
  return date
    ? date.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: true })
    : fallback
}

/**
 * The same formatters for routes whose zone-less timestamps are UTC.
 *
 * The credit routes are the known case: their rows displayed 5h30m behind the
 * calls that produced them, because those write the server's local clock and
 * these write `utcnow()`. Importing this bundle instead of the functions above
 * is the whole difference — the rendering, the locale and the viewer's zone are
 * identical.
 */
export const utcApi = {
  parse: (value) => parseApiDate(value, 'Z'),
  dateTime: (value, fallback) => formatDateTime(value, fallback, 'Z'),
  date: (value, fallback) => formatDate(value, fallback, 'Z'),
  time: (value, fallback) => formatTime(value, fallback, 'Z'),
  clock: (value, fallback) => formatClock(value, fallback, 'Z'),
}

/** Epoch milliseconds, or null — for sorting and elapsed-time maths. */
export function apiDateMs(value) {
  return parseApiDate(value)?.getTime() ?? null
}
