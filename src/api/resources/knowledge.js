import { api, withAuth, qs, toList, clampLimit } from './http'

/**
 * Knowledge base: folders, documents and per-agent access grants.
 * Folder create/delete is company-admin work; documents are open to all users.
 */

export function listFolders(parentFolderId) {
  return api.get(`/knowledge/folders${qs({ parent_folder_id: parentFolderId })}`, withAuth())
    .then((res) => toList(res))
}

export function createFolder({ name, parentFolderId }) {
  return api.post('/knowledge/folders', {
    name,
    ...(parentFolderId ? { parent_folder_id: parentFolderId } : {}),
  }, withAuth())
}

export function deleteFolder(folderId) {
  return api.del(`/knowledge/folders/${encodeURIComponent(folderId)}`, withAuth())
}

export function listDocuments({
  limit = 20, offset = 0, agentId, folderId, status, sourceType, search,
} = {}) {
  return api.get(`/knowledge/documents${qs({
    limit: clampLimit(limit), offset, agent_id: agentId, folder_id: folderId,
    status, source_type: sourceType, search,
  })}`, withAuth()).then((res) => toList(res, { limit, offset }))
}

export function getDocumentStats(agentId) {
  return api.get(`/knowledge/documents/stats${qs({ agent_id: agentId })}`, withAuth())
}

/** Multipart upload — the backend accepts several files per request. */
export function uploadDocuments(files, { folderId } = {}) {
  const fd = new FormData()
  for (const file of files) fd.append('files', file)
  if (folderId) fd.append('folder_id', folderId)
  return api.postForm('/knowledge/documents/upload', fd, withAuth())
}

export function createDocumentFromText({ title, text, folderId }) {
  return api.post('/knowledge/documents/text', {
    title,
    text_content: text,
    ...(folderId ? { folder_id: folderId } : {}),
  }, withAuth())
}

export function createDocumentFromUrl({ url, title, folderId }) {
  return api.post('/knowledge/documents/url', {
    url,
    ...(title ? { title } : {}),
    ...(folderId ? { folder_id: folderId } : {}),
  }, withAuth())
}

export function deleteDocument(documentId) {
  return api.del(`/knowledge/documents/${encodeURIComponent(documentId)}`, withAuth())
}

export function reprocessDocument(documentId) {
  return api.post(`/knowledge/documents/${encodeURIComponent(documentId)}/reprocess`, null, withAuth())
}

export function downloadDocument(documentId) {
  return api.getBlob(`/knowledge/documents/${encodeURIComponent(documentId)}/download`, withAuth())
}

/** Semantic search across the company's documents. */
export function searchDocuments({ query, agentId, topK = 5 }) {
  return api.post('/knowledge/documents/search', {
    query,
    ...(agentId ? { agent_id: agentId } : {}),
    top_k: topK,
  }, withAuth())
}

/* ── per-agent access ───────────────────────────────────────────────────── */

export function listAgentAccess(agentId) {
  return api.get(`/knowledge/agents/${encodeURIComponent(agentId)}/access`, withAuth())
    .then((res) => toList(res))
}

/** Exactly one of documentId / folderId must be given. */
export function grantAgentAccess(agentId, { documentId, folderId }) {
  return api.post(`/knowledge/agents/${encodeURIComponent(agentId)}/access`, {
    ...(documentId ? { knowledge_document_id: documentId } : {}),
    ...(folderId ? { folder_id: folderId } : {}),
  }, withAuth())
}

export function revokeAgentAccess(agentId, { documentId, folderId }) {
  return api.del(`/knowledge/agents/${encodeURIComponent(agentId)}/access`, withAuth({
    body: {
      ...(documentId ? { knowledge_document_id: documentId } : {}),
      ...(folderId ? { folder_id: folderId } : {}),
    },
  }))
}
