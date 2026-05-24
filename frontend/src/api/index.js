const BASE = '/api'

export function resolveImageSrc(value) {
  if (!value) return ''
  if (value.startsWith('/uploads/')) return `${BASE}${value}`
  return value
}

export function resolveEntityImageSrc(type, value) {
  if (value) return resolveImageSrc(value)
  return placeholderImageSrc(type)
}

export function placeholderImageSrc(type) {
  if (type === 'cinema') return `${BASE}/uploads/Placeholder/cinemas.png`
  if (type === 'film') return `${BASE}/uploads/Placeholder/films.png`
  return ''
}

export function usePlaceholderOnError(type) {
  return (event) => {
    const fallback = placeholderImageSrc(type)
    if (fallback && event.currentTarget.src !== fallback) {
      event.currentTarget.src = fallback
    }
  }
}

function getToken() {
  return localStorage.getItem('token')
}

function formatErrorDetail(detail) {
  if (Array.isArray(detail)) {
    return detail.map(item => item.msg || item.message || JSON.stringify(item)).join('\n')
  }
  if (detail && typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail)
  }
  return detail || 'Ошибка запроса'
}

async function request(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Ошибка сервера' }))
    throw new Error(formatErrorDetail(err.detail))
  }
  if (res.status === 204) return null
  return res.json()
}

export async function uploadImage(file, category) {
  const form = new FormData()
  form.append('file', file)
  const token = getToken()
  const res = await fetch(`${BASE}/images/upload?category=${encodeURIComponent(category)}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Ошибка загрузки изображения' }))
    throw new Error(formatErrorDetail(err.detail))
  }
  return res.json()
}

export const authApi = {
  register: (data) => request('POST', '/auth/register', data, false),
  login: async (username, password) => {
    const form = new URLSearchParams({ username, password })
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(formatErrorDetail(err.detail || 'Ошибка входа'))
    }
    return res.json()
  },
  me: () => request('GET', '/auth/me'),
  listUsers: () => request('GET', '/auth/users'),
  updateRole: (id, role) => request('PATCH', `/auth/users/${id}/role`, { role }),
  deleteUser: (id) => request('DELETE', `/auth/users/${id}`),
}

export const promocodesApi = {
  list: () => request('GET', '/promocodes'),
  create: (data) => request('POST', '/promocodes', data),
  delete: (id) => request('DELETE', `/promocodes/${id}`),
  apply: (code) => request('POST', '/promocodes/apply', { code }),
}

export const adminDataApi = {
  export: () => request('GET', '/admin/data/export'),
  import: (data) => request('POST', '/admin/data/import', data),
}

export const cinemasApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/cinemas${q ? '?' + q : ''}`, null, false)
  },
  get: (id) => request('GET', `/cinemas/${id}`, null, false),
  create: (data) => request('POST', '/cinemas', data),
  update: (id, data) => request('PUT', `/cinemas/${id}`, data),
  delete: (id) => request('DELETE', `/cinemas/${id}`),
}

export const filmsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString()
    return request('GET', `/films${q ? '?' + q : ''}`, null, false)
  },
  get: (id) => request('GET', `/films/${id}`, null, false),
  create: (data) => request('POST', '/films', data),
  update: (id, data) => request('PUT', `/films/${id}`, data),
  delete: (id) => request('DELETE', `/films/${id}`),
}

export const sessionsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString()
    return request('GET', `/sessions${q ? '?' + q : ''}`, null, false)
  },
  get: (id) => request('GET', `/sessions/${id}`, null, false),
  seats: (id) => request('GET', `/sessions/${id}/seats`, null, false),
  create: (data) => request('POST', '/sessions', data),
  update: (id, data) => request('PUT', `/sessions/${id}`, data),
  updateStatus: (id, status) => request('PATCH', `/sessions/${id}/status`, { status }),
  delete: (id) => request('DELETE', `/sessions/${id}`),
}

export const ticketsApi = {
  buy: (sessionId, seatNumber) => request('POST', `/tickets/${sessionId}`, { seat_number: seatNumber }),
  myTickets: () => request('GET', '/tickets/my'),
  deleteTicket: (id) => request('DELETE', `/tickets/my/${id}`),
  deleteAllTickets: () => request('DELETE', '/tickets/my/all'),
}

export const hallsApi = {
  byCinema: (cinemaId) => request('GET', `/halls/cinema/${cinemaId}`, null, false),
  create: (data) => request('POST', '/halls', data),
  update: (id, data) => request('PUT', `/halls/${id}`, data),
  delete: (id) => request('DELETE', `/halls/${id}`),
}
