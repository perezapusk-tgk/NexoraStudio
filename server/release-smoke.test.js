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
  "app.post('/api/bookings/:id/payment'",
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
assert.ok(server.includes("app.post('/api/public/yookassa/webhook'"),'global YooKassa webhook endpoint missing')
assert.ok(server.includes("payment?.metadata?.type||'')!=='public_order'"),'global YooKassa public-order type binding missing')
assert.ok(server.includes("Idempotence-Key':'nexora-public-order-'+String(orderId)"),'public order YooKassa idempotency key missing')
assert.ok(server.includes("payment?.metadata?.order_id||'')!==orderId"),'public YooKassa webhook order binding missing')
assert.ok(server.includes("reason:'amount_mismatch'"),'public YooKassa webhook amount validation missing')
assert.ok(server.includes("reason:'studio_mismatch'"),'public YooKassa webhook studio binding missing')
assert.ok(server.includes('createYookassaOrderCheckout'),'public YooKassa checkout creator missing')
assert.ok(server.includes('applyYookassaOrderSuccess'),'public YooKassa success handler missing')
assert.ok(server.includes("metadata:{studio_id:studioId,project_id:projectId,slug,order_id:String(orderId),surface:safeSurface,type:'public_order'}"),'public payment metadata missing')
assert.ok(server.includes("checkout_url:payment.url"),'public checkout URL missing')
assert.ok(server.includes("app.get('/api/public/order/:id/payment-status'"),'public payment status endpoint missing')
assert.ok(api.includes('publicOrderPaymentStatus'),'public order payment status API contract missing')
assert.ok(frontend.includes("surface:'site'")&&frontend.includes("surface:'miniapp'"),'public checkout surface contract missing')
assert.ok(frontend.includes('window.location.assign(result.checkout_url)'),'public checkout redirect missing')
assert.ok(frontend.includes('api.publicOrderPaymentStatus(orderId,slug)'),'public payment return status polling missing')
assert.ok(frontend.includes("params.get('payment')")&&frontend.includes("params.get('order_id')"),'public payment return query handling missing')
assert.ok(frontend.includes('paymentConfirmed')&&frontend.includes('paymentCancelled'),'public payment result states missing')
assert.ok(server.includes("const botUrl = bot.username ? 'https://t.me/' + bot.username : ''"),'Telegram bot link contract missing')
assert.ok(server.includes("return res.json({configured:true,bot:{username:bot.username||'',name:bot.first_name||'',url:botUrl},botUrl,url:miniAppUrl,project})"),'Telegram configure response must expose bot URL')
assert.ok(!frontend.includes('mini-public-bottom'),'Mini App must not expose bottom quick navigation')
assert.ok(server.includes("app.post('/api/billing/checkout'"),'billing checkout endpoint missing')
assert.ok(server.includes("app.post('/api/billing/yookassa/webhook'"),'YooKassa webhook endpoint missing')
assert.ok(server.includes("app.post('/api/billing/confirm'"),'billing confirmation endpoint missing')
assert.ok(server.includes("metadata:{studio_id:studioId,plan,transaction_id:transactionId}"),'billing transaction metadata missing')
assert.ok(server.includes("event.event!=='payment.succeeded'"),'YooKassa webhook event guard missing')
assert.ok(server.includes("payment.status!=='succeeded'"),'YooKassa payment confirmation guard missing')
assert.ok(server.includes("tx.status==='paid'"),'billing idempotency guard missing')
assert.ok(server.includes("provider_payment_id=$1"),'billing provider payment id persistence missing')
assert.ok(api.includes("billingCheckout: (plan)"),'frontend billing checkout contract missing')
assert.ok(api.includes("billingConfirm: (transactionId)"),'frontend billing confirm contract missing')
assert.ok(frontend.includes("api.billingCheckout(plan.id)"),'billing UI checkout action missing')
assert.ok(frontend.includes('class PublicErrorBoundary'),'public runtime error boundary missing')
assert.ok(frontend.includes("typeof child==='function'?child(this.state.retry):child"),'PublicErrorBoundary must accept rendered elements and legacy render callbacks')
assert.ok(frontend.includes('class AppErrorBoundary'),'private app runtime error boundary missing')
assert.ok(frontend.includes('const [auth,setAuth]=useState(null)\n  const [authLoading,setAuthLoading]=useState(true)'),'App auth state declarations must remain syntactically separated')
assert.ok(frontend.includes('return <PublicErrorBoundary><PublicApp mode="site"'),'public site must render PublicApp component inside error boundary')
assert.ok(frontend.includes('return <PublicErrorBoundary><PublicApp mode="miniapp"'),'Mini App must render PublicApp component inside error boundary')
assert.ok(api.includes('const controller = new AbortController()'),'API request timeout controller missing')
assert.ok(api.includes("if(error?.name==='AbortError') throw new Error('Сервер не отвечает. Попробуйте обновить страницу.')"),'API timeout must produce a recoverable user error')
assert.ok(server.includes("app.get(['/published/:slug','/miniapp/:slug']"),'public deep-link shell fallback missing')
assert.ok(frontend.includes('const safe={project:v?.project||{name:\'Nexora\'}'),'public response normalization missing')
assert.ok(frontend.includes('const isPublic='),'public route isolation missing')
assert.ok(frontend.includes('function Sites({projects,onCreate,onOpenProject})'),'Sites section component must exist')
assert.ok(frontend.includes("const project = created?.project || created"),'project creation must normalize API response shape')
assert.ok(frontend.includes('function ProjectWorkspace({project,data,view,setView,onProjectUpdated,onBack,onRefresh})'),'project workspace editor must exist')
assert.ok(frontend.includes("const [createType, setCreateType] = useState('website')"),'site and Mini App creation must preserve selected type')
assert.ok(frontend.includes('initialType={createType}'),'create modal must receive the selected creation type')
assert.ok(frontend.includes('await openProject(mapped)'),'new project creation must open the created project workspace')
assert.ok(frontend.includes('function MiniApps({projects,onCreate,onOpenProject})'),'Mini Apps section component must exist')
assert.ok(frontend.includes("active === 'Сайты' && <Sites"),'Sites navigation must render its component')
assert.ok(frontend.includes("active === 'Mini Apps' && <MiniApps"),'Mini Apps navigation must render its component')

