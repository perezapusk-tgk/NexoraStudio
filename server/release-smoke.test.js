import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root=path.resolve(import.meta.dirname,'..')
const server=fs.readFileSync(path.join(root,'server','index.js'),'utf8')
const api=fs.readFileSync(path.join(root,'src','api.js'),'utf8')
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
for(const route of requiredRoutes) assert.ok(server.includes(route),`missing route: ${route}`)
assert.ok(server.includes("if(role==='admin' && req.user.role!=='owner')"),'admin role escalation guard missing')
assert.ok(server.includes('pg_advisory_xact_lock(hashtext($1))'),'workspace concurrency lock missing')
assert.ok(server.includes('withMemoryBookingLock'),'memory booking lock missing')
assert.ok(server.includes("String('project-create:'+req.user.studio_id)"),'project creation concurrency lock missing')
assert.ok(server.includes("String('client-create:'+req.user.studio_id)"),'client creation concurrency lock missing')
assert.ok(server.includes('price>100000000'),'catalog price upper bound missing')
assert.ok(server.includes("await client.query('begin')") && server.includes("delete from projects where id::text=$1::text"),'project deletion transaction guard missing')
assert.ok(server.includes('code:\'PLAN_LIMIT\''),'plan limit error contract missing')
assert.ok(server.includes("const allowedEventTypes=new Set(['page_view'])"),'public analytics event allowlist missing')
assert.ok(server.includes("status:'pending'"),'public checkout must create pending orders')
assert.ok(!server.includes('stripe.com'),'Stripe must not be used')
assert.ok(!api.includes('stripe'),'Stripe must not be used in frontend API client')
assert.equal(pkg.scripts.build,'vite build','build script missing')
assert.equal(pkg.scripts.start,'node server/migrate.js && node server/index.js','production start must run migrations')
console.log('Nexora release smoke: OK')
