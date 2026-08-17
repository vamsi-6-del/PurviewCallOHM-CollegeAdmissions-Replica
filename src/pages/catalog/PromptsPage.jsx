import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Pencil, Trash2 } from 'lucide-react'
import { listPrompts, deletePrompt } from '../../api/resources/catalog'
import { can } from '../../api/permissions'
import {
  PageShell, PageHeader, PrimaryButton, GhostButton, CardGrid, Pagination,
  ConfirmDialog, Banner, SearchBox,
} from '../../components/resource/ResourceKit'
import { formatDate } from '../../utils/datetime'

const LIMIT = 20

/** The prompt library agents draw from. */
export default function PromptsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listPrompts({ limit: LIMIT, offset, search: search.trim() || undefined })
      setRows(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e.message || 'Could not load prompts.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [offset, search])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  async function handleDelete() {
    setBusy(true)
    try {
      await deletePrompt(deleting.promptID)
      setDeleting(null)
      await load()
    } catch (e) {
      setError(e.message || 'Could not delete the prompt.')
    } finally {
      setBusy(false)
    }
  }

  const card = (row) => ({
    icon: FileText,
    title: row.title || 'Untitled',
    subtitle: row.last_modified_at
      ? `Updated ${formatDate(row.last_modified_at)}`
      : null,
    body: (
      <p className="line-clamp-3">{(row.promptText || '').trim() || 'No prompt text yet.'}</p>
    ),
    // An opening line is a sentence, not a short value — it wraps under its
    // label rather than being squeezed onto one right-aligned line.
    meta: row.initialSay
      ? [{ label: 'Opening line', value: row.initialSay, wrap: true }]
      : [],
    actions: (
      <>
        <GhostButton icon={Pencil} onClick={() => navigate(`/app/prompts/${row.promptID}`)}>
          {can.managePrompts() ? 'Edit' : 'View'}
        </GhostButton>
        {can.deletePrompts() ? (
          <GhostButton icon={Trash2} onClick={() => setDeleting(row)}>Delete</GhostButton>
        ) : null}
      </>
    ),
  })

  return (
    <PageShell>
      <PageHeader
        icon={FileText}
        title="Prompts"
        subtitle="Reusable instructions and opening lines for your agents"
        action={can.managePrompts() ? (
          <PrimaryButton onClick={() => navigate('/app/prompts/new')}>New prompt</PrimaryButton>
        ) : null}
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={(v) => { setOffset(0); setSearch(v) }} placeholder="Search prompts..." />
      </div>

      <CardGrid
        rows={rows}
        card={card}
        loading={loading}
        rowKey={(r) => r.promptID}
        onCardClick={(r) => navigate(`/app/prompts/${r.promptID}`)}
        emptyIcon={FileText}
        empty={search ? 'No prompts match that search.' : 'No prompts yet.'}
        emptyAction={!search && can.managePrompts() ? (
          <PrimaryButton onClick={() => navigate('/app/prompts/new')}>New prompt</PrimaryButton>
        ) : null}
      />

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} hasMore={rows.length >= LIMIT} />

      <ConfirmDialog
        open={Boolean(deleting)}
        busy={busy}
        title="Delete prompt"
        // Deliberately blunter than the agent dialog: agents go to a trash and
        // can be restored, prompts cannot, and the Agents page trains people to
        // expect an undo that does not exist here.
        message={`"${deleting?.title}" will be deleted permanently. There is no prompt trash to restore it from. Agents using it will lose their instructions.`}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </PageShell>
  )
}
