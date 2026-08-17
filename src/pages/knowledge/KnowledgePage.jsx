import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, Download, FolderPlus, RefreshCw, Trash2, Upload, Link2, FileText } from 'lucide-react'
import {
  listDocuments, listFolders, createFolder, deleteFolder, uploadDocuments,
  createDocumentFromText, createDocumentFromUrl, deleteDocument, reprocessDocument,
  downloadDocument, getDocumentStats,
} from '../../api/resources/knowledge'
import { can } from '../../api/permissions'
import {
  PageShell, PageHeader, PrimaryButton, GhostButton, DataTable, Pagination,
  Drawer, ConfirmDialog, Banner, SearchBox, Badge, TextField, TextAreaField, SelectField,
} from '../../components/resource/ResourceKit'
import { formatDate } from '../../utils/datetime'

const LIMIT = 20

const STATUS_TONE = {
  ready: 'success',
  completed: 'success',
  processing: 'warning',
  pending: 'warning',
  failed: 'danger',
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1 }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

/** Knowledge documents and folders for the company. */
export default function KnowledgePage() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [folderId, setFolderId] = useState('')
  const [folders, setFolders] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const fileInputRef = useRef(null)

  const editable = can.manageKnowledge()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listDocuments({
        limit: LIMIT,
        offset,
        search: search.trim() || undefined,
        folderId: folderId || undefined,
      })
      setRows(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e.message || 'Could not load documents.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [offset, search, folderId])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  const loadFolders = useCallback(async () => {
    try {
      const data = await listFolders()
      setFolders(data.items)
    } catch { setFolders([]) }
  }, [])

  useEffect(() => { loadFolders() }, [loadFolders])

  useEffect(() => {
    getDocumentStats().then(setStats).catch(() => setStats(null))
  }, [])

  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setBusy(true)
    setError('')
    try {
      await uploadDocuments(files, { folderId: folderId || undefined })
      await load()
    } catch (e) {
      setError(e.message || 'Upload failed.')
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await deleteDocument(deleting.knowledge_document_id)
      setDeleting(null)
      await load()
    } catch (e) {
      setError(e.message || 'Could not delete the document.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDownload(row) {
    try {
      const blob = await downloadDocument(row.knowledge_document_id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = row.file_name || row.title || 'document'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message || 'Download failed.')
    }
  }

  const columns = [
    {
      key: 'title',
      header: 'Document',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(99,102,241,0.12)', color: '#4f46e5' }}>
            {row.source_type === 'url' ? <Link2 size={14} /> : <FileText size={14} />}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.title || row.file_name || 'Untitled'}</p>
            <p className="truncate text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
              {row.source_url || row.file_name || row.mime_type || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'ingestion_status',
      header: 'Status',
      render: (r) => (
        <Badge tone={STATUS_TONE[r.ingestion_status] || 'neutral'}>
          {r.ingestion_status || 'unknown'}
        </Badge>
      ),
    },
    { key: 'chunk_count', header: 'Chunks', render: (r) => r.chunk_count ?? '—' },
    { key: 'file_size_bytes', header: 'Size', render: (r) => formatBytes(r.file_size_bytes ?? r.storage_bytes) },
    {
      key: 'created_at',
      header: 'Added',
      render: (r) => formatDate(r.created_at),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <GhostButton icon={Download} onClick={() => handleDownload(row)}>Download</GhostButton>
          {editable ? (
            <>
              <GhostButton
                icon={RefreshCw}
                onClick={() => reprocessDocument(row.knowledge_document_id).then(load).catch((e) => setError(e.message))}
              >
                Reprocess
              </GhostButton>
              <GhostButton icon={Trash2} onClick={() => setDeleting(row)}>Delete</GhostButton>
            </>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <PageShell>
      <PageHeader
        icon={BookOpen}
        title="Knowledge base"
        subtitle={stats
          ? `${stats.total_documents ?? 0} documents · ${stats.ready_documents ?? 0} ready · ${formatBytes(stats.total_storage_bytes)}`
          : 'Documents your agents can draw on during calls'}
        action={editable ? (
          <div className="flex items-center gap-2">
            <GhostButton icon={FolderPlus} onClick={() => setFolderOpen(true)}>New folder</GhostButton>
            <GhostButton icon={Upload} busy={busy} onClick={() => fileInputRef.current?.click()}>Upload</GhostButton>
            <PrimaryButton onClick={() => setAddOpen(true)}>Add document</PrimaryButton>
          </div>
        ) : null}
      />

      <input ref={fileInputRef} type="file" multiple hidden onChange={handleUpload} />

      <Banner onDismiss={() => setError('')}>{error}</Banner>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchBox value={search} onChange={(v) => { setOffset(0); setSearch(v) }} placeholder="Search documents..." />
        <div className="w-full sm:w-56">
          <SelectField
            value={folderId}
            onChange={(v) => { setOffset(0); setFolderId(v) }}
            placeholder="All folders"
            options={folders.map((f) => ({ id: f.folder_id, label: f.name }))}
          />
        </div>
        {folderId && editable ? (
          <GhostButton
            icon={Trash2}
            onClick={() => deleteFolder(folderId)
              .then(() => { setFolderId(''); loadFolders() })
              .catch((e) => setError(e.message))}
          >
            Delete folder
          </GhostButton>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(r) => r.knowledge_document_id}
        empty={editable ? 'No documents yet. Upload a file or add text or a URL.' : 'No documents available.'}
      />

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} hasMore={rows.length >= LIMIT} />

      <AddDocumentDrawer
        open={addOpen}
        folders={folders}
        defaultFolderId={folderId}
        onClose={() => setAddOpen(false)}
        onAdded={async () => { setAddOpen(false); await load() }}
        onError={setError}
      />

      <NewFolderDrawer
        open={folderOpen}
        onClose={() => setFolderOpen(false)}
        onCreated={async () => { setFolderOpen(false); await loadFolders() }}
        onError={setError}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        busy={busy}
        title="Delete document"
        message={`"${deleting?.title || deleting?.file_name}" will be removed from the knowledge base.`}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </PageShell>
  )
}

function AddDocumentDrawer({ open, onClose, onAdded, onError, folders, defaultFolderId }) {
  const [mode, setMode] = useState('text')
  const [form, setForm] = useState({ title: '', text: '', url: '', folderId: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setForm({ title: '', text: '', url: '', folderId: defaultFolderId || '' })
  }, [open, defaultFolderId])

  async function submit() {
    setBusy(true)
    try {
      if (mode === 'text') {
        await createDocumentFromText({
          title: form.title,
          text: form.text,
          folderId: form.folderId || undefined,
        })
      } else {
        await createDocumentFromUrl({
          url: form.url,
          title: form.title || undefined,
          folderId: form.folderId || undefined,
        })
      }
      onAdded()
    } catch (e) {
      onError(e.message || 'Could not add the document.')
    } finally {
      setBusy(false)
    }
  }

  const valid = mode === 'text' ? form.title.trim() && form.text.trim() : form.url.trim()

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title="Add document"
      subtitle="Paste text or point at a public URL. Files use the Upload button."
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton icon={BookOpen} busy={busy} disabled={!valid} onClick={submit}>Add</PrimaryButton>
        </>
      }
    >
      <div className="mb-4 flex gap-1.5">
        {[{ id: 'text', label: 'Text' }, { id: 'url', label: 'URL' }].map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setMode(entry.id)}
            className="rounded-lg px-3.5 py-2 text-[12.5px] font-medium"
            style={mode === entry.id
              ? { background: 'var(--ui-accent-soft)', color: 'var(--ui-accent-strong)' }
              : { color: 'var(--ui-text-3)' }}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {mode === 'url' ? (
          <TextField
            label="URL"
            value={form.url}
            onChange={(v) => setForm((p) => ({ ...p, url: v }))}
            placeholder="https://example.edu/admissions/faq"
          />
        ) : null}
        <TextField
          label={mode === 'url' ? 'Title (optional)' : 'Title'}
          value={form.title}
          onChange={(v) => setForm((p) => ({ ...p, title: v }))}
        />
        {mode === 'text' ? (
          <TextAreaField
            label="Content"
            rows={12}
            value={form.text}
            onChange={(v) => setForm((p) => ({ ...p, text: v }))}
          />
        ) : null}
        <SelectField
          label="Folder"
          value={form.folderId}
          onChange={(v) => setForm((p) => ({ ...p, folderId: v }))}
          placeholder="No folder"
          options={folders.map((f) => ({ id: f.folder_id, label: f.name }))}
        />
      </div>
    </Drawer>
  )
}

function NewFolderDrawer({ open, onClose, onCreated, onError }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (open) setName('') }, [open])

  async function submit() {
    setBusy(true)
    try {
      await createFolder({ name })
      onCreated()
    } catch (e) {
      onError(e.message || 'Could not create the folder.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New folder"
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton icon={FolderPlus} busy={busy} disabled={!name.trim()} onClick={submit}>Create</PrimaryButton>
        </>
      }
    >
      <TextField label="Folder name" value={name} onChange={setName} autoFocus />
    </Drawer>
  )
}
