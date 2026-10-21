const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

export const api = {
  health: () => request('/health'),
  studio: () => request('/studio'),
  projects: () => request('/projects'),
  createProject: (payload) => request('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  leads: () => request('/leads'),
  clients: () => request('/clients'),
  bookings: () => request('/bookings'),
  analytics: () => request('/analytics/overview'),
  templates: () => request('/templates'),
}
