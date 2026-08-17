import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Braces, ChevronUp, FileText, Save } from 'lucide-react'
import { getPrompt, createPrompt, updatePrompt } from '../../api/resources/catalog'
import { can } from '../../api/permissions'
import { PrimaryButton, GhostButton, Banner, IconButton } from '../../components/resource/ResourceKit'

const EMPTY = { title: '', initialSay: '', initialSayNoName: '', promptText: '', variables: {} }

/** Pull {{variable}} names out of every text field. */
function detectVariables(...texts) {
  const found = []
  const regex = /\{\{\s*([\w.-]+)\s*\}\}/g
  for (const text of texts) {
    let match
    while ((match = regex.exec(text || '')) !== null) {
      if (!found.includes(match[1])) found.push(match[1])
    }
  }
  return found.sort()
}

/** A titled, collapsible block — the shape the backend's own console uses. */
function Field({ title, optional, hint, charCount, children }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="mb-7">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2.5 flex w-full items-center gap-2 text-left"
      >
        <span className="ui-h2">
          {title}
        </span>
        {optional ? (
          <span
            className="rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-widest"
            style={{ background: 'var(--ui-surface-2)', color: 'var(--ui-text-3)', border: '1px solid var(--ui-border)' }}
          >
            Optional
          </span>
        ) : null}
        <span className="flex-1" />
        {charCount != null ? (
          <span
            className="rounded-md px-2 py-0.5 text-[10.5px] font-medium"
            style={{ background: 'var(--ui-surface-2)', color: 'var(--ui-text-3)' }}
          >
            {charCount.toLocaleString()} chars
          </span>
        ) : null}
        <ChevronUp
          size={15}
          className={`transition-transform ${open ? '' : 'rotate-180'}`}
          style={{ color: 'var(--ui-text-3)' }}
        />
      </button>

      {open ? (
        <div className="ui-card overflow-hidden">
          {children}
          {hint ? (
            <p
              className="px-4 py-2.5 text-[11.5px]"
              style={{ color: 'var(--ui-text-3)', borderTop: '1px solid var(--ui-border)' }}
            >
              {hint}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function BareTextarea({ value, onChange, rows, placeholder, disabled, mono }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full resize-y bg-transparent px-4 py-3.5 text-[13.5px] leading-relaxed outline-none ${mono ? 'font-mono text-[12.5px]' : ''}`}
      style={{ color: 'var(--ui-text)' }}
    />
  )
}

/**
 * Full-page prompt editor. Prompts are long-form writing, so this gets a
 * page rather than a dialog, with a live variables panel alongside.
 *
 * Field names map onto the backend's prompt record:
 *   Prompt title -> title, First message -> initialSay,
 *   Fallback first message -> initialSayNoName, Description -> promptText
 */
export default function PromptEditorPage() {
  const { promptId } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnTo = params.get('returnTo')

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(Boolean(promptId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const readOnly = !can.managePrompts()

  const load = useCallback(async () => {
    if (!promptId) return
    setLoading(true)
    try {
      const data = await getPrompt(promptId)
      setForm({
        title: data.title ?? '',
        initialSay: data.initialSay ?? '',
        initialSayNoName: data.initialSayNoName ?? '',
        promptText: data.promptText ?? '',
        variables: data.variables ?? {},
      })
    } catch (e) {
      setError(e.message || 'Could not load this prompt.')
    } finally {
      setLoading(false)
    }
  }, [promptId])

  useEffect(() => { load() }, [load])

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const variables = useMemo(
    () => detectVariables(form.initialSay, form.initialSayNoName, form.promptText),
    [form.initialSay, form.initialSayNoName, form.promptText]
  )

  function goBack() {
    navigate(returnTo || '/app/prompts')
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const body = {
        title: form.title.trim(),
        promptText: form.promptText,
        initialSay: form.initialSay,
        initialSayNoName: form.initialSayNoName,
        variables: Object.fromEntries(variables.map((name) => [name, form.variables?.[name] ?? ''])),
      }
      const saved = promptId ? await updatePrompt(promptId, body) : await createPrompt(body)
      const id = saved?.promptID ?? saved?.prompt_id ?? promptId

      // When opened from another flow (agent creation), hand the new prompt back.
      if (returnTo) navigate(`${returnTo}${returnTo.includes('?') ? '&' : '?'}promptId=${id ?? ''}`)
      else navigate('/app/prompts')
    } catch (e) {
      setError(e.message || 'Could not save the prompt.')
      setSaving(false)
    }
  }

  const valid = form.title.trim() && form.promptText.trim()

  return (
    <div className="ui relative">

      <div className="relative z-10">
        {/* Sticky action bar so Save stays reachable in a long prompt. */}
        <div
          className="sticky top-0 z-20 backdrop-blur"
          style={{ background: 'var(--ui-surface)', borderBottom: '1px solid var(--ui-border)' }}
        >
          <div className="mx-auto flex max-w-[1120px] items-center gap-2.5 px-4 py-3 sm:gap-3 sm:px-8 sm:py-3.5">
            <IconButton icon={ArrowLeft} label="Back" onClick={goBack} />
            <div className="min-w-0 flex-1">
              <h1 className="ui-title truncate" style={{ fontSize: 17 }}>
                {promptId ? (readOnly ? 'Prompt' : 'Edit prompt') : 'Create new prompt'}
              </h1>
              {promptId ? (
                <p className="ui-mono truncate text-[11px]" style={{ color: 'var(--ui-text-3)' }}>{promptId}</p>
              ) : null}
            </div>
            {!readOnly ? (
              <PrimaryButton icon={Save} busy={saving} disabled={!valid} onClick={handleSave}>
                <span className="hidden sm:inline">
                  {returnTo ? 'Save and continue' : 'Save prompt'}
                </span>
                <span className="sm:hidden">Save</span>
              </PrimaryButton>
            ) : (
              <GhostButton onClick={goBack}>Close</GhostButton>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-8 sm:py-8">
          <Banner onDismiss={() => setError('')}>{error}</Banner>

          {loading ? (
            <div className="ui-card p-12 text-center text-[13px]" style={{ color: 'var(--ui-text-3)' }}>
              Loading prompt...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-7">
              <div>
                <Field title="Prompt title">
                  <input
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    disabled={readOnly}
                    placeholder="e.g. Admissions outreach, Fee reminder..."
                    className="w-full bg-transparent px-4 py-3.5 text-[13.5px] outline-none"
                    style={{ color: 'var(--ui-text)' }}
                    autoFocus={!promptId}
                  />
                </Field>

                <Field
                  title="First message"
                  hint="The agent's opening line. Insert {{variables}} to personalise it."
                >
                  <BareTextarea
                    value={form.initialSay}
                    onChange={(v) => set('initialSay', v)}
                    disabled={readOnly}
                    rows={3}
                    placeholder="e.g. Hello {{name}}, calling from the admissions office..."
                  />
                </Field>

                <Field
                  title="Fallback first message"
                  optional
                  hint="Used when the contact has no usable name on file."
                >
                  <BareTextarea
                    value={form.initialSayNoName}
                    onChange={(v) => set('initialSayNoName', v)}
                    disabled={readOnly}
                    rows={3}
                    placeholder="e.g. Hello, this is the admissions office. May I know your name?"
                  />
                </Field>

                <Field title="Prompt description" charCount={form.promptText.length}>
                  <BareTextarea
                    value={form.promptText}
                    onChange={(v) => set('promptText', v)}
                    disabled={readOnly}
                    rows={22}
                    mono
                    placeholder="e.g. You are an admissions assistant for {{company_name}}..."
                  />
                </Field>
              </div>

              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="ui-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--ui-border)' }}>
                    <Braces size={14} style={{ color: 'var(--ui-accent-strong)' }} />
                    <span className="ui-h2" style={{ fontSize: 13 }}>
                      Variables
                    </span>
                    {variables.length ? (
                      <span className="ml-auto text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
                        {variables.length}
                      </span>
                    ) : null}
                  </div>

                  {variables.length ? (
                    <div className="grid gap-2.5 p-3">
                      {variables.map((name) => (
                        <div key={name} className="rounded-xl p-2.5" style={{ background: 'var(--ui-accent-soft)' }}>
                          <code className="font-mono text-[12px]" style={{ color: 'var(--ui-accent-strong)' }}>
                            {`{{${name}}}`}
                          </code>
                          <input
                            value={form.variables?.[name] ?? ''}
                            disabled={readOnly}
                            onChange={(e) => set('variables', { ...form.variables, [name]: e.target.value })}
                            placeholder="Default value"
                            className="ui-input mt-1.5"
                            style={{ height: 32, fontSize: 12 }}
                          />
                        </div>
                      ))}
                      <p className="px-1 pt-1 text-[11px] leading-relaxed" style={{ color: 'var(--ui-text-3)' }}>
                        A default is used when the call supplies nothing for that variable. Contact
                        fields and the call request both override it.
                      </p>
                    </div>
                  ) : (
                    <div className="px-4 py-10 text-center">
                      <p className="mb-2 font-mono text-2xl" style={{ color: 'var(--ui-text-3)', opacity: 0.5 }}>
                        {'{ }'}
                      </p>
                      <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--ui-text-3)' }}>
                        Type <code className="font-mono">{'{{variable}}'}</code> in the first message
                        or description and it will appear here.
                      </p>
                    </div>
                  )}
                </div>

                {returnTo ? (
                  <div className="ui-card mt-3 flex items-start gap-2.5 p-3.5">
                    <FileText size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--ui-accent-strong)' }} />
                    <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--ui-text-3)' }}>
                      Saving returns you to the agent you were creating, with this prompt selected.
                    </p>
                  </div>
                ) : null}
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
