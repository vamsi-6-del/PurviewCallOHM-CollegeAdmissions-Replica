const BASE_URL = import.meta.env.VITE_API_BASE_URL
const STORAGE_KEY = 'callohm_auth'

// Deduplicate concurrent refresh attempts
let _refreshPromise = null

function _getStoredSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null } catch { return null }
}

function _saveStoredSession(data, previous) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...previous,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  }))
}

function _clearAndRedirect() {
  localStorage.removeItem(STORAGE_KEY)
  window.location.href = '/login'
}

async function _attemptRefresh() {
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    const session = _getStoredSession()
    if (!session?.refreshToken) { _clearAndRedirect(); throw new Error('Session expired') }

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) { _clearAndRedirect(); throw new Error('Session expired') }
    _saveStoredSession(data, session)
    return data
  })().finally(() => { _refreshPromise = null })

  return _refreshPromise
}

/** Endpoints where a 401 means "bad credentials", not "expired session". */
function _isAuthEndpoint(path) {
  return path.startsWith('/auth/login') || path.startsWith('/auth/refresh')
}

/** FastAPI `detail` can be a string, or an array of validation errors. */
function _extractMessage(data, status) {
  const detail = data?.detail ?? data?.message
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const msg = detail.map((d) => d?.msg).filter(Boolean).join(', ')
    if (msg) return msg
  }
  // 429s from a gateway or provider usually arrive with no body at all, and
  // "Request failed (429)" tells the user nothing they can act on.
  if (status === 429) return 'Too many requests. The server is rate limiting. Wait a moment and try again.'
  return `Request failed (${status})`
}

/** Seconds the server asked us to wait, when it says so. */
function _retryAfter(res) {
  const raw = res.headers?.get?.('Retry-After')
  if (!raw) return undefined
  const seconds = Number(raw)
  return Number.isFinite(seconds) ? seconds : undefined
}

async function request(path, options = {}) {
  const { body, token, _isRetry, ...rest } = options

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...rest.headers,
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    ...(body != null ? { body: JSON.stringify(body) } : {}),
  })

  const data = await res.json().catch(() => null)

  if (res.status === 401 && !_isRetry && !_isAuthEndpoint(path)) {
    try {
      await _attemptRefresh()
      const newSession = _getStoredSession()
      return request(path, { body, ...rest, token: newSession?.accessToken, _isRetry: true })
    } catch {
      _clearAndRedirect()
      const err = new Error('Session expired')
      err.status = 401
      throw err
    }
  }

  if (!res.ok) {
    const err = new Error(_extractMessage(data, res.status))
    err.status = res.status
    err.retryAfter = _retryAfter(res)
    throw err
  }

  return data
}

async function rawRequest(path, options = {}) {
  const { token, _isRetry, ...rest } = options
  const headers = {
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...rest.headers,
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers })

  if (res.status === 401 && !_isRetry && !_isAuthEndpoint(path)) {
    try {
      await _attemptRefresh()
      const newSession = _getStoredSession()
      return rawRequest(path, { ...rest, token: newSession?.accessToken, _isRetry: true })
    } catch {
      _clearAndRedirect()
      throw new Error('Session expired')
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      message = _extractMessage(await res.json(), res.status)
    } catch { /* ignore */ }
    const err = new Error(message)
    err.status = res.status
    throw err
  }
  return res
}

export const api = {
  get: (path, options) => request(path, { method: 'GET', ...options }),
  post: (path, body, options) => request(path, { method: 'POST', body, ...options }),
  put: (path, body, options) => request(path, { method: 'PUT', body, ...options }),
  patch: (path, body, options) => request(path, { method: 'PATCH', body, ...options }),
  del: (path, options) => request(path, { method: 'DELETE', ...options }),
  postForm: (path, formData, options = {}) => {
    const { token, ...rest } = options
    return rawRequest(path, {
      method: 'POST',
      body: formData,
      token,
      ...rest,
    }).then(r => r.json())
  },
  getBlob: (path, options) =>
    rawRequest(path, { method: 'GET', ...options }).then(r => r.blob()),
}
