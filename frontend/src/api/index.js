const BASE = '/api'

export function resolveImageSrc(value) {
  if (!value) return ''
  if (value.startsWith('/uploads/')) return `${BASE}${value}`
  return value
}

function getToken() {
  return localStorage.getItem('token')
}

async function request(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Ошибка сервера' }))
    throw new Error(err.detail || 'Ошибка запроса')
  }
  if (res.status === 204) return null
  return res.json()
}

// Auth
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
      throw new Error(err.detail || 'Ошибка входа')
    }
    return res.json()
  },
  me: () => request('GET', '/auth/me'),
  listUsers: () => request('GET', '/auth/users'),
  updateRole: (id, role) => request('PATCH', `/auth/users/${id}/role`, { role }),
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

// Cinemas
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

// Films
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

// Sessions
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

// Tickets
export const ticketsApi = {
  buy: (sessionId, seatNumber) => request('POST', `/tickets/${sessionId}`, { seat_number: seatNumber }),
  myTickets: () => request('GET', '/tickets/my'),
  deleteTicket: (id) => request('DELETE', `/tickets/my/${id}`),
  deleteAllTickets: () => request('DELETE', '/tickets/my/all'),
}

// Halls
export const hallsApi = {
  byCinema: (cinemaId) => request('GET', `/halls/cinema/${cinemaId}`, null, false),
  create: (data) => request('POST', '/halls', data),
  update: (id, data) => request('PUT', `/halls/${id}`, data),
  delete: (id) => request('DELETE', `/halls/${id}`),
}
