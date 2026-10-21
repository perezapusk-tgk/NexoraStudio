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
  project: (id) => request('/projects/' + id),
  updateProject: (id,payload) => request('/projects/' + id,{method:'PATCH',body:JSON.stringify(payload)}),
  createPage: (id,payload) => request('/projects/' + id + '/pages',{method:'POST',body:JSON.stringify(payload)}),
  updatePage: (id,pageId,payload) => request('/projects/' + id + '/pages/' + pageId,{method:'PATCH',body:JSON.stringify(payload)}),
  publishProject: (id) => request('/projects/' + id + '/publish',{method:'POST'}),
  project: (id) => request('/projects/' + id),
  updateProject: (id,payload) => request('/projects/' + id,{method:'PATCH',body:JSON.stringify(payload)}),
  createPage: (id,payload) => request('/projects/' + id + '/pages',{method:'POST',body:JSON.stringify(payload)}),
  updatePage: (id,pageId,payload) => request('/projects/' + id + '/pages/' + pageId,{method:'PATCH',body:JSON.stringify(payload)}),
  publishProject: (id) => request('/projects/' + id + '/publish',{method:'POST'}),
  createProject: async (payload) => (await request('/projects', { method: 'POST', body: JSON.stringify(payload) })).project,
  leads: () => request('/leads'),
  clients: () => request('/clients'),
  bookings: () => request('/bookings'),
  analytics: () => request('/analytics/overview'),
  templates: () => request('/templates'),
}
