import { api, withAuth, qs, toList, clampLimit } from './http'
import { getPrompt, createPrompt, updatePrompt } from './catalog'

/**
 * Agents. This backend models an agent as references to the catalog
 * resources — llmID, voiceID, promptID, sttID, categoryID — plus per-agent
 * tuning blobs (llm_settings, tts_settings, stt_settings).
 *
 * Access: read is open to all users; create/update/delete are admin and above.
 */

export function listAgents({ limit = 20, offset = 0, isActive } = {}) {
  return api.get(`/agents/${qs({ limit: clampLimit(limit), offset, is_active: isActive })}`, withAuth())
    .then((res) => toList(res, { limit, offset }))
}

export function searchAgents({ agentName, limit = 20, offset = 0 } = {}) {
  return api.get(`/agents/search${qs({ agent_name: agentName, limit: clampLimit(limit), offset })}`, withAuth())
    .then((res) => toList(res, { limit, offset }))
}

export function getAgent(agentId) {
  return api.get(`/agents/${encodeURIComponent(agentId)}`, withAuth())
}

export function createAgent(payload) {
  return api.post('/agents/', payload, withAuth())
}

export function updateAgent(agentId, payload) {
  return api.put(`/agents/${encodeURIComponent(agentId)}`, payload, withAuth())
}

/** Soft delete — the agent moves to the trash and can be restored. */
export function deleteAgent(agentId) {
  return api.del(`/agents/${encodeURIComponent(agentId)}`, withAuth())
}

export function restoreAgent(agentId) {
  return api.post(`/agents/${encodeURIComponent(agentId)}/restore`, null, withAuth())
}

/** Irreversible. Super admin only on the backend. */
export function permanentlyDeleteAgent(agentId) {
  return api.del(`/agents/${encodeURIComponent(agentId)}/permanent`, withAuth())
}

export function listTrashedAgents({ limit = 20, offset = 0 } = {}) {
  return api.get(`/agents/trash${qs({ limit: clampLimit(limit), offset })}`, withAuth())
    .then((res) => toList(res, { limit, offset }))
}

export function listDefaultAgents({ limit = 20, offset = 0 } = {}) {
  return api.get(`/agents/defaults${qs({ limit: clampLimit(limit), offset })}`, withAuth())
    .then((res) => toList(res, { limit, offset }))
}

export function listAudioQualities() {
  return api.get('/agents/audio-quality', withAuth())
}

export function listTimezones() {
  return api.get('/agents/timezone', withAuth())
}

/* ── call transfer ──────────────────────────────────────────────────────── */

/**
 * The transfer half of an agent payload.
 *
 * `transfer_enabled` on its own switches the tool on with nothing to hand a
 * call to — the agent then tells the caller it cannot transfer, which is
 * accurate but looks broken. Destinations are what make the feature real, so
 * they always travel with the flag.
 *
 * Rows the user left half-filled are dropped rather than sent: the backend
 * takes each entry as a dialable target, and a destination with no number is
 * a failed transfer at the worst possible moment.
 */
export function transferPayload(form = {}) {
  const destinations = (form.transfer_destinations ?? [])
    .map((d) => ({ label: String(d?.label ?? '').trim(), number: String(d?.number ?? '').trim() }))
    .filter((d) => d.label && d.number)

  const agents = (form.transfer_agents ?? [])
    .map((a) => ({ label: String(a?.label ?? '').trim(), agent_id: String(a?.agent_id ?? '').trim() }))
    .filter((a) => a.label && a.agent_id)

  // Enabling with no targets is the state that produced "I can't transfer
  // you", so it is not a state this can save.
  const enabled = Boolean(form.transfer_enabled) && (destinations.length > 0 || agents.length > 0)

  return {
    transfer_enabled: enabled,
    transfer_destinations: destinations,
    transfer_agents: agents,
  }
}

/* ── agent + prompt composite ───────────────────────────────────────────── */

