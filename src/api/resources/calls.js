import { api, withAuth, qs, toList, clampLimit, timeoutSignal } from './http'

/**
 * Live calls, call history, recordings, transcripts and QA analysis.
 *
 * Placing and ending calls is "call agent and above"; history and recordings
 * are open to all users, while deleting a recording is admin and above.
 */

/* ── placing calls ──────────────────────────────────────────────────────── */

/**
 * POST /call — one outbound call.
 * `telephonyId` selects the configured outbound number.
 */
export function placeCall({ toNumber, name, agentId, telephonyId, countryCode, variables }) {
  return api.post('/call', {
    to_number: toNumber,
    name: name || '',
    agent_id: agentId,
    telephony_id: telephonyId,
    ...(countryCode ? { country_code: countryCode } : {}),
    ...(variables && Object.keys(variables).length ? { variables } : {}),
  }, withAuth())
}

export function getCallStatus({ callSid, telephonyId, provider }) {
  return api.get(
    `/call-status${qs({ call_sid: callSid, telephony_id: telephonyId, provider })}`,
    withAuth({ signal: timeoutSignal(15000) }),
  )
}

/**
 * POST /end-call — the SID goes in the body, while the telephony id is a query
 * param the route uses to resolve this company's provider credentials.
 */
export function endCall({ callSid, telephonyId, numberId }) {
  return api.post(`/end-call${qs({ telephony_id: telephonyId })}`, {
    call_sid: callSid,
    ...(numberId ? { number_id: numberId } : {}),
  }, withAuth({ signal: timeoutSignal(20000) }))
}

/**
 * POST /transfer-call — `call_sid` and `to_number` are *query* parameters on
 * this route, not a JSON body; sending them as a body fails validation with
 * 422. The provider is inferred from the SID prefix, so nothing else is needed.
 */
export function transferCall({ callSid, toNumber }) {
  return api.post(
    `/transfer-call${qs({ call_sid: callSid, to_number: toNumber })}`,
    null,
    withAuth({ signal: timeoutSignal(20000) }),
  )
}

/* ── history ────────────────────────────────────────────────────────────── */

export function listCallHistory({ limit = 20, offset = 0, userId } = {}) {
  return api.get(`/call-history/${qs({ limit: clampLimit(limit), offset, user_id: userId })}`, withAuth())
    .then((res) => toList(res, { limit, offset }))
}

/** The filtered variant — same shape, with server-side filters. */
export function filterCallHistory({
  limit = 20, offset = 0, agentName, contactName, phoneNumber, callStatus, callId, fromDate, toDate,
} = {}) {
  return api.get(`/call-history/filters${qs({
    limit: clampLimit(limit), offset,
    agent_name: agentName,
    contact_name: contactName,
    phone_number: phoneNumber,
    call_status: callStatus,
    call_id: callId,
    from_date: fromDate,
    to_date: toDate,
  })}`, withAuth()).then((res) => toList(res, { limit, offset }))
}

export function downloadCallHistoryCsv(filters = {}) {
  return api.getBlob(`/call-history/download-csv${qs({
    limit: clampLimit(filters.limit ?? 1000),
    agent_name: filters.agentName,
    contact_name: filters.contactName,
    phone_number: filters.phoneNumber,
    call_status: filters.callStatus,
    from_date: filters.fromDate,
    to_date: filters.toDate,
  })}`, withAuth({ headers: { Accept: 'text/csv' } }))
}

export function getRecording(callId) {
  return api.getBlob(`/call-history/recording/${encodeURIComponent(callId)}`, withAuth())
}

export function getTranscript(callId) {
  return api.get(`/call-history/transcription-details/${encodeURIComponent(callId)}`, withAuth())
}

export function getChatTranscript(callId) {
  return api.get(`/chat-history/transcription/${encodeURIComponent(callId)}`, withAuth())
}

/* ── QA analysis ────────────────────────────────────────────────────────── */

export function getCallAnalysis(callId) {
  return api.get(`/call-history/${encodeURIComponent(callId)}/analysis`, withAuth())
}

export function retriggerCallAnalysis(callId) {
  return api.post(`/call-history/${encodeURIComponent(callId)}/analysis/retrigger`, null, withAuth())
}

/* ── recordings ─────────────────────────────────────────────────────────── */

export function listRecordings({ includePresignedUrls = false, maxResults = 1000 } = {}) {
  return api.get(`/recording/list${qs({
    include_presigned_urls: includePresignedUrls ? 'true' : '',
    max_results: maxResults,
  })}`, withAuth()).then((res) => toList(res))
}

export function getRecordingMetadata(callSid) {
  return api.get(`/recording/metadata/${encodeURIComponent(callSid)}`, withAuth())
}

/**
 * Audio for a stored recording, keyed by the *provider* SID that
 * /recording/list returns. `mode=stream` proxies the bytes through the API so
 * the Authorization header is honoured — a redirect to a presigned R2 URL
 * cannot be followed by fetch with our own auth header attached.
 *
 * /call-history/recording/{call_id} is the other way in, but it is keyed by the
 * internal call id and so cannot be used with a row from this list.
 */
export function downloadRecordingAudio(callSid) {
  return api.getBlob(`/recording/download/${encodeURIComponent(callSid)}${qs({ mode: 'stream' })}`, withAuth())
}

export function deleteRecording(callSid) {
  return api.del(`/recording/${encodeURIComponent(callSid)}`, withAuth())
}

/* ── analytics ──────────────────────────────────────────────────────────── */

/** Dates are DD/MM/YYYY; period is '24h' | '7d' | '30d' when no range is set. */
export function getAnalyticsSummary({ period, fromDate, toDate, userId } = {}) {
  return api.get(`/analytics/summary${qs({ period, from_date: fromDate, to_date: toDate, user_id: userId })}`, withAuth())
}

export function getCallVolume({ period, fromDate, toDate, userId } = {}) {
  return api.get(`/analytics/call-volume${qs({ period, from_date: fromDate, to_date: toDate, user_id: userId })}`, withAuth())
}

export function getCallStatusBreakdown({ period, fromDate, toDate, userId } = {}) {
  return api.get(`/analytics/call-status${qs({ period, from_date: fromDate, to_date: toDate, user_id: userId })}`, withAuth())
}

export function getAgentStats({ period, fromDate, toDate, userId } = {}) {
  return api.get(`/analytics/agent-stats${qs({ period, from_date: fromDate, to_date: toDate, user_id: userId })}`, withAuth())
}

export function getHourlyDistribution({ targetDate, userId } = {}) {
  return api.get(`/analytics/hourly-distribution${qs({ target_date: targetDate, user_id: userId })}`, withAuth())
}
