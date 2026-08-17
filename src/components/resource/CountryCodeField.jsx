import { useMemo } from 'react'
import { SearchSelect } from './SearchSelect'

/**
 * Dial-code picker.
 *
 * Thin adapter over SearchSelect: it maps the `{ dialCode, name, isoCode }`
 * shape the dial-code list uses onto the generic option shape, so the combobox
 * behaviour (search, keyboard, portalled panel) lives in one place rather than
 * being duplicated per picker.
 */
export function CountryCodeField({ label = 'Country code', value, onChange, options = [], disabled }) {
  const items = useMemo(
    () => options.map((entry) => ({
      id: entry.dialCode,
      label: entry.name || entry.isoCode || 'Unknown',
      hint: entry.dialCode,
    })),
    [options],
  )

  return (
    <SearchSelect
      label={label}
      value={value}
      onChange={onChange}
      options={items}
      placeholder="Select country"
      searchPlaceholder="Search country or code"
      emptyText="No country matches"
      disabled={disabled}
    />
  )
}

export default CountryCodeField
