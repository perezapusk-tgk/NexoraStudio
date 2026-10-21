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
  createProject: async (payload) => (await request('/projects', {method:'POST',body:JSON.stringify(payload)})).project,
  createPage: (id,payload) => request('/projects/' + id + '/pages',{method:'POST',body:JSON.stringify(payload)}),
  updatePage: (id,pageId,payload) => request('/projects/' + id + '/pages/' + pageId,{method:'PATCH',body:JSON.stringify(payload)}),
  publishProject: (id) => request('/projects/' + id + '/publish',{method:'POST'}),
  configureTelegram: (id,payload={}) => request('/projects/' + id + '/telegram/configure',{method:'POST',body:JSON.stringify(payload)}),
  publicProject: (slug) => request('/public/' + slug),
  publicLead: (slug,payload) => request('/public/' + slug + '/leads',{method:'POST',body:JSON.stringify(payload)}),
  publicBooking: (slug,payload) => request('/public/' + slug + '/bookings',{method:'POST',body:JSON.stringify(payload)}),
  publicEvent: (slug,payload) => request('/public/' + slug + '/events',{method:'POST',body:JSON.stringify(payload)}),
  catalog: (id) => request('/projects/' + id + '/catalog'),
  createCatalogItem: (id,payload) => request('/projects/' + id + '/catalog',{method:'POST',body:JSON.stringify(payload)}),
  updateCatalogItem: (id,itemId,payload) => request('/projects/' + id + '/catalog/' + itemId,{method:'PATCH',body:JSON.stringify(payload)}),
  deleteCatalogItem: (id,itemId) => request('/projects/' + id + '/catalog/' + itemId,{method:'DELETE'}),
  leads: () => request('/leads'),
  updateLead: (id,status) => request('/leads/' + id,{method:'PATCH',body:JSON.stringify({status})}),
  convertLead: (id) => request('/leads/' + id + '/convert',{method:'POST'}),
  clients: () => request('/clients'),
  bookings: () => request('/bookings'),
  analytics: () => request('/analytics/overview'),
  projectAnalytics: (id) => request('/projects/' + id + '/analytics'),
  templates: () => request('/templates'),
}
