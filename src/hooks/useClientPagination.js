import { useMemo, useState } from 'react'

/**
 * Pagination for endpoints that return the whole list.
 *
 * /categories/, /companies/, /provider-accounts, /telephony-numbers and
 * /recording/list take no limit or offset — they answer with everything they
 * have. Wiring the shared Pagination control to a server offset on those pages
 * would produce a control that looks real and does nothing, so the slicing
 * happens here, over the list already in memory.
 *
 * Use this only where the route genuinely has no paging. Where the backend does
 * page (contacts, agents, call history, credits), keep passing limit/offset to
 * it: fetching thousands of rows to show twenty is the thing paging exists to
 * avoid.
 */
export function useClientPagination(items, pageSize = 20) {
  const [offset, setOffset] = useState(0)
  const list = Array.isArray(items) ? items : []

  // Clamped rather than reset from an effect: when a filter shrinks the list the
  // view must not stay parked past the end, and correcting it during render
  // avoids a pass where the table is empty.
  const safeOffset = offset >= list.length ? 0 : offset

  const pageItems = useMemo(
    () => list.slice(safeOffset, safeOffset + pageSize),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, safeOffset, pageSize],
  )

  return { offset: safeOffset, setOffset, total: list.length, pageItems, pageSize }
}
