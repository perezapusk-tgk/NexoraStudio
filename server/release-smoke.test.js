import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root=path.resolve(import.meta.dirname,'..')
const server=fs.readFileSync(path.join(root,'server','index.js'),'utf8')
const api=fs.readFileSync(path.join(root,'src','api.js'),'utf8')
const frontend=fs.readFileSync(path.join(root,'src','main.jsx'),'utf8')
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'))

const requiredRoutes=[
  "app.post('/api/auth/register'",
  "app.post('/api/auth/login'",
  "app.post('/api/auth/accept-invite'",
  "app.get('/api/projects'",
  "app.post('/api/projects'",
  "app.post('/api/projects/:id/publish'",
  "app.get('/api/public/:slug'",
  "app.post('/api/public/:slug/leads'",
  "app.post('/api/public/:slug/bookings'",
  "app.post('/api/public/:slug/checkout'",
  "app.get('/api/projects/:id/catalog'",
  "app.get('/api/leads'",
  "app.get('/api/clients'",
  "app.get('/api/bookings'",
  "app.get('/api/orders'",
  "app.get('/api/invoices'",
  "app.get('/api/payments'",
  "app.get('/api/analytics/overview'",
  "app.post('/api/projects/:id/domain/connect'",
  "app.post('/api/projects/:id/telegram/configure'",
  "app.get('/api/health'"
]
const requiredFrontendContracts=[
  "path[0]==='published'&&path[1]",
  "path[0]==='miniapp'&&path[1]",
  "api.publicProject(slug)",
  "api.publicLead(slug,payload)",
  "api.publicBooking(slug,payload)",
  "api.publicCheckout(slug,payload)",
  "publicCheckout: (slug,payload)",
  "api.configureTelegram(id,payload)",
  "['Оплата', CreditCard]"
]
const frontendContractAliases={
  "api.publicCheckout(slug,payload)":["publicCheckout: (slug,payload)"],
  "api.configureTelegram(id,payload)":["configureTelegram: (id,payload={})"]
}
for(const contract of requiredFrontendContracts) {
  const alternatives=[contract,...(frontendContractAliases[contract]||[])]
  assert.ok(alternatives.some(value=>api.includes(value) || frontend.includes(value)),`missing frontend contract: ${contract}`)
}
assert.ok(server.includes("app.get(['/published/:slug','/miniapp/:slug']"),'published/Mini App SPA fallback missing')
assert.ok(server.includes("app.post('/api/public/order/:id/yookassa-webhook'"),'YooKassa webhook endpoint missing')
assert.ok(server.includes("const botUrl = bot.username ? 'https://t.me/' + bot.username : ''"),'Telegram bot link contract missing')
assert.ok(server.includes("return res.json({configured:true,bot:{username:bot.username||'',name:bot.first_name||'',url:botUrl},botUrl,url:miniAppUrl,project})"),'Telegram configure response must expose bot URL')
assert.ok(!frontend.includes('mini-public-bottom'),'Mini App must not expose bottom quick navigation')
assert.ok(server.includes("return res.status(410).json({error:'Внешняя оплата пока отключена'})"),'deferred YooKassa state must be explicit')

for(const route of requiredRoutes) assert.ok(server.includes(route),`missing route: ${route}`)
assert.ok(server.includes("if(role==='admin' && req.user.role!=='owner')"),'admin role escalation guard missing')
assert.ok(server.includes('pg_advisory_xact_lock(hashtext($1))'),'workspace concurrency lock missing')
assert.ok(server.includes('withMemoryBookingLock'),'memory booking lock missing')
assert.ok(server.includes("String('project-create:'+req.user.studio_id)"),'project creation concurrency lock missing')
assert.ok(server.includes("String('client-create:'+req.user.studio_id)"),'client creation concurrency lock missing')
assert.ok(server.includes("withMemoryWorkspaceLock('checkout:'+project.studio_id"),'public checkout memory lock missing')
assert.ok(server.includes("pg_advisory_xact_lock(hashtext($1))") && server.includes("select plan from studios where id::text=$1::text for update"),'public checkout database lock missing')
assert.ok(server.includes("insert into orders(project_id,client_id,number,status,total,currency,items)"),'public checkout order insert missing')
assert.ok(server.includes('price>100000000'),'catalog price upper bound missing')
assert.ok(server.includes("await client.query('begin')") && server.includes("delete from projects where id::text=$1::text"),'project deletion transaction guard missing')
assert.ok(server.includes('code:\'PLAN_LIMIT\''),'plan limit error contract missing')
assert.ok(server.includes("const allowedEventTypes=new Set(['page_view'])"),'public analytics event allowlist missing')
assert.ok(server.includes("status:'pending'"),'public checkout must create pending orders')
assert.ok(server.includes("if(status==='refunded') return res.status(409).json({error:'Возврат создаётся только через существующий оплаченный платёж'})"),'refunds must use an existing payment transition')
assert.ok(server.includes("if(q.rows[0].order_id && (status==='paid' || status==='refunded'))"),'non-final payment updates must not rewrite order status')
assert.ok(server.includes("for update"),'order status transitions must lock the order row against payment races')
assert.ok(!server.includes('stripe.com'),'Stripe must not be used')
assert.ok(!api.includes('stripe'),'Stripe must not be used in frontend API client')
assert.ok(!server.toLowerCase().includes('paymaster'),'PayMaster must not be active')
  assert.ok(server.includes("const currency=String(req.body?.currency||'RUB').trim().toUpperCase()"),'Billing currency validation missing');
  assert.ok(server.includes("if(!['RUB','USD'].includes(currency))"),'Billing currency must support RUB and USD');
assert.ok(!api.toLowerCase().includes('paymaster'),'PayMaster must not be active in frontend API client')
assert.match(pkg.scripts.build,/release-smoke\.test\.js.*vite build/,'build script must run release smoke checks before Vite')
assert.equal(pkg.scripts.start,'node server/index.js','production start must run migrations inside server startup')
console.log('Nexora release smoke: OK')
