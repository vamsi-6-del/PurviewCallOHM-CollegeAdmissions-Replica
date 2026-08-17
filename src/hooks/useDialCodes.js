import { useEffect, useMemo, useState } from 'react'
import { listCountryCodes } from '../api/resources/contacts'
import { COUNTRY_CODES } from '../utils/countryCodes'

/**
 * The dial codes offered by the contact form and the manual dialer.
 *
 * Whatever /contacts/country-codes returns is merged with the bundled list:
 * the backend is authoritative for which codes exist, while the bundled list
 * supplies country names it omits and fills in the rest. Without the fallback
 * an empty or unparsed response leaves the picker with nothing, which is how
 * the form ended up offering the default prefix alone.
 *
 * Shared by both callers so a fix to the merge applies to both.
 */
export function useDialCodes() {
  const [remote, setRemote] = useState([])

  useEffect(() => {
    let cancelled = false
    listCountryCodes()
      .then((entries) => { if (!cancelled) setRemote(entries) })
      .catch(() => { if (!cancelled) setRemote([]) })
    return () => { cancelled = true }
  }, [])

  return useMemo(() => {
    const byCode = new Map()
    for (const entry of remote) {
      if (entry?.dialCode) byCode.set(entry.dialCode, { ...entry })
    }
    for (const country of COUNTRY_CODES) {
      const known = byCode.get(country.dialCode)
      if (known) known.name = known.name || country.name
      else {
        byCode.set(country.dialCode, {
          dialCode: country.dialCode,
          name: country.name,
          isoCode: country.isoCode,
        })
      }
    }
    return [...byCode.values()].sort((a, b) => (a.name || a.dialCode).localeCompare(b.name || b.dialCode))
  }, [remote])
}