/**
 * The agent editor works on one screen the backend splits across two records.
 * These join and split them so the page deals with a single object.
 */
export async function getAgentDetail(agentId) {
  const agent = await getAgent(agentId)
  const prompt = agent.promptID ? await getPrompt(agent.promptID).catch(() => null) : null
  return { ...agent, prompt }
}

/**
 * Creates an agent. The prompt is either an existing one selected by the
 * caller (`promptID`) or a new record written from the supplied text.
 */
export async function createAgentWithPrompt({
  agentName, llmID, voiceID, sttID, categoryID, promptID: existingPromptID,
  promptText, initialSay, ...rest
}) {
  if (!agentName?.trim()) throw new Error('Agent name is required.')

  let promptID = existingPromptID || undefined
  if (!promptID && (promptText?.trim() || initialSay?.trim())) {
    const prompt = await createPrompt({
      title: `${agentName.trim()} prompt`,
      promptText: promptText?.trim() || 'You are a helpful voice assistant.',
      ...(initialSay?.trim() ? { initialSay: initialSay.trim() } : {}),
    })
    promptID = prompt?.promptID ?? prompt?.prompt_id
  }

  return createAgent({
    agentName: agentName.trim(),
    ...(llmID ? { llmID } : {}),
    ...(voiceID ? { voiceID } : {}),
    ...(sttID ? { sttID } : {}),
    ...(categoryID ? { categoryID } : {}),
    ...(promptID ? { promptID } : {}),
    ...rest,
  })
}

/**
 * Saves the agent record and its prompt.
 *
 * `form.promptID` decides which prompt the agent points at: an existing one is
 * linked and its text updated in place (so the change is visible everywhere
 * that prompt is used), while an empty value creates a fresh prompt owned by
 * this agent.
 */
export async function saveAgentDetail(agentId, form, current = {}) {
  const body = {
    promptText: form.promptText ?? '',
    initialSay: form.initialSay ?? '',
    variables: form.variables ?? {},
  }

  let promptID = form.promptID || ''
  if (promptID) {
    const existingTitle = promptID === current.promptID ? current.prompt?.title : undefined
    await updatePrompt(promptID, {
      title: existingTitle || `${form.agentName} prompt`,
      ...body,
    })
  } else if (body.promptText.trim() || body.initialSay.trim()) {
    const prompt = await createPrompt({ title: `${form.agentName} prompt`, ...body })
    promptID = prompt?.promptID ?? prompt?.prompt_id ?? ''
  }

  await updateAgent(agentId, {
    agentName: form.agentName,
    ...(form.llmID ? { llmID: form.llmID } : {}),
    ...(form.voiceID ? { voiceID: form.voiceID } : {}),
    ...(form.sttID ? { sttID: form.sttID } : {}),
    ...(form.categoryID ? { categoryID: form.categoryID } : {}),
    ...(promptID ? { promptID } : {}),
    ...(form.timezone ? { timezone: form.timezone } : {}),
    ...(form.audio_quality ? { audio_quality: form.audio_quality } : {}),
    llm_settings: { ...(current.llm_settings ?? {}), ...(form.llm_settings ?? {}) },
    voicemail_detection_enabled: Boolean(form.voicemail_detection_enabled),
    callback_enabled: Boolean(form.callback_enabled),
    block_greeting_interruption: Boolean(form.block_greeting_interruption),
    ...transferPayload(form),
  })

  return getAgentDetail(agentId)
}

/* ── analysis config + preview ──────────────────────────────────────────── */

export function getAnalysisConfig(agentId) {
  return api.get(`/agents/${encodeURIComponent(agentId)}/analysis-config`, withAuth())
}

export function updateAnalysisConfig(agentId, payload) {
  return api.put(`/agents/${encodeURIComponent(agentId)}/analysis-config`, payload, withAuth())
}

/** Browser preview session (LiveKit). */
export function createPreviewSession(agentId) {
  return api.post('/preview/livekit/session', { agent_id: agentId }, withAuth())
}
