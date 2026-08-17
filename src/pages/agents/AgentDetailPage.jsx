import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Bot, Save, Sparkles, Sliders, PhoneForwarded, BookOpen, Folder, FileText, X, Plus,
  ClipboardCheck, Radio,
} from 'lucide-react'
import AgentPreviewModal from './AgentPreviewModal'
import {
  getAgentDetail, saveAgentDetail, listTimezones, listAudioQualities,
  getAnalysisConfig, updateAnalysisConfig, listAgents, transferPayload,
} from '../../api/resources/agents'
import {
  listAllLlmModels, listAllVoices, listAllSttModels, listAllPrompts,
  listCategories, createCategory, getVoiceAudio,
} from '../../api/resources/catalog'
import {
  listAgentAccess, grantAgentAccess, revokeAgentAccess, listFolders, listDocuments,
} from '../../api/resources/knowledge'
import { can } from '../../api/permissions'
import {
  PageShell, PageHeader, PrimaryButton, GhostButton, Banner, Badge,
  TextField, TextAreaField, SelectField, FieldLabel, SelectWithCreate, VoicePreviewButton,
} from '../../components/resource/ResourceKit'
import { formatDate } from '../../utils/datetime'

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="ui-card mb-5">
      <div className="agent-section-header">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg">
            <Icon size={15} />
          </span>
          <div>
            <h2 className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--ui-text)' }}>{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="agent-section-body">{children}</div>
    </section>
  )
}

function Toggle({ label, checked, onChange, disabled }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 agent-card">
      <span className="text-[12.5px]" style={{ color: 'var(--ui-text)' }}>{label}</span>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-indigo-600"
      />
    </label>
  )
}

/* ── knowledge access ───────────────────────────────────────────────────── */

const grantDocId = (g) => g?.knowledge_document_id ?? g?.document_id
const grantFolderId = (g) => g?.folder_id ?? g?.knowledge_folder_id
const grantLabel = (g) => g?.name ?? g?.title ?? g?.folder_name ?? g?.document_name
  ?? grantDocId(g) ?? grantFolderId(g) ?? '—'

/**
 * What this agent may read from the knowledge base.
 *
 * Grants are separate records from the agent itself, so this section saves
 * immediately rather than waiting for the page's Save button — otherwise a
 * grant would look pending when it had already taken effect.
 */
