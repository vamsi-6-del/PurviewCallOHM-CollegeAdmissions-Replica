import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  AlertCircle, ArrowLeft, ArrowRight, Bot, Check, FileText, Loader2, Plus, Sparkles, X,
} from 'lucide-react'
import { createAgentWithPrompt } from '../../api/resources/agents'
import {
  listAllLlmModels, listAllVoices, listAllSttModels, listAllPrompts,
  listCategories, createCategory, getVoiceAudio,
} from '../../api/resources/catalog'
import { can } from '../../api/permissions'
import { VoicePreviewButton } from '../../components/resource/ResourceKit'
import {
  stagger, fadeUp, stepVariants, SPRING, SPRING_SOFT, EASE, resolveMotion,
} from '../../components/ui/motion'

/** The in-progress agent survives a trip to the prompt editor and back. */
const DRAFT_KEY = 'callohm_agent_draft'

const EMPTY = { agentName: '', llmID: '', voiceID: '', sttID: '', categoryID: '', promptID: '' }

const STEPS = [
  { id: 'identity', label: 'Identity', hint: 'Name and grouping' },
  { id: 'voice', label: 'Voice & models', hint: 'How it speaks and hears' },
  { id: 'prompt', label: 'Prompt', hint: 'What it says' },
  { id: 'review', label: 'Review', hint: 'Confirm and create' },
]

/* ── building blocks ────────────────────────────────────────────────────── */

