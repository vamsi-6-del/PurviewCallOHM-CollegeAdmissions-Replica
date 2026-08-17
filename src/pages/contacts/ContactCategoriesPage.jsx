import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tags, Pencil, Trash2, Users, ChevronRight } from 'lucide-react'
import {
  listCategories, createCategory, updateCategory, deleteCategory,
} from '../../api/resources/catalog'
import { can, canViewPage } from '../../api/permissions'
import {
  PageShell, PageHeader, PrimaryButton, GhostButton, CardGrid, Drawer,
  ConfirmDialog, Banner, TextField, TextAreaField, SearchBox, Pagination,
} from '../../components/resource/ResourceKit'
import { useClientPagination } from '../../hooks/useClientPagination'

/**
 * The contacts entry point.
 *
 * Contacts belong to a category on this backend — the list and import routes
 * both require one — so browsing starts here: pick a category, then open it to
 * see the people in it. This page's search narrows the categories themselves;
 * searching for a person happens inside a category, where the contacts are.
 */
export default function ContactCategoriesPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const [search, setSearch] = useState('')

  // Categories are the page's own resource, but a company policy can switch
  // the categories page off while leaving contacts on — then this is a
  // read-only index.
  const manageable = canViewPage('categories', can.manageCategories)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listCategories()
      setRows(data.items)
    } catch (e) {
      setError(e.message || 'Could not load categories.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(form) {
    setBusy(true)
    setError('')
    try {
      const id = editing?.categoryID ?? editing?.category_id
      if (id) await updateCategory(id, form)
      else await createCategory(form)
      setEditing(null)
      await load()
    } catch (e) {
      setError(e.message || 'Could not save the category.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await deleteCategory(deleting.categoryID ?? deleting.category_id)
      setDeleting(null)
      await load()
    } catch (e) {
      setError(e.message || 'Could not delete the category.')
    } finally {
      setBusy(false)
    }
  }

  const idOf = (c) => c.categoryID ?? c.category_id
  const nameOf = (c) => c.categoryName ?? c.category_name ?? 'Untitled'

  // /categories returns the full list in one call, so the filter runs here
  // rather than as a round trip. Descriptions are matched too — a category is
  // as often remembered by what it holds as by its name.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => (
      nameOf(row).toLowerCase().includes(term)
      || (row.description || '').toLowerCase().includes(term)
    ))
  }, [rows, search])

  const categoryCard = (row) => {
    const count = row.contactCount ?? row.contact_count ?? row.count
    return {
      icon: Tags,
      title: nameOf(row),
      subtitle: idOf(row),
      body: (
        <p className="line-clamp-2" style={{ color: row.description ? undefined : 'var(--ui-text-3)' }}>
          {row.description || 'No description'}
        </p>
      ),
      meta: Number.isFinite(count)
        ? [{ label: 'Contacts', value: count }]
        : [],
      actions: (
        <>
          <span
            className="mr-auto inline-flex items-center gap-1 text-[12px] font-semibold"
            style={{ color: 'var(--ui-accent-strong)' }}
          >
            <Users size={13} /> View contacts <ChevronRight size={13} />
          </span>
          {manageable ? (
            <>
              <GhostButton icon={Pencil} onClick={() => setEditing(row)}>Edit</GhostButton>
              <GhostButton icon={Trash2} onClick={() => setDeleting(row)}>Delete</GhostButton>
            </>
          ) : null}
        </>
      ),
    }
  }

  const searchMode = Boolean(search.trim())

  const {
    offset, setOffset, total, pageItems, pageSize,
  } = useClientPagination(visible)

  return (
    <PageShell>
      <PageHeader
        icon={Users}
        title="Contacts"
        subtitle="Contacts are grouped into categories. Open one to see the people in it"
        action={manageable ? (
          <PrimaryButton onClick={() => setEditing({ categoryName: '', description: '' })}>
            New category
          </PrimaryButton>
        ) : null}
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search categories..." />
      </div>

      <CardGrid
        rows={pageItems}
        card={categoryCard}
        loading={loading}
        rowKey={idOf}
        onCardClick={(r) => navigate(`/app/contacts/${idOf(r)}`)}
        emptyIcon={Tags}
        empty={searchMode
          ? `No categories match "${search.trim()}".`
          : manageable
            ? 'No categories yet. Create one before adding contacts.'
            : 'No contact categories have been set up yet.'}
        emptyAction={!searchMode && manageable ? (
          <PrimaryButton onClick={() => setEditing({ categoryName: '', description: '' })}>
            New category
          </PrimaryButton>
        ) : null}
      />

      <Pagination total={total} limit={pageSize} offset={offset} onChange={setOffset} />

      <CategoryDrawer
        category={editing}
        busy={busy}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        busy={busy}
        title="Delete category"
        message={`"${deleting ? nameOf(deleting) : ''}" will be deleted, along with the contacts grouped under it.`}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </PageShell>
  )
}

function CategoryDrawer({ category, onClose, onSave, busy }) {
  const [form, setForm] = useState({ categoryName: '', description: '' })

  useEffect(() => {
    if (!category) return
    setForm({
      categoryName: category.categoryName ?? category.category_name ?? '',
      description: category.description ?? '',
    })
  }, [category])

  const isEdit = Boolean(category?.categoryID ?? category?.category_id)

  return (
    <Drawer
      open={Boolean(category)}
      onClose={onClose}
      title={isEdit ? 'Edit category' : 'New category'}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton
            icon={Tags}
            busy={busy}
            disabled={!form.categoryName.trim()}
            onClick={() => onSave(form)}
          >
            Save
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <TextField
          label="Name"
          value={form.categoryName}
          onChange={(v) => setForm((p) => ({ ...p, categoryName: v }))}
          placeholder="Undergraduate applicants"
          autoFocus
        />
        <TextAreaField
          label="Description"
          rows={3}
          value={form.description}
          onChange={(v) => setForm((p) => ({ ...p, description: v }))}
        />
      </div>
    </Drawer>
  )
}