for(const route of requiredRoutes) assert.ok(server.includes(route),`missing route: ${route}`)
assert.ok(server.includes("if(role==='admin' && req.user.role!=='owner')"),'admin role escalation guard missing')
assert.ok(server.includes('pg_advisory_xact_lock(hashtext($1))'),'workspace concurrency lock missing')
assert.ok(server.includes('withMemoryBookingLock'),'memory booking lock missing')
assert.ok(server.includes("String('public-booking:'+pr.rows[0].id)"),'public booking database lock must serialize overlapping requests per project')
assert.ok(server.includes("String('booking-payment:'+id)"),'booking payment lock missing')
assert.ok(server.includes("booking_id::text=$1::text and status='paid'"),'booking duplicate paid guard missing')
assert.ok(server.includes("update invoices set status='paid' where order_id::text=$1::text"),'paid order invoice sync missing')
assert.ok(server.includes("Счёт по заказу нельзя отметить оплаченным без подтверждённого платежа"),'invoice payment integrity guard missing')
assert.ok(server.includes("Оплаченный счёт создаётся только после подтверждённого платежа"),'paid invoice creation guard missing')
assert.ok(server.includes("update invoices set status='paid' where order_id::text=$1::text"),'payment invoice sync missing')
assert.ok(server.includes("update bookings set status='completed' where id::text=$1::text"),'payment booking sync missing')
assert.ok(server.includes("Клиент платежа не совпадает с клиентом бронирования"),'booking payment client guard missing')
assert.ok(server.includes("if(bookingId && status==='paid')"),'generic booking payment sync missing')
assert.ok(server.includes("lead.status='won'"),'memory lead conversion status missing')
assert.ok(server.includes("update invoices set status='cancelled' where order_id::text=$1::text and status='paid'"),'refund invoice sync missing')
assert.ok(server.includes("if(invoice && invoice.status!=='cancelled') invoice.status='cancelled'"),'memory refund invoice sync missing')
assert.ok(server.includes("Завершённое бронирование нельзя изменить — статус определяется подтверждённой оплатой"),'completed booking rollback guard missing')
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
assert.ok(server.includes("['cancelled','refunded'].includes(String(oq.rows[0].status||''))"),'closed orders must reject new paid payments')
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

assert.ok(server.includes("app.use('/api',(req,res)=>res.status(404).json({error:'API route not found'"),'unknown API routes must return JSON')
assert.ok(server.includes("req.path.startsWith('/published/')") && server.includes("req.path.startsWith('/miniapp/')"),'published and Mini App paths must bypass custom-domain routing')
assert.ok(server.includes("res.redirect(302,'/published/'+encodeURIComponent(project.slug))"),'custom domains must resolve to published project route')
assert.ok(api.includes("if(response.status===401) setAuthToken('')"),'API client must clear stale auth token on 401')
assert.ok(frontend.includes("api.authMe().then(session=>") && frontend.includes("setAuthLoading(false)"),'auth boot must always leave loading state')assert.ok(frontend.includes('const refreshWorkspace = async ()'),'workspace refresh recovery contract missing')
