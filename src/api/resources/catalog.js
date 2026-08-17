import { api, withAuth, qs, toList, clampLimit, fetchAllPages } from './http'

/**
 * The building blocks an agent references: prompts, voices, LLM models,
 * STT models and contact categories.
 *
 * Access (from the backend's own route docs):
 *   prompts     read: all users   write: company admin+   delete: super admin
 *   voices      read: all users   write: super admin only
 *   llm/stt     read: all users   write: super admin only
 *   categories  read: all users   write: admin and above
 */

/* ── prompts ────────────────────────────────────────────────────────────── */

export function listPrompts({ limit = 20, offset = 0, search } = {}) {
  return api.get(`/prompts/${qs({ limit: clampLimit(limit), offset, search })}`, withAuth())
    .then((res) => toList(res, { limit, offset }))
}

export function getPrompt(promptId) {
  return api.get(`/prompts/${encodeURIComponent(promptId)}`, withAuth())
}

/** payload: { title, promptText, initialSay?, initialSayNoName?, variables? } */
export function createPrompt(payload) {
  return api.post('/prompts/', payload, withAuth())
}

export function updatePrompt(promptId, payload) {
  return api.put(`/prompts/${encodeURIComponent(promptId)}`, payload, withAuth())
}

export function deletePrompt(promptId) {
  return api.del(`/prompts/${encodeURIComponent(promptId)}`, withAuth())
}

export function listDefaultPrompts() {
  return api.get('/prompts/defaults', withAuth()).then((res) => toList(res))
}

/* ── voices ─────────────────────────────────────────────────────────────── */

export function listVoices({ limit = 24, offset = 0, search, languageCode, gender, provider } = {}) {
  return api.get(
    `/voices/${qs({ limit: clampLimit(limit), offset, search, language_code: languageCode, gender, model_provider: provider })}`,
    withAuth()
  ).then((res) => toList(res, { limit, offset }))
}

export function getVoice(voiceId) {
  return api.get(`/voices/${encodeURIComponent(voiceId)}`, withAuth())
}

/** Sample audio for a voice, as a Blob. */
export function getVoiceAudio(voiceId) {
  return api.getBlob(`/voices/${encodeURIComponent(voiceId)}/audio`, withAuth())
}

/** Synthesize arbitrary text with a voice — returns audio. */
export function synthesizeVoice(voiceId, text) {
  return api.getBlob(`/voices/${encodeURIComponent(voiceId)}/synthesize${qs({ text })}`, withAuth())
}

/**
 * Normalise the language list to `{ code, name }`.
 *
 * /voices/language-codes documents an empty response schema, so neither the
 * envelope nor the field names are knowable up front: it can arrive as a bare
 * array, wrapped under `items`/`languages`, as a list of plain code strings, or
 * as a `{ en: "English" }` map. Reading only `res.items` left the filter empty
 * for every other shape — and an empty dropdown looks identical to "this
 * backend has no languages", so the mismatch was invisible.
 */
export function normalizeLanguages(res) {
  const rows = Array.isArray(res) ? res : toList(res).items

  if (rows.length) {
    return rows.map((row) => {
      if (row == null || typeof row !== 'object') {
        const code = String(row ?? '').trim()
        return { code, name: code }
      }
      const code = row.language_code ?? row.code ?? row.iso_code ?? row.iso ?? row.id ?? row.value ?? ''
      const name = row.name ?? row.language_name ?? row.language ?? row.label ?? code
      return { code: String(code), name: String(name || code) }
    }).filter((row) => row.code)
  }

  // A plain { code: name } map has no array to find.
  if (res && typeof res === 'object') {
    return Object.entries(res)
      .filter(([, value]) => typeof value === 'string')
      .map(([code, name]) => ({ code, name }))
  }
  return []
}

export function listVoiceLanguages() {
  return api.get('/voices/language-codes', withAuth()).then(normalizeLanguages)
}

/* ── whole-catalog helpers for selector dropdowns ───────────────────────── */

/**
 * Selectors need every option, not one page — and `limit` is capped at 100
 * per request, so these page through.
 */
export const listAllVoices = () => fetchAllPages(listVoices)
export const listAllPrompts = () => fetchAllPages(listPrompts)
export const listAllLlmModels = () => fetchAllPages(listLlmModels)
export const listAllSttModels = () => fetchAllPages(listSttModels)

/* ── llm + stt models ───────────────────────────────────────────────────── */

export function listLlmModels({ limit = 50, offset = 0, search } = {}) {
  return api.get(`/llm-models/${qs({ limit: clampLimit(limit), offset, search })}`, withAuth())
    .then((res) => toList(res, { limit, offset }))
}

export function listLlmModelsGrouped() {
  return api.get('/llm-models/grouped', withAuth())
}

export function listSttModels({ limit = 50, offset = 0, search } = {}) {
  return api.get(`/stt-models/${qs({ limit: clampLimit(limit), offset, search })}`, withAuth())
    .then((res) => toList(res, { limit, offset }))
}

export function listSttModelsGrouped() {
  return api.get('/stt-models/grouped', withAuth())
}

/* ── contact categories ─────────────────────────────────────────────────── */

export function listCategories() {
  return api.get('/categories/', withAuth()).then((res) => toList(res))
}

export function getCategory(categoryId) {
  return api.get(`/categories/${encodeURIComponent(categoryId)}`, withAuth())
}

/** payload: { categoryName, description? } */
export function createCategory(payload) {
  return api.post('/categories/', payload, withAuth())
}

export function updateCategory(categoryId, payload) {
  return api.put(`/categories/${encodeURIComponent(categoryId)}`, payload, withAuth())
}

export function deleteCategory(categoryId) {
  return api.del(`/categories/${encodeURIComponent(categoryId)}`, withAuth())
}
