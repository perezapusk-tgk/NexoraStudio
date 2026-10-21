const API_BASE = import.meta.env.VITE_API_URL || '/api'
const AUTH_KEY = 'nexora_auth_token'

export function getAuthToken(){ return localStorage.getItem(AUTH_KEY) || '' }
export function setAuthToken(token){ if(token) localStorage.setItem(AUTH_KEY,token); else localStorage.removeItem(AUTH_KEY) }

async function request(path, options = {}) {
  const token=getAuthToken()
  const headers={ 'Content-Type':'application/json', ...(options.headers || {}) }
  if(token) headers.Authorization='Bearer '+token
  const response = await fetch(API_BASE + path, { ...options, headers })
  if (!response.ok) {
    if(response.status===401) setAuthToken('')
    throw new Error(await response.text())
  }
  return response.json()
}

export const api = {
  authRegister: async (payload) => { const r=await request('/auth/register',{method:'POST',body:JSON.stringify(payload)}); setAuthToken(r.token); return r },
  authLogin: async (payload) => { const r=await request('/auth/login',{method:'POST',body:JSON.stringify(payload)}); setAuthToken(r.token); return r },
  authMe: () => request('/auth/me'),
  authLogout: async () => { try{return await request('/auth/logout',{method:'POST'})} finally{setAuthToken('')} },
  health: () => request('/health'),
  studio: () => request('/studio'),
  studioUsage: () => request('/studio/usage'),
  team: () => request('/team'),
  addTeamMember: (payload) => request('/team',{method:'POST',body:JSON.stringify(payload)}),
  updateTeamRole: (id,role) => request('/team/'+id,{method:'PATCH',body:JSON.stringify({role})}),
  removeTeamMember: (id) => request('/team/'+id,{method:'DELETE'}),
  revokeTeamInvitation: (id) => request('/team/invitations/'+id,{method:'DELETE'}),
  resendTeamInvitation: (id) => request('/team/invitations/'+id+'/resend',{method:'POST'}),
  acceptInvite: (payload) => { const r=request('/auth/accept-invite',{method:'POST',body:JSON.stringify(payload)}); return r },
  projects: () => request('/projects'),
  project: (id) => request('/projects/' + id),
  updateProject: (id,payload) => request('/projects/' + id,{method:'PATCH',body:JSON.stringify(payload)}),
  createProject: async (payload) => (await request('/projects', {method:'POST',body:JSON.stringify(payload)})).project,
  createPage: (id,payload) => request('/projects/' + id + '/pages',{method:'POST',body:JSON.stringify(payload)}),
  updatePage: (id,pageId,payload) => request('/projects/' + id + '/pages/' + pageId,{method:'PATCH',body:JSON.stringify(payload)}),
  publishProject: (id) => request('/projects/' + id + '/publish',{method:'POST'}),
  checkDomain: (id,domain) => request('/projects/' + id + '/domain/check',{method:'POST',body:JSON.stringify({domain})}),
  connectDomain: (id,domain) => request('/projects/' + id + '/domain/connect',{method:'POST',body:JSON.stringify({domain})}),
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
  updateClient: (id,payload) => request('/clients/' + id,{method:'PATCH',body:JSON.stringify(payload)}),
  bookings: () => request('/bookings'),
  createBooking: (payload) => request('/bookings',{method:'POST',body:JSON.stringify(payload)}),
  updateBooking: (id,payload) => request('/bookings/' + id,{method:'PATCH',body:JSON.stringify(typeof payload==='string'?{status:payload}:payload)}),
  bookingPayment: (id,payload) => request('/bookings/' + id + '/payment',{method:'POST',body:JSON.stringify(payload)}),
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