function Rail({ current, furthest, onJump, reduced }) {
  return (
    <ol className="flex gap-1 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
      {STEPS.map((step, index) => {
        const active = index === current
        const done = index < furthest
        const reachable = index <= furthest
        return (
          <li key={step.id} className="relative shrink-0 lg:shrink">
            {active ? (
              <motion.span
                layoutId={reduced ? undefined : 'rail-active'}
                transition={SPRING}
                className="absolute inset-0 rounded-xl"
                style={{ background: 'var(--ui-accent-soft)' }}
              />
            ) : null}
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onJump(index)}
              className="relative flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-left disabled:opacity-40 lg:gap-3"
            >
              <motion.span
                animate={{ scale: active ? 1.06 : 1 }}
                transition={SPRING}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11.5px] font-semibold"
                style={done
                  ? { background: 'rgba(16,185,129,0.14)', color: '#0f9d6e' }
                  : active
                    ? { background: 'linear-gradient(135deg, var(--ui-accent), #8b5cf6)', color: '#fff' }
                    : { background: 'var(--ui-surface-2)', color: 'var(--ui-text-3)', border: '1px solid var(--ui-border)' }}
              >
                {done ? <Check size={13} /> : index + 1}
              </motion.span>
              <span className="min-w-0">
                <span
                  className="block truncate text-[13px] font-medium"
                  style={{ color: active ? 'var(--ui-accent-strong)' : 'var(--ui-text)' }}
                >
                  {step.label}
                </span>
                <span className="hidden truncate text-[11px] lg:block" style={{ color: 'var(--ui-text-3)' }}>
                  {step.hint}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="ui-label mb-2 block">
        {label}{required ? <span style={{ color: 'var(--ui-accent)' }}> *</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>{hint}</p> : null}
    </div>
  )
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="ui-input"
      style={{ appearance: 'auto' }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  )
}

/** Select with an inline creator for records this user is allowed to add. */
function CreatableSelect({
  value, onChange, options, placeholder, canCreate, onCreate, createPlaceholder, hint, reduced,
}) {
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!draft.trim()) return
    setBusy(true); setError('')
    try {
      const created = await onCreate(draft.trim())
      if (created?.id) onChange(created.id)
      setCreating(false); setDraft('')
    } catch (e) {
      setError(e.message || 'Could not create it.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        {creating ? (
          <motion.div
            key="create"
            initial={reduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="flex gap-2"
          >
            <input
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
              placeholder={createPlaceholder}
              className="ui-input"
            />
            <button
              type="button"
              className="ui-btn-primary shrink-0"
              onClick={submit}
              disabled={busy || !draft.trim()}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button type="button" className="ui-icon-btn shrink-0" onClick={() => setCreating(false)}>
              <X size={14} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="select"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            <Select value={value} onChange={onChange} options={options} placeholder={placeholder} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-1.5 flex items-start justify-between gap-3">
        <p className="text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
          {!options.length ? hint : ''}
        </p>
        {canCreate && !creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex shrink-0 items-center gap-1 text-[11.5px] font-semibold"
            style={{ color: 'var(--ui-accent-strong)' }}
          >
            <Plus size={12} /> New
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-1 text-[11.5px]" style={{ color: '#e11d48' }}>{error}</p> : null}
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────────────── */

export default function AgentCreatePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const reduced = useReducedMotion()

  const [form, setForm] = useState(EMPTY)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [catalog, setCatalog] = useState({ llms: [], voices: [], stts: [], categories: [], prompts: [] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null')
      if (saved?.form) { setForm(saved.form); setStep(saved.step ?? 0) }
    } catch { /* ignore a malformed draft */ }
  }, [])

  const loadCatalog = useCallback(async () => {
    const [llms, voices, stts, categories, prompts] = await Promise.allSettled([
      listAllLlmModels(), listAllVoices(), listAllSttModels(), listCategories(), listAllPrompts(),
    ])
    setCatalog({
      llms: llms.value?.items ?? [],
      voices: voices.value?.items ?? [],
      stts: stts.value?.items ?? [],
      categories: categories.value?.items ?? [],
      prompts: prompts.value?.items ?? [],
    })
    // A failed load must not look like "nothing is configured".
    const failed = [
      ['language models', llms], ['voices', voices], ['speech-to-text models', stts],
      ['categories', categories], ['prompts', prompts],
    ].filter(([, r]) => r.status === 'rejected')
    if (failed.length) {
      setError(`Could not load ${failed.map(([n]) => n).join(', ')}: ${failed[0][1].reason?.message ?? 'request failed'}`)
    }
  }, [])

  useEffect(() => { loadCatalog() }, [loadCatalog])

  // Returning from the prompt editor with a freshly written prompt.
  useEffect(() => {
    const newPromptId = params.get('promptId')
    if (!newPromptId) return
    setForm((prev) => ({ ...prev, promptID: newPromptId }))
    setStep(2)
    loadCatalog()
    setParams({}, { replace: true })
  }, [params, setParams, loadCatalog])

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  function go(next) {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  async function handleCreateCategory(name) {
    const created = await createCategory({ categoryName: name })
    const id = created?.categoryID ?? created?.category_id
    setCatalog((prev) => ({ ...prev, categories: [...prev.categories, created] }))
    return { id, label: created?.categoryName ?? name }
  }

  function writeNewPrompt() {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step: 2 }))
    navigate(`/app/prompts/new?returnTo=${encodeURIComponent('/app/agents/new')}`)
  }

  async function submit() {
    setBusy(true); setError('')
    try {
      const agent = await createAgentWithPrompt(form)
      sessionStorage.removeItem(DRAFT_KEY)
      const id = agent?.agentID ?? agent?.agent_id
      navigate(id ? `/app/agents/${id}` : '/app/agents')
    } catch (e) {
      setError(e.message || 'Could not create the agent.')
      setBusy(false)
    }
  }

  const selected = useMemo(() => ({
    llm: catalog.llms.find((m) => m.llmID === form.llmID),
    voice: catalog.voices.find((v) => v.voiceID === form.voiceID),
    stt: catalog.stts.find((m) => m.sttID === form.sttID),
    category: catalog.categories.find((c) => (c.categoryID ?? c.category_id) === form.categoryID),
    prompt: catalog.prompts.find((p) => p.promptID === form.promptID),
  }), [catalog, form])

  const stepValid = [
    Boolean(form.agentName.trim()),
    Boolean(form.llmID && form.voiceID && form.sttID),
    Boolean(form.promptID),
    true,
  ]
  const firstIncomplete = stepValid.findIndex((ok) => !ok)
  const furthest = firstIncomplete === -1 ? STEPS.length - 1 : Math.max(step, firstIncomplete)

  function leave() {
    sessionStorage.removeItem(DRAFT_KEY)
    navigate('/app/agents')
  }

  return (
    <div className="ui relative">

      <div className="relative mx-auto max-w-[1000px] px-4 py-6 sm:px-8 sm:py-9">
        <motion.div variants={resolveMotion(reduced, stagger(0, 0.05))} initial="hidden" animate="show">
          <motion.header variants={resolveMotion(reduced, fadeUp)} className="mb-7">
            <div className="flex items-center gap-3">
              <button type="button" className="ui-icon-btn" onClick={leave} title="Back to agents">
                <ArrowLeft size={15} />
              </button>
              <div>
                <h1 className="ui-title">New agent</h1>
                <p className="ui-sub mt-0.5">
                  Step {step + 1} of {STEPS.length} · {STEPS[step].hint}
                </p>
              </div>
            </div>

            <div className="mt-5 h-[3px] overflow-hidden rounded-full" style={{ background: 'var(--ui-border)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, var(--ui-accent), #8b5cf6)' }}
                initial={false}
                animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                transition={reduced ? { duration: 0 } : SPRING_SOFT}
              />
            </div>
          </motion.header>

          <AnimatePresence>
            {error ? (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.24, ease: EASE }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-[12.5px]"
                  style={{
                    background: 'rgba(244,63,94,0.07)',
                    border: '1px solid rgba(244,63,94,0.20)',
                    color: '#e11d48',
                  }}
                >
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button type="button" onClick={() => setError('')}><X size={13} /></button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* `grid-cols-1` matters below lg: an implicit `auto` track is sized to
              its widest content, and the rail is a nowrap row of four steps — it
              stretched the track past the viewport instead of scrolling inside
              it, taking the whole page sideways with it. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
            <motion.div variants={resolveMotion(reduced, fadeUp)} className="min-w-0 lg:sticky lg:top-6 lg:self-start">
              <Rail current={step} furthest={furthest} onJump={go} reduced={reduced} />
            </motion.div>

            <motion.div variants={resolveMotion(reduced, fadeUp)} className="ui-card ui-card-raised min-w-0">
              {/* Steps travel in the direction of navigation. */}
              <div className="relative overflow-hidden px-4 py-6 sm:px-8 sm:py-7">
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={resolveMotion(reduced, stepVariants)}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    {step === 0 ? (
                      <div className="grid max-w-md gap-5">
                        <div>
                          <h2 className="ui-h2">What is this agent called?</h2>
                          <p className="ui-sub mt-1">Shown in call history and analytics.</p>
                        </div>
                        <Field label="Agent name" required>
                          <input
                            value={form.agentName}
                            onChange={(e) => set('agentName', e.target.value)}
                            placeholder="Admissions Assistant"
                            autoFocus
                            className="ui-input"
                            style={{ fontSize: '15px', padding: '12px 14px' }}
                          />
                        </Field>
                        <Field label="Contact category">
                          <CreatableSelect
                            reduced={reduced}
                            value={form.categoryID}
                            onChange={(v) => set('categoryID', v)}
                            placeholder="No category"
                            canCreate={can.manageCategories()}
                            createPlaceholder="Category name"
                            onCreate={handleCreateCategory}
                            hint={can.manageCategories()
                              ? 'No categories yet. Use New to add one.'
                              : 'No categories yet. An admin can create one.'}
                            options={catalog.categories.map((c) => ({
                              id: c.categoryID ?? c.category_id,
                              label: c.categoryName ?? c.category_name ?? c.categoryID,
                            }))}
                          />
                        </Field>
                      </div>
                    ) : null}

                    {step === 1 ? (
                      <div className="grid max-w-md gap-5">
                        <div>
                          <h2 className="ui-h2">How should it sound and listen?</h2>
                          <p className="ui-sub mt-1">All three are needed before it can take a call.</p>
                        </div>

                        <Field
                          label="Language model"
                          required
                          hint={!catalog.llms.length ? 'None configured. A super admin provisions these.' : undefined}
                        >
                          <Select
                            value={form.llmID}
                            onChange={(v) => set('llmID', v)}
                            placeholder="Select a model"
                            options={catalog.llms.map((m) => ({
                              id: m.llmID, label: m.llmName || m.modelName || m.llmID,
                            }))}
                          />
                        </Field>

                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="ui-label">
                              Voice<span style={{ color: 'var(--ui-accent)' }}> *</span>
                            </span>
                            <VoicePreviewButton
                              voiceId={form.voiceID}
                              fetchAudio={getVoiceAudio}
                              onError={setError}
                            />
                          </div>
                          <Select
                            value={form.voiceID}
                            onChange={(v) => set('voiceID', v)}
                            placeholder="Select a voice"
                            options={catalog.voices.map((v) => ({
                              id: v.voiceID,
                              label: `${v.purviewVoiceName || v.voiceID}${v.language_code ? ` · ${v.language_code}` : ''}`,
                            }))}
                          />
                          {!catalog.voices.length ? (
                            <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
                              None available. A super admin adds these.
                            </p>
                          ) : null}
                        </div>

                        <Field label="Speech to text" required>
                          <Select
                            value={form.sttID}
                            onChange={(v) => set('sttID', v)}
                            placeholder="Select a model"
                            options={catalog.stts.map((m) => ({
                              id: m.sttID, label: m.sttName || m.modelName || m.sttID,
                            }))}
                          />
                        </Field>
                      </div>
                    ) : null}

                    {step === 2 ? (
                      <div className="grid gap-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="ui-h2">What should it say?</h2>
                            <p className="ui-sub mt-1">Choose from your library, or write a new prompt.</p>
                          </div>
                          <button type="button" className="ui-btn" onClick={writeNewPrompt}>
                            <Sparkles size={14} />
                            Write new
                          </button>
                        </div>

                        {catalog.prompts.length ? (
                          <motion.div
                            variants={resolveMotion(reduced, stagger(0, 0.03))}
                            initial="hidden"
                            animate="show"
                            className="grid max-h-[380px] gap-2 overflow-y-auto pr-1"
                          >
                            {catalog.prompts.map((prompt) => {
                              const active = prompt.promptID === form.promptID
                              return (
                                <motion.button
                                  key={prompt.promptID}
                                  variants={resolveMotion(reduced, fadeUp)}
                                  whileHover={reduced ? undefined : { y: -1 }}
                                  transition={SPRING}
                                  type="button"
                                  onClick={() => set('promptID', prompt.promptID)}
                                  className="rounded-xl p-4 text-left"
                                  style={{
                                    border: `1px solid ${active ? 'var(--ui-accent)' : 'var(--ui-border)'}`,
                                    background: active ? 'var(--ui-accent-soft)' : 'var(--ui-surface)',
                                    boxShadow: active ? 'none' : 'var(--ui-shadow-sm)',
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="truncate text-[13.5px] font-medium" style={{ color: 'var(--ui-text)' }}>
                                      {prompt.title || 'Untitled'}
                                    </span>
                                    <AnimatePresence>
                                      {active ? (
                                        <motion.span
                                          initial={reduced ? false : { scale: 0, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          exit={{ scale: 0, opacity: 0 }}
                                          transition={SPRING}
                                          className="flex shrink-0 items-center justify-center rounded-full"
                                          style={{ background: 'var(--ui-accent-strong)', color: '#fff', height: 18, width: 18 }}
                                        >
                                          <Check size={11} />
                                        </motion.span>
                                      ) : null}
                                    </AnimatePresence>
                                  </div>
                                  {prompt.initialSay ? (
                                    <p className="mt-1.5 line-clamp-1 text-[12px]" style={{ color: 'var(--ui-text-2)' }}>
                                      &ldquo;{prompt.initialSay}&rdquo;
                                    </p>
                                  ) : null}
                                  <p className="mt-1 line-clamp-2 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
                                    {prompt.promptText || 'No instructions.'}
                                  </p>
                                </motion.button>
                              )
                            })}
                          </motion.div>
                        ) : (
                          <div
                            className="rounded-xl px-6 py-12 text-center"
                            style={{ border: '1px dashed var(--ui-border-strong)' }}
                          >
                            <FileText size={20} className="mx-auto mb-2" style={{ color: 'var(--ui-text-3)' }} />
                            <p className="text-[13.5px] font-medium" style={{ color: 'var(--ui-text)' }}>
                              Your prompt library is empty
                            </p>
                            <p className="mx-auto mt-1 max-w-xs text-[12px]" style={{ color: 'var(--ui-text-3)' }}>
                              Write one now. This agent is kept while you do.
                            </p>
                            <button type="button" className="ui-btn-primary mx-auto mt-5" onClick={writeNewPrompt}>
                              <Sparkles size={14} />
                              Write a prompt
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {step === 3 ? (
                      <div className="grid max-w-md gap-5">
                        <div>
                          <h2 className="ui-h2">Ready to create</h2>
                          <p className="ui-sub mt-1">Everything can still be changed afterwards.</p>
                        </div>

                        <motion.dl
                          variants={resolveMotion(reduced, stagger(0.05, 0.04))}
                          initial="hidden"
                          animate="show"
                          className="overflow-hidden rounded-xl"
                          style={{ border: '1px solid var(--ui-border)' }}
                        >
                          {[
                            ['Name', form.agentName || '—'],
                            ['Model', selected.llm?.llmName || selected.llm?.modelName || '—'],
                            ['Voice', selected.voice?.purviewVoiceName || '—'],
                            ['Speech to text', selected.stt?.sttName || selected.stt?.modelName || '—'],
                            ['Prompt', selected.prompt?.title || '—'],
                            ['Category', selected.category?.categoryName ?? selected.category?.category_name ?? 'None'],
                          ].map(([label, value], i) => (
                            <motion.div
                              key={label}
                              variants={resolveMotion(reduced, fadeUp)}
                              className="flex items-center justify-between gap-4 px-4 py-3"
                              style={{
                                borderTop: i === 0 ? 'none' : '1px solid var(--ui-border)',
                                background: i % 2 ? 'var(--ui-surface-2)' : 'transparent',
                              }}
                            >
                              <dt className="text-[12px]" style={{ color: 'var(--ui-text-3)' }}>{label}</dt>
                              <dd className="truncate text-[12.5px] font-medium" style={{ color: 'var(--ui-text)' }}>
                                {value}
                              </dd>
                            </motion.div>
                          ))}
                        </motion.dl>

                        {selected.prompt?.initialSay ? (
                          <div className="rounded-xl p-4" style={{ background: 'var(--ui-accent-soft)' }}>
                            <p className="ui-label mb-1.5">Opens with</p>
                            <p className="text-[13px]" style={{ color: 'var(--ui-text)' }}>
                              &ldquo;{selected.prompt.initialSay}&rdquo;
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div
                className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8"
                style={{ borderTop: '1px solid var(--ui-border)', background: 'var(--ui-surface-2)' }}
              >
                <button type="button" className="ui-btn" disabled={step === 0} onClick={() => go(step - 1)}>
                  <ArrowLeft size={14} />
                  Back
                </button>

                {step < STEPS.length - 1 ? (
                  <motion.button
                    type="button"
                    whileHover={reduced || !stepValid[step] ? undefined : { y: -1 }}
                    whileTap={reduced ? undefined : { y: 1 }}
                    transition={SPRING}
                    className="ui-btn-primary"
                    disabled={!stepValid[step]}
                    onClick={() => go(step + 1)}
                  >
                    Continue
                    <ArrowRight size={14} />
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    whileHover={reduced ? undefined : { y: -1 }}
                    whileTap={reduced ? undefined : { y: 1 }}
                    transition={SPRING}
                    className="ui-btn-primary"
                    disabled={busy || !stepValid.slice(0, 3).every(Boolean)}
                    onClick={submit}
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                    Create agent
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
