const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

function buildQuery(params = {}) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.append(k, v)
  })
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const detail = data?.detail
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg || 'Invalid input').join(', ')
      : detail
    throw new Error(message || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  get: (path, params) => request(`${path}${buildQuery(params)}`),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