function KnowledgeSection({ agentId, editable, onError }) {
  const [grants, setGrants] = useState([])
  const [folders, setFolders] = useState([])
  const [documents, setDocuments] = useState([])
  const [folderPick, setFolderPick] = useState('')
  const [docPick, setDocPick] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listAgentAccess(agentId)
      setGrants(data.items)
    } catch (e) {
      onError(e.message || 'Could not load knowledge access.')
      setGrants([])
    } finally {
      setLoading(false)
    }
  }, [agentId, onError])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    listFolders().then((d) => setFolders(d.items)).catch(() => setFolders([]))
    listDocuments({ limit: 100 }).then((d) => setDocuments(d.items)).catch(() => setDocuments([]))
  }, [])

  async function grant(payload, reset) {
    setBusy(true)
    try {
      await grantAgentAccess(agentId, payload)
      reset()
      await load()
    } catch (e) {
      onError(e.message || 'Could not grant access.')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(item) {
    setBusy(true)
    try {
      const documentId = grantDocId(item)
      await revokeAgentAccess(agentId, documentId ? { documentId } : { folderId: grantFolderId(item) })
      await load()
    } catch (e) {
      onError(e.message || 'Could not revoke access.')
    } finally {
      setBusy(false)
    }
  }

  // Already-granted entries are dropped from the pickers so the same folder
  // cannot be added twice.
  const grantedFolders = new Set(grants.map(grantFolderId).filter(Boolean))
  const grantedDocs = new Set(grants.map(grantDocId).filter(Boolean))

  const folderOptions = folders
    .filter((f) => !grantedFolders.has(f.folder_id ?? f.id))
    .map((f) => ({ id: f.folder_id ?? f.id, label: f.name ?? f.folder_name ?? f.folder_id }))

  const docOptions = documents
    .filter((d) => !grantedDocs.has(d.knowledge_document_id ?? d.id))
    .map((d) => ({
      id: d.knowledge_document_id ?? d.id,
      label: d.title ?? d.name ?? d.file_name ?? d.knowledge_document_id,
    }))

  return (
    <Section
      icon={BookOpen}
      title="Knowledge"
      description="Folders and documents this agent can draw on during a call."
    >
      {loading ? (
        <p className="text-[12.5px]" style={{ color: 'var(--ui-text-3)' }}>Loading access…</p>
      ) : grants.length ? (
        <div className="grid gap-2">
          {grants.map((item) => {
            const isFolder = !grantDocId(item)
            return (
              <div
                key={grantDocId(item) ?? grantFolderId(item)}
                className="agent-card flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span style={{ color: 'var(--ui-text-3)' }}>
                    {isFolder ? <Folder size={14} /> : <FileText size={14} />}
                  </span>
                  <span className="truncate text-[12.5px]" style={{ color: 'var(--ui-text)' }}>
                    {grantLabel(item)}
                  </span>
                  <Badge>{isFolder ? 'Folder' : 'Document'}</Badge>
                </span>
                {editable ? (
                  <button
                    type="button"
                    onClick={() => revoke(item)}
                    disabled={busy}
                    title="Revoke access"
                    className="shrink-0 rounded-lg p-1.5"
                    style={{ color: 'var(--ui-text-3)' }}
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-[12.5px]" style={{ color: 'var(--ui-text-3)' }}>
          This agent has no knowledge access yet. It will answer only from its prompt.
        </p>
      )}

      {editable ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Grant a folder</FieldLabel>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <SelectField
                  value={folderPick}
                  onChange={setFolderPick}
                  placeholder={folderOptions.length ? 'Choose a folder' : 'No folders available'}
                  options={folderOptions}
                />
              </div>
              <button
                type="button"
                className="ui-btn shrink-0"
                disabled={busy || !folderPick}
                onClick={() => grant({ folderId: folderPick }, () => setFolderPick(''))}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          <div>
            <FieldLabel>Grant a document</FieldLabel>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <SelectField
                  value={docPick}
                  onChange={setDocPick}
                  placeholder={docOptions.length ? 'Choose a document' : 'No documents available'}
                  options={docOptions}
                />
              </div>
              <button
                type="button"
                className="ui-btn shrink-0"
                disabled={busy || !docPick}
                onClick={() => grant({ documentId: docPick }, () => setDocPick(''))}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Section>
  )
}

/* ── post-call analysis ─────────────────────────────────────────────────── */

/**
 * What the QA analyser looks for after a call with this agent.
 *
 * The config is its own record with its own endpoints, so — like knowledge
 * access — it saves on its own rather than through the page's Save button.
 */
function AnalysisSection({ agentId, editable, onError }) {
  const [config, setConfig] = useState(null)
  const [criteria, setCriteria] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [summary, setSummary] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAnalysisConfig(agentId)
      .then((data) => {
        if (cancelled) return
        setConfig(data)
        setEnabled(data?.enabled ?? data?.analysis_enabled ?? true)
        setSummary(data?.summary_enabled ?? data?.generate_summary ?? true)
        // Criteria come back as a list on some shapes and a block of text on
        // others; edit them as one line-per-item either way.
        const raw = data?.criteria ?? data?.evaluation_criteria ?? data?.success_criteria
        setCriteria(Array.isArray(raw) ? raw.join('\n') : (raw ?? ''))
      })
      .catch(() => { if (!cancelled) setConfig(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [agentId])

  async function save() {
    setSaving(true)
    try {
      const list = criteria.split('\n').map((line) => line.trim()).filter(Boolean)
      await updateAnalysisConfig(agentId, {
        ...(config && typeof config === 'object' ? config : {}),
        enabled,
        summary_enabled: summary,
        criteria: list,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      onError(e.message || 'Could not save the analysis config.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section
      icon={ClipboardCheck}
      title="Call analysis"
      description="What the post-call QA report scores this agent's calls against."
    >
      {loading ? (
        <p className="text-[12.5px]" style={{ color: 'var(--ui-text-3)' }}>Loading analysis config…</p>
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Toggle label="Analyse calls" checked={enabled} disabled={!editable} onChange={setEnabled} />
            <Toggle label="Generate summary" checked={summary} disabled={!editable} onChange={setSummary} />
          </div>

          <TextAreaField
            label="Evaluation criteria (one per line)"
            rows={6}
            value={criteria}
            disabled={!editable || !enabled}
            onChange={setCriteria}
            placeholder={'Did the agent confirm the student\'s name?\nWas the course fee explained?\nWas a campus visit offered?'}
          />

          {editable ? (
            <div className="flex items-center justify-end gap-3">
              {saved ? (
                <span className="text-[11.5px]" style={{ color: '#0f9d6e' }}>Analysis config saved.</span>
              ) : null}
              <GhostButton icon={Save} busy={saving} onClick={save}>Save analysis</GhostButton>
            </div>
          ) : null}
        </div>
      )}
    </Section>
  )
}

/**
 * Where a transferred call can go.
 *
 * Two kinds of target, because the backend takes two: a phone number for a
 * human desk, and another agent for a hand-off between bots (a different
 * language, say). The label is what the caller-facing agent matches on — "put
 * me through to accounts" only works if a target is called Accounts — so it is
 * required alongside the number rather than decorative.
 */
function TransferTargets({ destinations, agentTargets, agentOptions, editable, onChange }) {
  const patch = (key, list, index, changes) => {
    onChange(key, list.map((row, i) => (i === index ? { ...row, ...changes } : row)))
  }
  const remove = (key, list, index) => onChange(key, list.filter((_, i) => i !== index))

  const nothingConfigured = !destinations.length && !agentTargets.length

  return (
    <div className="mt-4 grid gap-4">
      {nothingConfigured ? (
        <Banner>
          Call transfer is on, but there is nowhere to transfer to. The agent will tell callers
          it cannot transfer them. Add at least one destination below.
        </Banner>
      ) : null}

      <div>
        <FieldLabel>Transfer to a number</FieldLabel>
        <div className="grid gap-2">
          {destinations.map((row, index) => (
            <div key={index} className="ui-card grid grid-cols-1 gap-2 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <TextField
                label="Label"
                placeholder="Admission desk"
                value={row.label ?? ''}
                disabled={!editable}
                onChange={(v) => patch('transfer_destinations', destinations, index, { label: v })}
              />
              <TextField
                label="Number"
                placeholder="+919876543210"
                inputMode="tel"
                value={row.number ?? ''}
                disabled={!editable}
                onChange={(v) => patch('transfer_destinations', destinations, index, { number: v })}
              />
              {editable ? (
                <button
                  type="button"
                  className="ui-btn mb-0.5"
                  onClick={() => remove('transfer_destinations', destinations, index)}
                >
                  <X size={13} /> Remove
                </button>
              ) : null}
            </div>
          ))}
          {editable ? (
            <button
              type="button"
              className="ui-btn w-full"
              onClick={() => onChange('transfer_destinations', [...destinations, { label: '', number: '' }])}
            >
              <Plus size={14} /> Add a number
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
          Use the full international format, including the country code.
        </p>
      </div>

      <div>
        <FieldLabel>Transfer to another agent</FieldLabel>
        <div className="grid gap-2">
          {agentTargets.map((row, index) => (
            <div key={index} className="ui-card grid grid-cols-1 gap-2 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <TextField
                label="Label"
                placeholder="Hindi agent"
                value={row.label ?? ''}
                disabled={!editable}
                onChange={(v) => patch('transfer_agents', agentTargets, index, { label: v })}
              />
              <SelectField
                label="Agent"
                placeholder="Choose an agent"
                value={row.agent_id ?? ''}
                disabled={!editable}
                options={agentOptions}
                onChange={(v) => patch('transfer_agents', agentTargets, index, { agent_id: v })}
              />
              {editable ? (
                <button
                  type="button"
                  className="ui-btn mb-0.5"
                  onClick={() => remove('transfer_agents', agentTargets, index)}
                >
                  <X size={13} /> Remove
                </button>
              ) : null}
            </div>
          ))}
          {editable ? (
            <button
              type="button"
              className="ui-btn w-full"
              disabled={!agentOptions.length}
              onClick={() => onChange('transfer_agents', [...agentTargets, { label: '', agent_id: '' }])}
            >
              <Plus size={14} /> Add an agent
            </button>
          ) : null}
        </div>
        {!agentOptions.length ? (
          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
            No other active agents to hand a call to yet.
          </p>
        ) : null}
      </div>
    </div>
  )
}

/** Edits one agent plus its linked prompt record. */
export default function AgentDetailPage() {
  const { agentId } = useParams()
  const navigate = useNavigate()

  const [agent, setAgent] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [catalog, setCatalog] = useState({
    llms: [], voices: [], stts: [], categories: [], prompts: [], timezones: [], qualities: [],
  })
  /** Other agents this one can hand a call to — never itself. */
  const [transferableAgents, setTransferableAgents] = useState([])

  const editable = can.manageAgents()

  useEffect(() => {
    listAgents({ limit: 100, isActive: true })
      .then((d) => setTransferableAgents(
        d.items
          .filter((a) => a.agentID !== agentId)
          .map((a) => ({ id: a.agentID, label: a.agentName || a.agentID })),
      ))
      .catch(() => setTransferableAgents([]))
  }, [agentId])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAgentDetail(agentId)
      setAgent(data)
      setForm({
        agentName: data.agentName ?? '',
        llmID: data.llmID ?? '',
        voiceID: data.voiceID ?? '',
        sttID: data.sttID ?? '',
        categoryID: data.categoryID ?? '',
        promptID: data.promptID ?? '',
        timezone: data.timezone ?? '',
        audio_quality: data.audio_quality ?? '',
        promptText: data.prompt?.promptText ?? '',
        initialSay: data.prompt?.initialSay ?? '',
        variables: data.prompt?.variables ?? {},
        llm_settings: data.llm_settings ?? {},
        voicemail_detection_enabled: data.voicemail_detection_enabled,
        transfer_enabled: data.transfer_enabled,
        transfer_destinations: Array.isArray(data.transfer_destinations) ? data.transfer_destinations : [],
        transfer_agents: Array.isArray(data.transfer_agents) ? data.transfer_agents : [],
        callback_enabled: data.callback_enabled,
        block_greeting_interruption: data.block_greeting_interruption,
      })
    } catch (e) {
      setError(e.message || 'Could not load this agent.')
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [llms, voices, stts, categories, prompts, timezones, qualities] = await Promise.all([
        listAllLlmModels().catch(() => ({ items: [] })),
        listAllVoices().catch((e) => { setError(`Could not load voices: ${e.message}`); return { items: [] } }),
        listAllSttModels().catch(() => ({ items: [] })),
        listCategories().catch(() => ({ items: [] })),
        listAllPrompts().catch(() => ({ items: [] })),
        listTimezones().catch(() => []),
        listAudioQualities().catch(() => []),
      ])
      if (cancelled) return
      setCatalog({
        llms: llms.items,
        voices: voices.items,
        stts: stts.items,
        categories: categories.items,
        prompts: prompts.items,
        timezones: Array.isArray(timezones) ? timezones : (timezones?.items ?? []),
        qualities: Array.isArray(qualities) ? qualities : (qualities?.items ?? []),
      })
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!success) return
    const id = setTimeout(() => setSuccess(''), 3000)
    return () => clearTimeout(id)
  }, [success])

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    // Refused rather than quietly saved with the toggle flipped back off:
    // "transfer on, nowhere to transfer to" is the state that makes an agent
    // tell callers it cannot transfer them.
    const targets = transferPayload(form)
    if (form.transfer_enabled && !targets.transfer_enabled) {
      setError('Call transfer needs at least one destination with both a label and a number (or an agent). Add one, or switch call transfer off.')
      return
    }

    setSaving(true)
    setError('')
    try {
      setAgent(await saveAgentDetail(agentId, form, agent))
      setSuccess('Agent saved.')
    } catch (e) {
      setError(e.message || 'Could not save the agent.')
    } finally {
      setSaving(false)
    }
  }

  /** Creates a category inline and selects it. */
  async function handleCreateCategory(name) {
    const created = await createCategory({ categoryName: name })
    const id = created?.categoryID ?? created?.category_id
    setCatalog((prev) => ({ ...prev, categories: [...prev.categories, created] }))
    return { id, label: created?.categoryName ?? name }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="ui-card p-12 text-center text-[13px]" style={{ color: 'var(--ui-text-3)' }}>
          Loading agent...
        </div>
      </PageShell>
    )
  }

  if (!form) {
    return (
      <PageShell>
        <Banner>{error || 'Agent not found.'}</Banner>
        <GhostButton icon={ArrowLeft} onClick={() => navigate('/app/agents')}>Back to agents</GhostButton>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        icon={Bot}
        title={form.agentName || 'Agent'}
        subtitle={agentId}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <GhostButton icon={ArrowLeft} onClick={() => navigate('/app/agents')}>Back</GhostButton>
            <GhostButton icon={Radio} onClick={() => setPreviewOpen(true)}>Preview</GhostButton>
            {editable ? (
              <PrimaryButton icon={Save} busy={saving} onClick={handleSave}>Save</PrimaryButton>
            ) : null}
          </div>
        )}
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>
      {success ? <Banner tone="success">{success}</Banner> : null}
      {!editable ? (
        <Banner tone="success">
          You have read-only access to agents. Editing requires a company admin.
        </Banner>
      ) : null}

      <Section icon={Sliders} title="Core identity" description="Name, model, voice and speech recognition.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField label="Agent name" value={form.agentName} onChange={(v) => set('agentName', v)} disabled={!editable} />
          <SelectField
            label="LLM"
            value={form.llmID}
            onChange={(v) => set('llmID', v)}
            disabled={!editable}
            options={catalog.llms.map((m) => ({ id: m.llmID, label: m.llmName || m.modelName || m.llmID }))}
          />
          <div>
            <div className="flex items-center justify-between">
              <FieldLabel>Voice</FieldLabel>
              <span className="mb-2">
                <VoicePreviewButton
                  voiceId={form.voiceID}
                  fetchAudio={getVoiceAudio}
                  onError={setError}
                />
              </span>
            </div>
            <select
              value={form.voiceID}
              disabled={!editable}
              onChange={(e) => set('voiceID', e.target.value)}
              className="ui-input w-full rounded-xl px-3 py-2.5 text-[13px]"
            >
              <option value="">Choose voice</option>
              {catalog.voices.map((v) => (
                <option key={v.voiceID} value={v.voiceID}>
                  {v.purviewVoiceName || v.voiceID}{v.language_code ? ` (${v.language_code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <SelectField
            label="Speech to text"
            value={form.sttID}
            onChange={(v) => set('sttID', v)}
            disabled={!editable}
            options={catalog.stts.map((m) => ({ id: m.sttID, label: m.sttName || m.modelName || m.sttID }))}
          />
          <SelectWithCreate
            label="Contact category"
            value={form.categoryID}
            onChange={(v) => set('categoryID', v)}
            disabled={!editable}
            placeholder="No category"
            canCreate={can.manageCategories()}
            createPlaceholder="Category name"
            onCreate={handleCreateCategory}
            options={catalog.categories.map((c) => ({
              id: c.categoryID ?? c.category_id,
              label: c.categoryName ?? c.category_name ?? c.categoryID,
            }))}
            emptyHint={can.manageCategories()
              ? 'No categories yet. Use "+ New" to add one.'
              : 'No categories yet. An admin can create one.'}
          />
          <SelectField
            label="Timezone"
            value={form.timezone}
            onChange={(v) => set('timezone', v)}
            disabled={!editable}
            placeholder="Default"
            options={catalog.timezones.map((t) => {
              const id = typeof t === 'string' ? t : (t.timezone ?? t.id ?? t.value)
              return { id, label: id }
            })}
          />
        </div>
      </Section>

      <Section
        icon={Sparkles}
        title="Prompt"
        description="Opening line and system instructions. Stored as a linked prompt record."
      >
        <div className="grid gap-4">
          <div>
            <FieldLabel>Linked prompt</FieldLabel>
            <select
              value={form.promptID ?? ''}
              disabled={!editable}
              onChange={(e) => {
                const id = e.target.value
                const picked = catalog.prompts.find((p) => p.promptID === id)
                // Swapping prompts loads that record's text into the editor.
                setForm((prev) => ({
                  ...prev,
                  promptID: id,
                  promptText: picked?.promptText ?? (id ? prev.promptText : ''),
                  initialSay: picked?.initialSay ?? (id ? prev.initialSay : ''),
                }))
              }}
              className="ui-input w-full rounded-xl px-3 py-2.5 text-[13px]"
            >
              <option value="">New prompt for this agent</option>
              {catalog.prompts.map((p) => (
                <option key={p.promptID} value={p.promptID}>{p.title || p.promptID}</option>
              ))}
            </select>
            <p className="mt-2 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
              Editing the text below changes the linked prompt everywhere it is used.
              Choose &ldquo;New prompt&rdquo; to give this agent its own copy.
            </p>
          </div>

          <TextAreaField
            label="First message"
            rows={2}
            value={form.initialSay}
            onChange={(v) => set('initialSay', v)}
            disabled={!editable}
            placeholder="Hello, I'm calling from the admissions office..."
          />
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <FieldLabel>System prompt</FieldLabel>
              <span className="text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
                {(form.promptText || '').length.toLocaleString()} characters
              </span>
            </div>
            <textarea
              value={form.promptText}
              onChange={(e) => set('promptText', e.target.value)}
              disabled={!editable}
              rows={18}
              placeholder="You are an admissions voice assistant..."
              className="ui-input w-full resize-y rounded-xl px-3.5 py-3 font-mono text-[12.5px] leading-relaxed"
            />
          </div>
          {agent?.promptID ? (
            <p className="text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
              Linked prompt <span className="font-mono">{agent.promptID}</span>
              {agent.prompt?.title ? `: ${agent.prompt.title}` : ''}
            </p>
          ) : (
            <p className="text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
              No prompt linked yet. One is created when you save with text here.
            </p>
          )}
        </div>
      </Section>

      <KnowledgeSection agentId={agentId} editable={editable} onError={setError} />

      <AnalysisSection agentId={agentId} editable={editable} onError={setError} />

      <Section icon={PhoneForwarded} title="Call behaviour" description="How the agent handles the call itself.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Toggle
            label="Voicemail detection"
            checked={form.voicemail_detection_enabled}
            disabled={!editable}
            onChange={(v) => set('voicemail_detection_enabled', v)}
          />
          <Toggle
            label="Call transfer"
            checked={form.transfer_enabled}
            disabled={!editable}
            onChange={(v) => set('transfer_enabled', v)}
          />
          <Toggle
            label="Callback requests"
            checked={form.callback_enabled}
            disabled={!editable}
            onChange={(v) => set('callback_enabled', v)}
          />
          <Toggle
            label="Block greeting interruption"
            checked={form.block_greeting_interruption}
            disabled={!editable}
            onChange={(v) => set('block_greeting_interruption', v)}
          />
        </div>

        {/* Enabling transfer without a target is what makes an agent say it
            cannot transfer, so the targets live with the toggle rather than
            somewhere else in the form. */}
        {form.transfer_enabled ? (
          <TransferTargets
            destinations={form.transfer_destinations ?? []}
            agentTargets={form.transfer_agents ?? []}
            agentOptions={transferableAgents}
            editable={editable}
            onChange={set}
          />
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Temperature</FieldLabel>
            <div className="ui-card flex items-center gap-3 px-3 py-2.5">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                disabled={!editable}
                value={Number(form.llm_settings?.temperature ?? 0.5)}
                onChange={(e) => set('llm_settings', {
                  ...form.llm_settings,
                  temperature: Number(e.target.value),
                })}
                className="flex-1 accent-indigo-600"
              />
              <span className="font-mono text-[12px]" style={{ color: 'var(--ui-text-3)' }}>
                {Number(form.llm_settings?.temperature ?? 0.5).toFixed(1)}
              </span>
            </div>
          </div>
          {catalog.qualities.length ? (
            <SelectField
              label="Audio quality"
              value={form.audio_quality}
              onChange={(v) => set('audio_quality', v)}
              disabled={!editable}
              placeholder="Default"
              options={catalog.qualities.map((q) => {
                const id = typeof q === 'string' ? q : (q.value ?? q.id)
                return { id, label: typeof q === 'string' ? q : (q.label ?? id) }
              })}
            />
          ) : null}
        </div>
      </Section>

      <div className="flex items-center gap-2 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
        <Badge tone={agent?.is_active ? 'success' : 'neutral'}>
          {agent?.is_active ? 'Active' : 'Inactive'}
        </Badge>
        {agent?.created_at ? <span>Created {formatDate(agent.created_at)}</span> : null}
      </div>

      <AgentPreviewModal
        open={previewOpen}
        agentId={agentId}
        agentName={form.agentName}
        onClose={() => setPreviewOpen(false)}
      />
    </PageShell>
  )
}
