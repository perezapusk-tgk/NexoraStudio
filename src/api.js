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
  publicCheckout: (slug,payload) => request('/public/' + slug + '/checkout',{method:'POST',body:JSON.stringify(payload)}),
  publicEvent: (slug,payload) => request('/public/' + slug + '/events',{method:'POST',body:JSON.stringify(payload)}),
  catalog: (id) => request('/projects/' + id + '/catalog'),
  createCatalogItem: (id,payload) => request('/projects/' + id + '/catalog',{method:'POST',body:JSON.stringify(payload)}),
  updateCatalogItem: (id,itemId,payload) => request('/projects/' + id + '/catalog/' + itemId,{method:'PATCH',body:JSON.stringify(payload)}),
  deleteCatalogItem: (id,itemId) => request('/projects/' + id + '/catalog/' + itemId,{method:'DELETE'}),
  leads: () => request('/leads'),
  updateLead: (id,status) => request('/leads/' + id,{method:'PATCH',body:JSON.stringify({status})}),
  convertLead: (id) => request('/leads/' + id + '/convert',{method:'POST'}),
  clients: () => request('/clients'),
  client: (id) => request('/clients/' + id),
  bookings: () => request('/bookings'),
  updateBooking: (id,status) => request('/bookings/' + id,{method:'PATCH',body:JSON.stringify({status})}),
  payments: () => request('/payments'),
  invoices: () => request('/invoices'),
  orders: () => request('/orders'),
  order: (id) => request('/orders/' + id),
  createOrder: (payload) => request('/orders',{method:'POST',body:JSON.stringify(payload)}),
  updateOrder: (id,status) => request('/orders/' + id,{method:'PATCH',body:JSON.stringify({status})}),
  createInvoiceFromOrder: (id) => request('/orders/' + id + '/invoice',{method:'POST'}),
  createInvoice: (payload) => request('/invoices',{method:'POST',body:JSON.stringify(payload)}),
  createOrderInvoice: (id) => request('/orders/'+id+'/invoice',{method:'POST'}),
  updateInvoice: (id,status) => request('/invoices/' + id,{method:'PATCH',body:JSON.stringify({status})}),
  createPayment: (payload) => request('/payments',{method:'POST',body:JSON.stringify(payload)}),
  updatePayment: (id,status) => request('/payments/' + id,{method:'PATCH',body:JSON.stringify({status})}),
  analytics: () => request('/analytics/overview'),
  projectAnalytics: (id) => request('/projects/' + id + '/analytics'),
  templates: () => request('/templates'),
}
