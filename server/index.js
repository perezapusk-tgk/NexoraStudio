import express from 'express'
import cors from 'cors'
import pg from 'pg'
import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs/promises'
import dns from 'node:dns/promises'

const { Pool } = pg
const app = express()
const port = Number(process.env.PORT || 4000)
const host = process.env.HOST || '0.0.0.0'
const databaseUrl = process.env.DATABASE_URL || ''
let normalizedDatabaseUrl = databaseUrl
if (normalizedDatabaseUrl) {
  try {
    const url = new URL(normalizedDatabaseUrl)
    url.searchParams.delete('sslmode')
    url.searchParams.delete('uselibpqcompat')
    normalizedDatabaseUrl = url.toString()
  } catch {}
}
const pool = normalizedDatabaseUrl ? new Pool({ connectionString: normalizedDatabaseUrl, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 8000, idleTimeoutMillis: 30000, max: 5 }) : null

app.disable('x-powered-by')
// Baseline security headers; CSP is intentionally omitted because the SPA/editor uses dynamic inline styles.
app.use((req,res,next)=>{
  res.set({
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'SAMEORIGIN',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Resource-Policy':'same-site',
    ...(process.env.NODE_ENV==='production' ? {'Strict-Transport-Security':'max-age=31536000; includeSubDomains'} : {})
  })
  next()
})
// Render terminates the proxy layer; trust the first proxy so Express resolves req.ip safely.
app.set('trust proxy', 1)
app.use(cors({origin:(origin,callback)=>{if(!origin)return callback(null,true);try{const url=new URL(origin);const host=url.hostname.toLowerCase();const appHost=new URL(billingAppUrl()).hostname.toLowerCase();if(host===appHost||host==='localhost'||host==='127.0.0.1'||host.endsWith('.nexora.site'))return callback(null,true)}catch{}return callback(new Error('Origin not allowed'))},credentials:true}))
app.use(express.json({limit:'1mb',verify:(req,_res,buf)=>{req.rawBody=Buffer.from(buf)}}))

const distDir = path.resolve(process.cwd(), 'dist')

const noStore = {
  'Cache-Control':'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma':'no-cache',
  'Expires':'0'
}

// Production API compatibility: keep API requests on /api even when a client is configured with the bare Render origin.
app.use((req,res,next)=>{
  const apiPrefixes=['/auth','/studio','/projects','/leads','/clients','/bookings','/payments','/invoices','/orders','/analytics','/templates','/connect','/billing','/team','/public']
  if(!req.path.startsWith('/api') && apiPrefixes.some(prefix=>req.path===prefix||req.path.startsWith(prefix+'/'))){ req.url='/api'+req.url }
  next()
})

// Lightweight abuse protection for public endpoints. Express resolves the client IP via the trusted proxy.
const publicRateBuckets = new Map()
function publicRateLimit({windowMs=60000,max=30}={}){
  return (req,res,next)=>{
    if(req.method==='GET' || !req.path.startsWith('/api/public/')) return next()
    const ip=req.ip || req.socket?.remoteAddress || 'unknown'
    const key=ip+'|'+Math.floor(Date.now()/windowMs)
    const count=(publicRateBuckets.get(key)||0)+1
    publicRateBuckets.set(key,count)
    if(publicRateBuckets.size>5000){
      const now=Date.now()
      for(const [bucket] of publicRateBuckets){
        const ts=Number(bucket.split('|').pop())
        if(Number.isFinite(ts) && ts < Math.floor(now/windowMs)-2) publicRateBuckets.delete(bucket)
      }
    }
    if(count>max){
      res.set('Retry-After',String(Math.ceil(windowMs/1000)))
      return res.status(429).json({error:'Слишком много запросов. Попробуйте немного позже.',code:'RATE_LIMITED'})
    }
    next()
  }
}
app.use(publicRateLimit({windowMs:60000,max:30}))
const authRateBuckets = new Map()
function authRateLimit(req,res,next){
  if(req.method!=='POST' || !req.path.startsWith('/api/auth/')) return next()
  const ip=req.ip || req.socket?.remoteAddress || 'unknown'
  const key=ip+'|'+Math.floor(Date.now()/300000)
  const count=(authRateBuckets.get(key)||0)+1
  authRateBuckets.set(key,count)
  if(authRateBuckets.size>5000){
    const cutoff=Math.floor(Date.now()/300000)-2
    for(const [bucket] of authRateBuckets){ const ts=Number(bucket.split('|').pop()); if(Number.isFinite(ts)&&ts<cutoff) authRateBuckets.delete(bucket) }
  }
  if(count>12){ res.set('Retry-After','300'); return res.status(429).json({error:'Слишком много попыток входа. Попробуйте через несколько минут.',code:'RATE_LIMITED'}) }
  next()
}
app.use(authRateLimit)

// Health must be available independently of the frontend bundle.
const healthPayload = ({db='unknown',ready=true}={}) => ({ok:ready,ready,service:'nexora-api',version:'0.8.0',storage:pool?'postgres':'memory',db,auth:'bearer-session'})
async function healthCheck(){
  if(!pool) return {db:'memory',ready:true}
  try{ await pool.query('select 1'); return {db:'postgres',ready:true} }
  catch(error){ console.error('Health DB check:',error.message); return {db:'postgres',ready:false} }
}
app.get('/health', async (_req,res) => {
  res.set(noStore)
  const state=await healthCheck()
  res.status(state.ready?200:503).json(healthPayload(state))
})
app.get('/api/health', async (_req,res) => {
  res.set(noStore)
  const state=await healthCheck()
  res.status(state.ready?200:503).json(healthPayload(state))
})

// Production frontend: always return a fresh HTML shell so a browser/CDN cannot
// keep an index.html that points at assets from an older deployment.
app.get('/', (_req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  })
  res.sendFile(path.join(distDir, 'index.html'))
})

// SPA deep links: the React router is path-based, so published sites and Mini Apps
// must receive the same HTML shell instead of Express returning a JSON/404 response.
app.get(['/published/:slug','/miniapp/:slug'], (_req,res) => {
  res.set(noStore)
  res.sendFile(path.join(distDir, 'index.html'))
})

app.use(express.static(distDir, {
  index: false,
  fallthrough: true,
  maxAge: '1h',
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      })
    }
  }
}))

const PLAN_CONFIG = { free:{name:'Free',price:0,rubPrice:0,projectLimit:1,teamLimit:1,clientLimit:100}, starter:{name:'Starter',price:9,rubPrice:900,projectLimit:10,teamLimit:3,clientLimit:1000}, pro:{name:'Pro',price:19,rubPrice:1900,projectLimit:50,teamLimit:5,clientLimit:10000}, agency:{name:'Agency',price:39,rubPrice:3900,projectLimit:200,teamLimit:15,clientLimit:50000} }
const planConfig=plan=>PLAN_CONFIG[String(plan||'starter').toLowerCase()]||PLAN_CONFIG.starter
async function clientLimitState(studioId){
  const studioIdText=String(studioId||'')
  if(pool){
    const q=await pool.query('select plan from studios where id=$1',[studioIdText])
    const plan=planConfig(q.rows[0]?.plan)
    const count=(await pool.query('select count(*)::int as count from clients where studio_id::text=$1::text',[studioIdText])).rows[0]?.count||0
    return {count,limit:plan.clientLimit,plan:plan.name,exceeded:count>=plan.clientLimit}
  }
  const studio=memoryStudios?.find?.(x=>x.id===studioIdText)||demoStudio
  const plan=planConfig(studio.plan)
  const count=memoryClients.filter(x=>x.studio_id===studioIdText).length
  return {count,limit:plan.clientLimit,plan:plan.name,exceeded:count>=plan.clientLimit}
}
async function requireClientCapacity(studioId,res){
  const state=await clientLimitState(studioId)
  if(state.exceeded){
    res.status(409).json({error:'Достигнут лимит клиентов вашего тарифа',code:'PLAN_LIMIT',limit:state.limit,plan:state.plan})
    return false
  }
  return true
}
const demoStudio = { id: '00000000-0000-0000-0000-000000000001', name: 'Nexora Studio', ownerName: 'Алексей', plan: 'pro', projectLimit: 50 }
const TEMPLATE_DEFINITIONS={
  barber:{id:'barber',name:'Барбершоп',category:'Красота',blocks:[
    {type:'hero',headline:'Барбершоп нового поколения',subheadline:'Запись онлайн, услуги и мастера в одном месте.',cta:'Записаться',action:'booking'},
    {type:'services',title:'Услуги',items:['Мужская стрижка','Стрижка + борода','Премиум уход'],action:'booking',columns:3},
    {type:'testimonials',title:'Отзывы клиентов',items:['«Отличный сервис и атмосфера»','«Записываюсь каждый месяц»'],columns:2},
    {type:'contacts',title:'Мы рядом',text:'Адрес, телефон и часы работы.'},
    {type:'cta',title:'Готовы к обновлению?',text:'Выберите удобное время и запишитесь онлайн.',button:'Записаться',action:'booking'}
  ],catalog:[{name:'Мужская стрижка',description:'Классическая стрижка',price:25,currency:'RUB'},{name:'Стрижка + борода',description:'Комплексная услуга',price:35,currency:'RUB'},{name:'Премиум уход',description:'Стрижка, борода и уход',price:50,currency:'RUB'}]},
  beauty:{id:'beauty',name:'Салон красоты',category:'Красота',blocks:[
    {type:'hero',headline:'Красота начинается с заботы о себе',subheadline:'Услуги, специалисты и онлайн-запись.',cta:'Записаться',action:'booking'},
    {type:'services',title:'Популярные услуги',items:['Стрижка и укладка','Маникюр','Косметология'],action:'booking',columns:3},
    {type:'gallery',title:'Наши работы',items:['Новый образ','Маникюр','Уход'],columns:3},
    {type:'testimonials',title:'Отзывы',items:['«Очень понравилось»','«Вернусь снова»'],columns:2},
    {type:'cta',title:'Запишитесь онлайн',text:'Выберите услугу и удобное время.',button:'Записаться',action:'booking'}
  ],catalog:[{name:'Стрижка и укладка',description:'Образ на каждый день',price:35,currency:'RUB'},{name:'Маникюр',description:'Маникюр с покрытием',price:30,currency:'RUB'},{name:'Косметология',description:'Консультация и уход',price:60,currency:'RUB'}]},
  cafe:{id:'cafe',name:'Кафе / ресторан',category:'Ресторан',blocks:[
    {type:'hero',headline:'Вкусные встречи каждый день',subheadline:'Меню, заказ и бронирование столика онлайн.',cta:'Забронировать столик',action:'booking'},
    {type:'services',title:'Меню',items:['Завтраки','Основные блюда','Десерты'],action:'lead',columns:3},
    {type:'gallery',title:'Атмосфера',items:['Зал','Кухня','Вечер'],columns:3},
    {type:'contacts',title:'Контакты',text:'Адрес, часы работы и контакты.'},
    {type:'cta',title:'Забронируйте столик',text:'Мы подготовим стол к вашему приходу.',button:'Забронировать',action:'booking'}
  ],catalog:[{name:'Завтрак',description:'Кофе и блюдо на выбор',price:12,currency:'RUB'},{name:'Основное блюдо',description:'Блюдо дня',price:18,currency:'RUB'},{name:'Десерт',description:'Домашний десерт',price:8,currency:'RUB'}]},
  fitness:{id:'fitness',name:'Фитнес',category:'Спорт',blocks:[
    {type:'hero',headline:'Тренируйтесь с удовольствием',subheadline:'Абонементы, тренеры и запись на занятия.',cta:'Начать',action:'booking'},
    {type:'services',title:'Направления',items:['Тренажёрный зал','Персональные тренировки','Групповые занятия'],action:'booking',columns:3},
    {type:'testimonials',title:'Что говорят участники',items:['«Наконец-то вошёл в режим»','«Отличные тренеры»'],columns:2},
    {type:'faq',title:'Частые вопросы',items:['Как проходит первое занятие — Подберём программу после знакомства.','Можно ли отменить запись — Да, заранее предупредите администратора.'],openFirst:true},
    {type:'cta',title:'Готовы начать?',text:'Запишитесь на первое занятие.',button:'Записаться',action:'booking'}
  ],catalog:[{name:'Разовое занятие',description:'Доступ на один день',price:15,currency:'RUB'},{name:'Персональная тренировка',description:'Занятие с тренером',price:40,currency:'RUB'},{name:'Абонемент',description:'Месячный абонемент',price:59,currency:'RUB'}]},
  shop:{id:'shop',name:'Интернет-магазин',category:'Магазин',blocks:[
    {type:'hero',headline:'Ваши любимые товары онлайн',subheadline:'Каталог, корзина и быстрый заказ.',cta:'Смотреть каталог',action:'lead'},
    {type:'services',title:'Категории',items:['Новинки','Хиты продаж','Спецпредложения'],action:'lead',columns:3},
    {type:'gallery',title:'Подборка товаров',items:['Новинки','Популярное','Акции'],columns:3},
    {type:'cta',title:'Есть вопросы?',text:'Оставьте заявку — мы поможем с выбором.',button:'Написать нам',action:'lead'}
  ],catalog:[{name:'Хит продаж',description:'Популярный товар',price:29,currency:'RUB'},{name:'Новинка',description:'Новая позиция',price:39,currency:'RUB'},{name:'Спецпредложение',description:'Цена по акции',price:19,currency:'RUB'}]},
  services:{id:'services',name:'Услуги',category:'Бизнес',blocks:[
    {type:'hero',headline:'Профессиональные услуги для бизнеса',subheadline:'Покажите экспертизу и принимайте заявки онлайн.',cta:'Получить консультацию',action:'lead'},
    {type:'services',title:'Наши услуги',items:['Консультация','Комплексное решение','Сопровождение'],action:'lead',columns:3},
    {type:'testimonials',title:'Клиенты о нас',items:['«Получили результат быстрее ожиданий»','«Отличная команда»'],columns:2},
    {type:'faq',title:'FAQ',items:['Как начать — Оставьте заявку и мы свяжемся с вами.','Сколько длится работа — Срок зависит от задачи.'],openFirst:true},
    {type:'cta',title:'Обсудим задачу?',text:'Расскажите, что нужно сделать.',button:'Оставить заявку',action:'lead'}
  ],catalog:[{name:'Консультация',description:'Разбор задачи',price:50,currency:'RUB'},{name:'Комплексное решение',description:'Проект под ключ',price:250,currency:'RUB'},{name:'Сопровождение',description:'Поддержка проекта',price:90,currency:'RUB'}]}
}
function templateDefinition(id=''){
  return TEMPLATE_DEFINITIONS[String(id||'').toLowerCase()] || TEMPLATE_DEFINITIONS.services
}
function slugify(value){const translit={'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'}; const normalized=String(value||'project').toLowerCase().trim().split('').map(ch=>translit[ch]??ch).join(''); return normalized.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'')||'project'}
function demoProjects(){return [
  {id:'demo-barber',studio_id:demoStudio.id,name:'Barber House',slug:'barber-house',project_type:'website',status:'published',domain:null},
  {id:'demo-beauty',studio_id:demoStudio.id,name:'Nordic Beauty',slug:'nordic-beauty',project_type:'website',status:'draft',domain:null},
  {id:'demo-fitness',studio_id:demoStudio.id,name:'Urban Fitness',slug:'urban-fitness',project_type:'miniapp',status:'published',domain:null},
  {id:'demo-cafe',studio_id:demoStudio.id,name:'Mokka Coffee',slug:'mokka-coffee',project_type:'website',status:'draft',domain:null}
]}
function demoCatalog(projectId){return TEMPLATE_DEFINITIONS.services.catalog.map((x,i)=>({id:'demo-cat-'+projectId+'-'+i,project_id:projectId,...x,active:true}))}
function demoLeads(){return [{id:'lead-1',project_id:'demo-barber',project_slug:'barber-house',name:'Иван',phone:'+7 900 000-00-01',email:'ivan@example.com',message:'Хочу записаться',status:'new',created_at:new Date().toISOString()}]}
function demoClients(){return [{id:'client-1',studio_id:demoStudio.id,name:'Иван',phone:'+7 900 000-00-01',email:'ivan@example.com',created_at:new Date().toISOString()}]}
function demoBookings(){return [{id:'booking-1',project_id:'demo-barber',project_slug:'barber-house',client_id:'client-1',client_name:'Иван',service_name:'Мужская стрижка',starts_at:new Date(Date.now()+86400000).toISOString(),status:'confirmed',created_at:new Date().toISOString()}]}
function demoPayments(){return [{id:'pay-1',project_id:'demo-barber',client_id:'client-1',amount:85,currency:'RUB',status:'paid',description:'Заказ',created_at:new Date().toISOString()}]}
function demoInvoices(){return [{id:'inv-1',project_id:'demo-barber',client_id:'client-1',number:'INV-DEMO-001',amount:85,currency:'RUB',status:'paid',description:'Счёт',created_at:new Date().toISOString()}]}
const memoryProjects = demoProjects()
const memoryPages = new Map(memoryProjects.map(p => [p.id, [{id:'page-'+p.id,title:'Главная',slug:'home',published:p.status==='published',content:{blocks:[
  {type:'hero',headline:p.name,subheadline:'Современный цифровой опыт для ваших клиентов.',cta:'Оставить заявку'},
  {type:'services',title:'Услуги',items:['Основная услуга','Популярная услуга','Премиум услуга']},
  {type:'contacts',title:'Контакты',text:'Свяжитесь с нами удобным способом.'}
]}}]]))
const memoryCatalog = new Map(memoryProjects.map(p => [p.id, demoCatalog(p.id)]))
const memoryLeads = [...demoLeads()]
const memoryClients = [...demoClients()]
const memoryBookings = [...demoBookings()]
const memoryBookingLocks = new Map()
const memoryWorkspaceLocks = new Map()
async function withMemoryWorkspaceLock(key, fn){
  const previous=memoryWorkspaceLocks.get(key)||Promise.resolve()
  let release
  const current=new Promise(resolve=>{release=resolve})
  memoryWorkspaceLocks.set(key,current)
  await previous
  try{return await fn()}finally{release();if(memoryWorkspaceLocks.get(key)===current)memoryWorkspaceLocks.delete(key)}
}
async function withMemoryBookingLock(key, fn){
  const previous=memoryBookingLocks.get(key)||Promise.resolve()
  let release
  const current=new Promise(resolve=>{release=resolve})
  memoryBookingLocks.set(key,current)
  await previous
  try{return await fn()}finally{release();if(memoryBookingLocks.get(key)===current)memoryBookingLocks.delete(key)}
}
const memoryPayments = [...demoPayments()]
const memoryInvoices = [...demoInvoices()]
const memoryOrders = []
const memoryEvents = []
memoryProjects.forEach(x=>x.studio_id=demoStudio.id)
memoryClients.forEach(x=>x.studio_id=demoStudio.id)
memoryLeads.forEach(x=>x.studio_id=demoStudio.id)
memoryBookings.forEach(x=>x.studio_id=demoStudio.id)
memoryPayments.forEach(x=>x.studio_id=demoStudio.id)
memoryInvoices.forEach(x=>x.studio_id=demoStudio.id)
const memoryStudios = [demoStudio]
const memoryUsers = [{id:'demo-owner',studio_id:demoStudio.id,name:demoStudio.ownerName,email:'owner@nexora.local',role:'owner',password_hash:hashPassword('demo')}]
const memorySessions = new Map()
const memoryInvitations = []

function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')) {
  return salt+':'+crypto.scryptSync(String(password),salt,64).toString('hex')
}
function verifyPassword(password,stored) {
  if(!stored||!String(stored).includes(':')) return false
  const [salt,expected]=String(stored).split(':')
  const actual=crypto.scryptSync(String(password),salt,64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex'))
}
const createSessionToken=()=>crypto.randomBytes(32).toString('hex')
const createInviteToken=()=>crypto.randomBytes(32).toString('hex')
const tokenHash=token=>crypto.createHash('sha256').update(token).digest('hex')
const inviteUrl=token=>{const base=String(process.env.APP_URL||process.env.FRONTEND_URL||process.env.RENDER_EXTERNAL_URL||'http://localhost:5173').replace(/\/$/,'');return base+'/?invite='+encodeURIComponent(token)}
const authPayload=(u,studio,token)=>({token,user:{id:u.id,name:u.name,email:u.email,role:u.role},studio:{id:studio.id,name:studio.name,ownerName:studio.owner_name||studio.ownerName,plan:studio.plan,projectLimit:studio.project_limit||studio.projectLimit,billingCurrency:studio.billing_currency||studio.billingCurrency||'RUB',planConfig:planConfig(studio.plan)}})

async function requireAuth(req,res,next){
  const header=String(req.headers.authorization||'')
  const token=header.startsWith('Bearer ')?header.slice(7).trim():''
  if(!token) return res.status(401).json({error:'Требуется авторизация'})
  try {
    if(pool){
      const q=await pool.query(`select u.id,u.name,u.email,u.role,u.studio_id,s.name as studio_name,s.owner_name,s.plan,s.project_limit,s.billing_currency
        from sessions se join users u on u.id::text=se.user_id::text join studios s on s.id::text=u.studio_id::text
        where se.token_hash=$1 and se.expires_at>now()`,[tokenHash(token)])
      if(!q.rows[0]) return res.status(401).json({error:'Сессия истекла или недействительна'})
      const x=q.rows[0]
      req.user={id:x.id,name:x.name,email:x.email,role:x.role,studio_id:x.studio_id}
      req.studio={id:x.studio_id,name:x.studio_name,owner_name:x.owner_name,plan:x.plan,project_limit:x.project_limit,billing_currency:x.billing_currency}
      return next()
    }
    const session=memorySessions.get(tokenHash(token))
    if(!session||session.expiresAt<Date.now()) return res.status(401).json({error:'Сессия истекла или недействительна'})
    const u=memoryUsers.find(x=>x.id===session.user_id)
    if(!u) return res.status(401).json({error:'Пользователь не найден'})
    const studio=memoryStudios.find(x=>x.id===u.studio_id)||demoStudio
    req.user={id:u.id,name:u.name,email:u.email,role:u.role,studio_id:u.studio_id}
    req.studio={id:studio.id,name:studio.name,owner_name:studio.ownerName,plan:studio.plan,project_limit:studio.projectLimit}
    next()
  } catch(e){next(e)}
}

app.post('/api/auth/register',async(req,res)=>{
  const name=String(req.body?.name||'').trim(),studioName=String(req.body?.studioName||'').trim(),email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'')
  if(!name||!studioName||!email||password.length<8)return res.status(400).json({error:'Имя, название студии, email и пароль от 8 символов обязательны'})
  if(name.length>120||studioName.length>160||email.length>160||password.length>128)return res.status(400).json({error:'Проверьте длину введённых данных'})
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Введите корректный email'})
  try{
    if(pool){
      if((await pool.query('select id from users where lower(email)=lower($1)',[email])).rows[0])return res.status(409).json({error:'Пользователь с таким email уже существует'})
      const c=await pool.connect()
      try{
        await c.query('begin')
        const studio=(await c.query('insert into studios(name,owner_name,plan,project_limit) values($1,$2,$3,$4) returning *',[studioName,name,'starter',10])).rows[0]
        const user=(await c.query('insert into users(studio_id,name,email,role,password_hash) values($1,$2,$3,$4,$5) returning id,name,email,role',[studio.id,name,email,'owner',hashPassword(password)])).rows[0]
        const token=createSessionToken()
        await c.query("insert into sessions(user_id,token_hash,expires_at) values($1,$2,now()+interval '30 days')",[user.id,tokenHash(token)])
        await c.query('commit')
        return res.status(201).json(authPayload(user,studio,token))
      }catch(e){await c.query('rollback');throw e}finally{c.release()}
    }
    if(memoryUsers.some(x=>x.email===email))return res.status(409).json({error:'Пользователь с таким email уже существует'})
    const studio={id:crypto.randomUUID(),name:studioName,ownerName:name,plan:'starter',projectLimit:10,project_limit:10,billing_currency:'RUB',billingCurrency:'RUB'}
    memoryStudios.push(studio)
    const user={id:crypto.randomUUID(),studio_id:studio.id,name,email,role:'owner',password_hash:hashPassword(password)}
    memoryUsers.push(user)
    const token=createSessionToken();memorySessions.set(tokenHash(token),{user_id:user.id,expiresAt:Date.now()+30*86400000})
    res.status(201).json(authPayload(user,studio,token))
  }catch(e){res.status(500).json({error:'Не удалось создать рабочее пространство'})}
})
app.post('/api/auth/login',async(req,res)=>{
  const email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'')
  if(!email||!password)return res.status(400).json({error:'Введите email и пароль'})
  if(email.length>160||password.length>128)return res.status(400).json({error:'Проверьте длину введённых данных'})
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Введите корректный email'})
  try{
    if(pool){
      const q=await pool.query(`select u.id,u.name,u.email,u.role,u.password_hash,u.studio_id,s.name as studio_name,s.owner_name,s.plan,s.project_limit,s.billing_currency
        from users u join studios s on s.id=u.studio_id where lower(u.email)=lower($1)`,[email])
      if(!q.rows[0]||!verifyPassword(password,q.rows[0].password_hash))return res.status(401).json({error:'Неверный email или пароль'})
      const x=q.rows[0],user={id:x.id,name:x.name,email:x.email,role:x.role},studio={id:x.studio_id,name:x.studio_name,owner_name:x.owner_name,plan:x.plan,project_limit:x.project_limit}
      const token=createSessionToken();await pool.query("insert into sessions(user_id,token_hash,expires_at) values($1,$2,now()+interval '30 days')",[user.id,tokenHash(token)])
      return res.json(authPayload(user,studio,token))
    }
    const u=memoryUsers.find(x=>x.email===email)
    if(!u||!verifyPassword(password,u.password_hash))return res.status(401).json({error:'Неверный email или пароль'})
    const studio=memoryStudios.find(x=>x.id===u.studio_id)||demoStudio
    const token=createSessionToken();memorySessions.set(tokenHash(token),{user_id:u.id,expiresAt:Date.now()+30*86400000})
    res.json(authPayload(u,studio,token))
  }catch(e){res.status(500).json({error:'Не удалось выполнить вход'})}
})
app.post('/api/auth/accept-invite',async(req,res)=>{
  const token=String(req.body?.token||'').trim()
  const name=String(req.body?.name||'').trim()
  const password=String(req.body?.password||'')
  if(!token||!name||password.length<8)return res.status(400).json({error:'Ссылка, имя и пароль от 8 символов обязательны'})
  if(token.length>256||name.length>120||password.length>128)return res.status(400).json({error:'Проверьте длину введённых данных'})
  try{
    const hash=tokenHash(token)
    if(pool){
      const q=await pool.query(`select i.*,s.name as studio_name,s.owner_name,s.plan,s.project_limit
        from team_invitations i join studios s on s.id::text=i.studio_id::text
        where i.token_hash=$1 and i.expires_at>now() and i.accepted_at is null`,[hash])
      if(!q.rows[0])return res.status(400).json({error:'Приглашение недействительно или уже истекло'})
      const inv=q.rows[0]
      const c=await pool.connect()
      try{
        await c.query('begin')
        // Serialize invitation acceptance with team management so concurrent accepts/invites
        // cannot exceed the workspace member limit.
        await c.query('select pg_advisory_xact_lock(hashtext($1))',[String(inv.studio_id)])
        const locked=(await c.query('select id,studio_id,email,role from team_invitations where id=$1 and accepted_at is null and expires_at>now() for update',[inv.id])).rows[0]
        if(!locked){await c.query('rollback');return res.status(400).json({error:'Приглашение недействительно или уже истекло'})}
        if((await c.query('select id from users where lower(email)=lower($1) limit 1',[locked.email])).rows[0]){await c.query('rollback');return res.status(409).json({error:'Пользователь с таким email уже существует'})}
        const limits=planConfig(inv.plan)
        const [users,invites]=await Promise.all([
          c.query('select count(*)::int as count from users where studio_id::text=$1::text',[locked.studio_id]),
          c.query("select count(*)::int as count from team_invitations where studio_id::text=$1::text and accepted_at is null and expires_at>now()",[locked.studio_id])
        ])
        if(Number(users.rows[0].count)+Number(invites.rows[0].count)>=Number(limits.teamLimit)){
          await c.query('rollback')
          return res.status(409).json({error:'Достигнут лимит участников тарифа',code:'PLAN_LIMIT',limit:limits.teamLimit,plan:limits.name})
        }
        const user=(await c.query('insert into users(studio_id,name,email,role,password_hash) values($1,$2,$3,$4,$5) returning id,name,email,role',[locked.studio_id,name,locked.email,locked.role,hashPassword(password)])).rows[0]
        await c.query('update team_invitations set accepted_at=now() where id=$1',[locked.id])
        const session=createSessionToken()
        await c.query("insert into sessions(user_id,token_hash,expires_at) values($1,$2,now()+interval '30 days')",[user.id,tokenHash(session)])
        await c.query('commit')
        return res.status(201).json(authPayload(user,{id:inv.studio_id,name:inv.studio_name,owner_name:inv.owner_name,plan:inv.plan,project_limit:inv.project_limit},session))
      }catch(e){await c.query('rollback');throw e}finally{c.release()}
    }
    const initialInvite=memoryInvitations.find(x=>x.token_hash===hash&&x.expires_at>Date.now()&&!x.accepted_at)
    if(!initialInvite)return res.status(400).json({error:'Приглашение недействительно или уже истекло'})
    return withMemoryWorkspaceLock(initialInvite.studio_id,async()=>{
      const inv=memoryInvitations.find(x=>x.token_hash===hash&&x.expires_at>Date.now()&&!x.accepted_at)
      if(!inv)return res.status(400).json({error:'Приглашение недействительно или уже истекло'})
      if(memoryUsers.some(x=>String(x.email).toLowerCase()===String(inv.email).toLowerCase()))return res.status(409).json({error:'Пользователь с таким email уже существует'})
      const studio=memoryStudios.find(x=>x.id===inv.studio_id)||demoStudio
      const cfg=planConfig(studio.plan)
      const activeMembers=memoryUsers.filter(x=>x.studio_id===inv.studio_id).length
      const activeInvites=memoryInvitations.filter(x=>x.studio_id===inv.studio_id&&!x.accepted_at&&x.expires_at>Date.now()).length
      if(activeMembers+activeInvites>=Number(cfg.teamLimit))return res.status(409).json({error:'Достигнут лимит участников тарифа',code:'PLAN_LIMIT',limit:cfg.teamLimit,plan:cfg.name})
      const user={id:crypto.randomUUID(),studio_id:inv.studio_id,name,email:inv.email,role:inv.role,password_hash:hashPassword(password)}
      memoryUsers.push(user);inv.accepted_at=Date.now()
      const session=createSessionToken();memorySessions.set(tokenHash(session),{user_id:user.id,expiresAt:Date.now()+30*86400000})
      return res.status(201).json(authPayload(user,studio,session))
    })
  }catch(e){res.status(500).json({error:'Не удалось принять приглашение'})}
})
app.get('/api/auth/me',requireAuth,async(req,res)=>res.json({user:req.user,studio:req.studio}))
app.post('/api/auth/logout',requireAuth,async(req,res)=>{
  const token=String(req.headers.authorization||'').slice(7).trim()
  if(pool)await pool.query('delete from sessions where token_hash=$1',[tokenHash(token)])
  else memorySessions.delete(tokenHash(token))
  res.json({ok:true})
})


async function requireSuperAdmin(req,res){
  if(req.user?.role!=='superadmin') { res.status(403).json({error:'Доступ только владельцу Nexora'}); return false }
  return true
}
async function adminOverview(){
  const fee=Number(process.env.ADMIN_PLATFORM_FEE_PERCENT||10)
  const now=new Date()
  if(!pool){
    const studios=memoryStudios.filter(x=>x.id!==demoStudio.id)
    const users=memoryUsers.filter(x=>x.id!=='demo-owner')
    const projects=memoryProjects.filter(x=>x.studio_id!==demoStudio.id)
    const gmv=memoryPayments.filter(x=>x.status==='paid').reduce((a,x)=>a+Number(x.amount||0),0)
    const activeStudios=studios.length
    return {generated_at:now.toISOString(),currency:'RUB',metrics:{studios:studios.length,users:users.length,projects:projects.length,leads:memoryLeads.length,bookings:memoryBookings.length,orders:memoryOrders.length,gmv,subscriptionRevenue:0,mrr:0,arr:0,monthlySubscriptionRevenue:0,yearlySubscriptionRevenue:0,activeStudios,inactiveStudios:0,activePaidSubscriptions:0,newStudios30d:studios.length,cancelledStudios30d:0,churnRate30d:0,conversionRate:0,platformCommissionPercent:fee,estimatedPlatformCommission:gmv*fee/100,yookassaPayments:0,yookassaPaidPayments:0,yookassaSuccessRate:0},plans:{},series:[],monthlySeries:[],yearlySeries:[],recentStudios:studios.slice(-20).reverse()}
  }
  const [studios,users,projects,leads,bookings,orders,gmv,subscriptions,activeRevenue,plans,recent,active,new30,cancelled30,paymentStats,series,monthlySeries,yearlySeries]=await Promise.all([
    pool.query("select count(*)::int as count from studios"),
    pool.query("select count(*)::int as count from users"),
    pool.query("select count(*)::int as count from projects"),
    pool.query("select count(*)::int as count from leads l join projects p on p.id=l.project_id"),
    pool.query("select count(*)::int as count from bookings b join projects p on p.id=b.project_id"),
    pool.query("select count(*)::int as count from orders o join projects p on p.id=o.project_id"),
    pool.query("select coalesce(sum(amount),0)::numeric as total from payments where status='paid'"),
    pool.query("select coalesce(sum(amount),0)::numeric as total from billing_transactions where status='paid' and provider='yookassa'"),
    pool.query("select coalesce(sum(case plan when 'starter' then 900 when 'pro' then 1900 when 'agency' then 3900 else 0 end),0)::numeric as total from studios where coalesce(subscription_status,'active')='active'"),
    pool.query("select plan,count(*)::int as count from studios group by plan order by count desc"),
    pool.query("select id,name,owner_name,plan,subscription_status,created_at from studios order by created_at desc limit 20"),
    pool.query("select count(*)::int as count from studios where coalesce(subscription_status,'active')='active'"),
    pool.query("select count(*)::int as count from studios where created_at>=now()-interval '30 days'"),
    pool.query("select count(*)::int as count from studios where coalesce(subscription_status,'active') in ('cancelled','inactive','past_due') and updated_at>=now()-interval '30 days'"),
    pool.query("select count(*)::int as payments, count(*) filter (where status='paid')::int as paid_payments, coalesce(sum(amount) filter (where status='paid'),0)::numeric as paid_amount from billing_transactions where provider='yookassa'"),
    pool.query("select to_char(date_trunc('day',d),'YYYY-MM-DD') as day, coalesce((select count(*) from studios s where s.created_at::date=d::date),0)::int as studios, coalesce((select sum(bt.amount) from billing_transactions bt where bt.status='paid' and bt.provider='yookassa' and bt.paid_at::date=d::date),0)::numeric as subscription_revenue, coalesce((select sum(p.amount) from payments p where p.status='paid' and p.created_at::date=d::date),0)::numeric as gmv from generate_series(current_date-29,current_date,interval '1 day') d group by d order by d"),
    pool.query("select to_char(date_trunc('month',d),'YYYY-MM') as month, coalesce((select sum(bt.amount) from billing_transactions bt where bt.status='paid' and bt.provider='yookassa' and bt.paid_at>=date_trunc('month',d) and bt.paid_at<date_trunc('month',d)+interval '1 month'),0)::numeric as subscription_revenue, coalesce((select count(*) from studios s where s.created_at>=date_trunc('month',d) and s.created_at<date_trunc('month',d)+interval '1 month'),0)::int as new_studios from generate_series(date_trunc('month',current_date)-interval '11 months',date_trunc('month',current_date),interval '1 month') d order by d"),
    pool.query("select to_char(date_trunc('year',d),'YYYY') as year, coalesce((select sum(bt.amount) from billing_transactions bt where bt.status='paid' and bt.provider='yookassa' and bt.paid_at>=date_trunc('year',d) and bt.paid_at<date_trunc('year',d)+interval '1 year'),0)::numeric as subscription_revenue, coalesce((select count(*) from studios s where s.created_at>=date_trunc('year',d) and s.created_at<date_trunc('year',d)+interval '1 year'),0)::int as new_studios from generate_series(date_trunc('year',current_date)-interval '2 years',date_trunc('year',current_date),interval '1 year') d order by d")
  ])
  const totalStudios=Number(studios.rows[0]?.count||0)
  const activeStudios=Number(active.rows[0]?.count||0)
  const sub=Number(subscriptions.rows[0]?.total||0)
  const g=Number(gmv.rows[0]?.total||0)
  const mrr=Number(activeRevenue.rows[0]?.total||0)
  const paymentCount=Number(paymentStats.rows[0]?.payments||0)
  const paidPaymentCount=Number(paymentStats.rows[0]?.paid_payments||0)
  const cancelledCount=Number(cancelled30.rows[0]?.count||0)
  const conversionRate=totalStudios?activeStudios/totalStudios*100:0
  const churnBase=activeStudios+cancelledCount
  const churnRate30d=churnBase?cancelledCount/churnBase*100:0
  const currentMonth=Number(monthlySeries.rows[monthlySeries.rows.length-1]?.subscription_revenue||0)
  const currentYear=Number(yearlySeries.rows[yearlySeries.rows.length-1]?.subscription_revenue||0)
  return {generated_at:now.toISOString(),currency:'RUB',metrics:{
    studios:totalStudios,users:Number(users.rows[0]?.count||0),projects:Number(projects.rows[0]?.count||0),
    leads:Number(leads.rows[0]?.count||0),bookings:Number(bookings.rows[0]?.count||0),orders:Number(orders.rows[0]?.count||0),
    gmv:g,subscriptionRevenue:sub,mrr,arr:mrr*12,monthlySubscriptionRevenue:currentMonth,yearlySubscriptionRevenue:currentYear,
    activeStudios,inactiveStudios:Math.max(0,totalStudios-activeStudios),activePaidSubscriptions:activeStudios,
    newStudios30d:Number(new30.rows[0]?.count||0),cancelledStudios30d:cancelledCount,churnRate30d,conversionRate,
    platformCommissionPercent:fee,estimatedPlatformCommission:g*fee/100,
    yookassaPayments:paymentCount,yookassaPaidPayments:paidPaymentCount,yookassaSuccessRate:paymentCount?paidPaymentCount/paymentCount*100:0
  },plans:Object.fromEntries(plans.rows.map(x=>[x.plan,x.count])),series:series.rows,monthlySeries:monthlySeries.rows,yearlySeries:yearlySeries.rows,recentStudios:recent.rows}
}

function requireRole(req,res,roles){ if(!roles.includes(req.user.role)) { res.status(403).json({error:'Недостаточно прав для этой операции'}); return false } return true }
async function ownedProject(req,projectId){
  const id=String(projectId||'').trim()
  if(!id)return null
  if(!pool)return memoryProjects.find(x=>(x.id===id||x.slug===id)&&x.studio_id===req.user.studio_id)||null
  return (await pool.query('select * from projects where (id::text=$1 or slug=$1) and studio_id::text=$2::text limit 1',[id,req.user.studio_id])).rows[0]||null
}
async function ownedClient(req,clientId){
  const id=String(clientId||'').trim()
  if(!id)return null
  if(!pool)return memoryClients.find(x=>x.id===id&&x.studio_id===req.user.studio_id)||null
  return (await pool.query('select id from clients where id::text=$1 and studio_id::text=$2::text limit 1',[id,req.user.studio_id])).rows[0]||null
}
app.use('/api',async(req,res,next)=>{
  if(req.path==='/health'||req.path.startsWith('/auth/')||req.path.startsWith('/public/')||req.path==='/billing/yookassa/webhook')return next()
  try{
    await requireAuth(req,res,async()=>{
      if(req.user.role==='viewer' && req.method!=='GET') return res.status(403).json({error:'Режим просмотра: изменения недоступны'})
      if(req.path.startsWith('/team') && !requireRole(req,res,['owner','admin'])) return
      if((req.path.startsWith('/payments')||req.path.startsWith('/invoices')||req.path.startsWith('/orders')) && req.method!=='GET' && !requireRole(req,res,['owner','admin'])) return
      // High-impact workspace operations require owner/admin privileges.
      const ownerAdminOnly = (
        req.path.startsWith('/billing/') ||
        /^\/projects\/[^/]+\/(publish|unpublish|archive|restore|duplicate)$/.test(req.path) ||
        /^\/projects\/[^/]+\/domain\//.test(req.path) ||
        /^\/projects\/[^/]+\/telegram\//.test(req.path)
      )
      if(ownerAdminOnly && req.method!=='GET' && !requireRole(req,res,['owner','admin'])) return
      const parts=req.path.split('/').filter(Boolean)
      const type=parts[0],id=parts[1]
      if(!id)return next()
      if(pool){
        const queries={
          projects:'select id from projects where studio_id::text=$1::text and (id::text=$2::text or slug=$2::text) limit 1',
          leads:'select l.id from leads l join projects p on p.id=l.project_id where p.studio_id::text=$1::text and l.id::text=$2::text limit 1',
          clients:'select id from clients where studio_id::text=$1::text and id::text=$2::text limit 1',
          bookings:'select b.id from bookings b join projects p on p.id=b.project_id where p.studio_id::text=$1::text and b.id::text=$2::text limit 1',
          payments:'select x.id from payments x join projects p on p.id=x.project_id where p.studio_id::text=$1::text and x.id::text=$2::text limit 1',
          invoices:'select x.id from invoices x join projects p on p.id=x.project_id where p.studio_id::text=$1::text and x.id::text=$2::text limit 1',
          orders:'select x.id from orders x join projects p on p.id=x.project_id where p.studio_id::text=$1::text and x.id::text=$2::text limit 1'
        }
        if(queries[type]){
          const q=await pool.query(queries[type],[req.user.studio_id,id])
          if(!q.rows[0])return res.status(404).json({error:'Объект не найден'})
        }
      } else {
        const maps={
          projects:()=>memoryProjects.find(x=>(x.id===id||x.slug===id)&&x.studio_id===req.user.studio_id),
          leads:()=>memoryLeads.find(x=>x.id===id&&x.studio_id===req.user.studio_id),
          clients:()=>memoryClients.find(x=>x.id===id&&x.studio_id===req.user.studio_id),
          bookings:()=>memoryBookings.find(x=>x.id===id&&x.studio_id===req.user.studio_id),
          payments:()=>memoryPayments.find(x=>x.id===id&&x.studio_id===req.user.studio_id),
          invoices:()=>memoryInvoices.find(x=>x.id===id&&x.studio_id===req.user.studio_id),
          orders:()=>memoryOrders.find(x=>x.id===id&&x.studio_id===req.user.studio_id)
        }
        if(maps[type]&&!maps[type]())return res.status(404).json({error:'Объект не найден'})
      }
      next()
    })
  }catch(e){next(e)}
})

app.get('/api/admin/overview', async (req,res)=>{
  if(!(await requireSuperAdmin(req,res))) return
  try{res.json(await adminOverview())}catch(e){res.status(500).json({error:'Не удалось загрузить статистику владельца'})}
})

app.get('/api/templates', async (_req,res)=>{
  const templates=Object.values(TEMPLATE_DEFINITIONS).map(t=>({id:t.id,name:t.name,category:t.category,blocks:t.blocks.length,catalog:t.catalog.length,description:'Готовый сайт + Mini App'}))
  res.json({templates})
})
app.get('/api/studio', async (req, res) => {
  if(!pool) return res.json({studio:{...req.studio,billing_currency:memoryStudios.find(x=>x.id===req.user.studio_id)?.billing_currency||'RUB'}})
  const q=await pool.query('select * from studios where id=$1',[req.user.studio_id])
  res.json({studio:q.rows[0]||req.studio})
})
app.get('/api/billing/account', async (req,res)=>{
  if(!pool){
    const studio=memoryStudios.find(x=>x.id===req.user.studio_id)||demoStudio
    return res.json({plan:planConfig(studio.plan),currency:studio.billing_currency||'RUB',status:studio.subscription_status||'active',provider:studio.billing_provider||null,renews_at:studio.subscription_renews_at||null,transactions:[]})
  }
  const s=await pool.query('select plan,billing_currency,subscription_status,billing_provider,subscription_started_at,subscription_renews_at from studios where id=$1',[req.user.studio_id])
  const t=await pool.query('select id,plan,amount,currency,status,provider,created_at,paid_at from billing_transactions where studio_id::text=$1::text order by created_at desc limit 20',[req.user.studio_id])
  const row=s.rows[0]||{}
  res.json({plan:planConfig(row.plan),currency:row.billing_currency||'RUB',status:row.subscription_status||'active',provider:row.billing_provider||null,started_at:row.subscription_started_at,renews_at:row.subscription_renews_at,transactions:t.rows})
})
app.patch('/api/billing/settings', async (req,res)=>{
  if(!requireRole(req,res,['owner','admin'])) return
  const currency='RUB'
  if(!pool){
    const studio=memoryStudios.find(x=>x.id===req.user.studio_id)||demoStudio
    studio.billing_currency=currency
    return res.json({currency})
  }
  await pool.query('update studios set billing_currency=$1,updated_at=now() where id=$2',[currency,req.user.studio_id])
  res.json({currency})
})
app.post('/api/billing/plan', async (_req,res)=>{
  return res.status(410).json({error:'Переключение тарифа временно отключено до подключения платёжного провайдера.'})
})
app.get('/api/billing/plans',(req,res)=>res.json({plans:Object.entries(PLAN_CONFIG).map(([id,p])=>({id,...p}))}))

function billingAmount(plan,_currency='RUB'){ return Number(planConfig(plan).rubPrice.toFixed(2)) }
async function yookassaRequest(pathname,method='GET',body=null,idempotenceKey=null){
  const shopId=String(process.env.YOOKASSA_SHOP_ID||'').trim()
  const secret=String(process.env.YOOKASSA_SECRET_KEY||'').trim()
  if(!shopId||!secret) throw new Error('ЮKassa не настроена: добавьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY')
  const headers={'Content-Type':'application/json','Idempotence-Key':String(idempotenceKey||crypto.randomUUID())}
  const auth=Buffer.from(shopId+':'+secret).toString('base64')
  headers.Authorization='Basic '+auth
  const response=await fetch('https://api.yookassa.ru/v3'+pathname,{method,headers,body:body?JSON.stringify(body):undefined})
  const textBody=await response.text()
  let data=null
  try{data=textBody?JSON.parse(textBody):null}catch{data={description:textBody}}
  if(!response.ok) throw new Error(data?.description||data?.message||('ЮKassa API HTTP '+response.status))
  return data
}
function billingAppUrl(){
  return String(process.env.APP_URL||process.env.FRONTEND_URL||process.env.RENDER_EXTERNAL_URL||'http://localhost:5173').replace(/\/$/,'')
}
async function createYookassaCheckout({studioId,plan,amount}){
  const shopId=String(process.env.YOOKASSA_SHOP_ID||'').trim()
  const secret=String(process.env.YOOKASSA_SECRET_KEY||'').trim()
  if(!shopId||!secret) throw new Error('YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY не настроены')
  const idempotence=crypto.randomUUID()
  const r=await fetch('https://api.yookassa.ru/v3/payments',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(shopId+':'+secret).toString('base64'),'Content-Type':'application/json','Idempotence-Key':idempotence},body:JSON.stringify({
    amount:{value:amount.toFixed(2),currency:'RUB'},
    capture:true,
    confirmation:{type:'redirect',return_url:billingAppUrl()+'/?billing=success&provider=yookassa'},
    description:'Nexora Studio '+planConfig(plan).name+' — 30 дней',
    metadata:{studio_id:studioId,plan}
  })})
  const data=await r.json()
  if(!r.ok) throw new Error(data?.description||'ЮKassa не смогла создать оплату')
  return {id:data.id,url:data?.confirmation?.confirmation_url}
}
app.post('/api/billing/checkout', async (_req,res)=>{
  return res.status(410).json({error:'Внешняя оплата PayMaster пока не подключена. Подключение платёжного провайдера будет выполнено на финальном этапе.'})
})
app.post('/api/billing/yookassa/webhook', async (_req,res)=>{
  return res.status(410).json({error:'Внешняя оплата PayMaster пока не подключена.'})
})
app.post('/api/billing/confirm', async (_req,res)=>{
  return res.status(410).json({error:'Внешняя оплата PayMaster пока не подключена.'})
})
app.get('/api/studio/usage', async (req,res) => {
  if(!pool){
    const activeProjects=memoryProjects.filter(x=>x.studio_id===req.user.studio_id).length
    const studio=memoryStudios.find(x=>x.id===req.user.studio_id)||demoStudio; const cfg=planConfig(studio.plan); return res.json({studio,usage:{projects:activeProjects,clients:memoryClients.filter(x=>x.studio_id===req.user.studio_id).length,team:memoryUsers.filter(x=>x.studio_id===req.user.studio_id).length},limits:{projects:studio.projectLimit||studio.project_limit||cfg.projectLimit,clients:cfg.clientLimit,team:cfg.teamLimit},plan:cfg})
  }
  const [projects,clients,team]=await Promise.all([
    pool.query('select count(*)::int as count from projects where studio_id::text=$1::text',[req.user.studio_id]),
    pool.query('select count(*)::int as count from clients where studio_id::text=$1::text',[req.user.studio_id]),
    pool.query('select count(*)::int as count from users where studio_id::text=$1::text',[req.user.studio_id])
  ])
  const cfg=planConfig(req.studio.plan); res.json({studio:req.studio,usage:{projects:projects.rows[0].count,clients:clients.rows[0].count,team:team.rows[0].count},limits:{projects:req.studio.project_limit||cfg.projectLimit,clients:cfg.clientLimit,team:cfg.teamLimit},plan:cfg})
})

app.get('/api/team', async (req,res) => {
  if(!pool){
    const members=memoryUsers.filter(x=>x.studio_id===req.user.studio_id).map(x=>({id:x.id,name:x.name,email:x.email,role:x.role,created_at:x.created_at||new Date().toISOString()}))
    const invitations=memoryInvitations.filter(x=>x.studio_id===req.user.studio_id&&!x.accepted_at).map(x=>({id:x.id,email:x.email,role:x.role,expires_at:new Date(x.expires_at).toISOString(),created_at:new Date(x.created_at).toISOString(),invite_url:inviteUrl(x.token)}))
    return res.json({members,invitations})
  }
  const [m,i]=await Promise.all([
    pool.query('select id,name,email,role,created_at from users where studio_id::text=$1::text order by created_at',[req.user.studio_id]),
    pool.query("select id,email,role,expires_at,created_at from team_invitations where studio_id::text=$1::text and accepted_at is null order by created_at desc",[req.user.studio_id])
  ])
  res.json({members:m.rows,invitations:i.rows.map(x=>({...x,invite_url:null}))})
})

app.post('/api/team', async (req,res) => {
  if(!requireRole(req,res,['owner','admin'])) return
  const email=String(req.body?.email||'').trim().toLowerCase(),role=String(req.body?.role||'member').trim()
  if(!email)return res.status(400).json({error:'Email обязателен'})
  if(email.length>160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Укажите корректный email'})
  if(!['admin','member','viewer'].includes(role))return res.status(400).json({error:'Недопустимая роль'})
  if(role==='admin' && req.user.role!=='owner')return res.status(403).json({error:'Только владелец может назначать роль администратора'})
  try{
    if(!pool){
      return withMemoryWorkspaceLock(req.user.studio_id,async()=>{
        const studio=memoryStudios.find(x=>x.id===req.user.studio_id)||demoStudio
        const cfg=planConfig(studio.plan)
        const activeMembers=memoryUsers.filter(x=>x.studio_id===req.user.studio_id).length
        const activeInvites=memoryInvitations.filter(x=>x.studio_id===req.user.studio_id&&!x.accepted_at&&x.expires_at>Date.now()).length
        if(activeMembers+activeInvites>=cfg.teamLimit)return res.status(409).json({error:'Достигнут лимит участников тарифа',code:'PLAN_LIMIT',limit:cfg.teamLimit,plan:cfg.name})
        if(memoryUsers.some(x=>String(x.email).toLowerCase()===email))return res.status(409).json({error:'Пользователь с таким email уже существует'})
        if(memoryInvitations.some(x=>x.studio_id===req.user.studio_id&&String(x.email).toLowerCase()===email&&!x.accepted_at&&x.expires_at>Date.now()))return res.status(409).json({error:'Для этого email уже есть активное приглашение'})
        const raw=createInviteToken(),inv={id:crypto.randomUUID(),studio_id:req.user.studio_id,email,role,token_hash:tokenHash(raw),token:raw,expires_at:Date.now()+7*86400000,created_at:Date.now(),accepted_at:null}
        memoryInvitations.push(inv)
        return res.status(201).json({invitation:{id:inv.id,email,role,expires_at:new Date(inv.expires_at).toISOString(),created_at:new Date(inv.created_at).toISOString(),invite_url:inviteUrl(raw)}})
      })
    }
    const client=await pool.connect()
    try{
      await client.query('begin')
      await client.query('select pg_advisory_xact_lock(hashtext($1))',[String(req.user.studio_id)])
      const [users,invites]=await Promise.all([
        client.query('select count(*)::int as count from users where studio_id::text=$1::text',[req.user.studio_id]),
        client.query("select count(*)::int as count from team_invitations where studio_id::text=$1::text and accepted_at is null and expires_at>now()",[req.user.studio_id])
      ])
      if(users.rows[0].count+invites.rows[0].count>=planConfig(req.studio.plan).teamLimit){await client.query('rollback');return res.status(409).json({error:'Достигнут лимит участников тарифа'})}
      if((await client.query('select id from users where lower(email)=lower($1)',[email])).rows[0]){await client.query('rollback');return res.status(409).json({error:'Пользователь с таким email уже существует'})}
      if((await client.query("select id from team_invitations where studio_id::text=$1::text and lower(email)=lower($2) and accepted_at is null and expires_at>now()",[req.user.studio_id,email])).rows[0]){await client.query('rollback');return res.status(409).json({error:'Для этого email уже есть активное приглашение'})}
      const raw=createInviteToken()
      const q=await client.query('insert into team_invitations(studio_id,email,role,token_hash,expires_at,invited_by) values($1,$2,$3,$4,now()+interval \'7 days\',$5) returning id,email,role,expires_at,created_at',[req.user.studio_id,email,role,tokenHash(raw),req.user.id])
      await client.query('commit')
      return res.status(201).json({invitation:{...q.rows[0],invite_url:inviteUrl(raw)}})
    }catch(e){try{await client.query('rollback')}catch{};throw e}finally{client.release()}
  }catch(e){console.error('team invite error',e);return res.status(500).json({error:'Не удалось создать приглашение'})}
})
app.delete('/api/team/invitations/:id', async (req,res) => {
  if(!requireRole(req,res,['owner','admin'])) return
  const id=req.params.id
  if(pool){
    const q=await pool.query('delete from team_invitations where id::text=$1 and studio_id::text=$2::text and accepted_at is null returning id',[id,req.user.studio_id])
    if(!q.rows[0])return res.status(404).json({error:'Приглашение не найдено'})
  } else {
    const i=memoryInvitations.findIndex(x=>x.id===id&&x.studio_id===req.user.studio_id&&!x.accepted_at)
    if(i<0)return res.status(404).json({error:'Приглашение не найдено'})
    memoryInvitations.splice(i,1)
  }
  res.json({ok:true})
})

app.post('/api/team/invitations/:id/resend', async (req,res) => {
  if(!requireRole(req,res,['owner','admin'])) return
  const id=req.params.id
  try{
    if(pool){
      const current=await pool.query("select * from team_invitations where id::text=$1 and studio_id::text=$2::text and accepted_at is null",[id,req.user.studio_id])
      if(!current.rows[0])return res.status(404).json({error:'Приглашение не найдено'})
      const raw=createInviteToken()
      const q=await pool.query('update team_invitations set token_hash=$1,expires_at=now()+interval \'7 days\' where id::text=$2 returning id,email,role,expires_at,created_at',[tokenHash(raw),id])
      return res.json({invitation:{...q.rows[0],invite_url:inviteUrl(raw)}})
    }
    const inv=memoryInvitations.find(x=>x.id===id&&x.studio_id===req.user.studio_id&&!x.accepted_at)
    if(!inv)return res.status(404).json({error:'Приглашение не найдено'})
    const raw=createInviteToken();inv.token_hash=tokenHash(raw);inv.token=raw;inv.expires_at=Date.now()+7*86400000
    res.json({invitation:{id:inv.id,email:inv.email,role:inv.role,expires_at:new Date(inv.expires_at).toISOString(),created_at:new Date(inv.created_at).toISOString(),invite_url:inviteUrl(raw)}})
  }catch(e){res.status(500).json({error:'Не удалось обновить приглашение'})}
})

app.patch('/api/team/:id', async (req,res) => {
  if(!requireRole(req,res,['owner','admin'])) return
  const id=req.params.id, role=String(req.body?.role||'').trim()
  if(!['admin','member','viewer'].includes(role)) return res.status(400).json({error:'Недопустимая роль'})
  if(role==='admin' && req.user.role!=='owner') return res.status(403).json({error:'Только владелец может назначать роль администратора'})
  if(pool){
    const q=await pool.query("update users set role=$1 where id::text=$2 and studio_id::text=$3::text and role not in ('owner','superadmin') returning id,name,email,role,created_at",[role,id,req.user.studio_id])
    if(!q.rows[0]) return res.status(404).json({error:'Участник не найден'})
    return res.json({member:q.rows[0]})
  }
  const u=memoryUsers.find(x=>x.id===id&&x.studio_id===req.user.studio_id&&!['owner','superadmin'].includes(x.role))
  if(!u)return res.status(404).json({error:'Участник не найден'})
  u.role=role
  res.json({member:{id:u.id,name:u.name,email:u.email,role:u.role,created_at:u.created_at||new Date().toISOString()}})
})
app.delete('/api/team/:id', async (req,res) => {
  if(!requireRole(req,res,['owner','admin'])) return
  const id=req.params.id
  if(pool){
    const q=await pool.query("delete from users where id::text=$1 and studio_id::text=$2::text and role not in ('owner','superadmin') returning id",[id,req.user.studio_id])
    if(!q.rows[0])return res.status(404).json({error:'Участник не найден'})
  } else {
    const i=memoryUsers.findIndex(x=>x.id===id&&x.studio_id===req.user.studio_id&&!['owner','superadmin'].includes(x.role))
    if(i<0)return res.status(404).json({error:'Участник не найден'})
    memoryUsers.splice(i,1)
  }
  res.json({ok:true})
})

app.get('/api/projects', async (req, res) => {
  if (!pool) return res.json({ projects: memoryProjects.filter(p=>p.studio_id===req.user.studio_id) })
  const { rows } = await pool.query('select id, name, slug, project_type, status, domain, settings, created_at, updated_at from projects where studio_id::text=$1::text order by updated_at desc',[req.user.studio_id])
  res.json({ projects: rows })
})

app.post('/api/projects', async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const projectType = String(req.body?.projectType || 'website').trim()
  const templateId = String(req.body?.templateId || '').trim()
  if (!name) return res.status(400).json({ error: 'Название проекта обязательно' })
  if (name.length>160) return res.status(400).json({ error: 'Название проекта слишком длинное' })
  if (!['website','miniapp','site_miniapp'].includes(projectType)) return res.status(400).json({ error: 'Недопустимый тип проекта' })
  if (!pool) {
  const studio=memoryStudios.find(x=>x.id===req.user.studio_id)||demoStudio
  const cfg=planConfig(studio.plan)
  const limit=Number(studio.projectLimit||studio.project_limit||cfg.projectLimit)
  const count=memoryProjects.filter(x=>x.studio_id===req.user.studio_id).length
  if(count>=limit)return res.status(409).json({error:'Достигнут лимит проектов вашего тарифа',code:'PLAN_LIMIT',limit,plan:cfg.name})
  const template=templateDefinition(templateId)
  const slugBase=slugify(name)
  let slug=slugBase
  let suffix=2
  while(memoryProjects.some(x=>x.slug.toLowerCase()===slug.toLowerCase())) slug=slugBase+'-'+suffix++
  const project={id:crypto.randomUUID(),studio_id:req.user.studio_id,name,slug,project_type:projectType,status:'draft',domain:null,settings:{miniApp:{enabled:projectType.includes('miniapp')}}}
  memoryProjects.unshift(project)
  memoryPages.set(project.id,[{id:crypto.randomUUID(),title:'Главная',slug:'home',published:false,content:{blocks:template.blocks}}])
  memoryCatalog.set(project.id,template.catalog.map(item=>({id:crypto.randomUUID(),project_id:project.id,...item})))
  return res.status(201).json({project})
}
  const client=await pool.connect()
  try{
    await client.query('begin')
    await client.query('select pg_advisory_xact_lock(hashtext($1))',[String('project-create:'+req.user.studio_id)])
    const usage=await client.query('select count(*)::int as count from projects where studio_id::text=$1::text',[req.user.studio_id])
    const limit=Number(req.studio.project_limit||planConfig(req.studio.plan).projectLimit)
    if(usage.rows[0].count>=limit){await client.query('rollback');return res.status(409).json({error:'Достигнут лимит проектов вашего тарифа',code:'PLAN_LIMIT',limit,plan:planConfig(req.studio.plan).name})}
    let slug = slugify(name)
    const slugBase = slug
    let suffix = 2
    while ((await client.query('select 1 from projects where lower(slug)=lower($1)',[slug])).rows[0]) slug = slugBase + '-' + suffix++
    const template=templateDefinition(templateId)
    const { rows } = await client.query('insert into projects (studio_id,name,slug,project_type,status,settings) values ($1,$2,$3,$4,$5,$6) returning *',[req.user.studio_id,name,slug,projectType,'draft',JSON.stringify({miniApp:{enabled:projectType.includes('miniapp')}})])
    await client.query('insert into pages(project_id,title,slug,content) values($1,$2,$3,$4)',[rows[0].id,'Главная','home',JSON.stringify({blocks:template.blocks})])
    for(const item of template.catalog) await client.query('insert into catalog_items(project_id,name,description,price,currency,active) values($1,$2,$3,$4,$5,$6)',[rows[0].id,item.name,item.description,item.price,item.currency,true])
    await client.query('commit')
    res.status(201).json({project:rows[0]})
  }catch(error){
    try{await client.query('rollback')}catch{}
    if(error?.code==='23505')return res.status(409).json({error:'Не удалось создать уникальный проект. Попробуйте ещё раз.',code:'SLUG_CONFLICT'})
    throw error
  }finally{client.release()}
})

app.get('/api/projects/:id', async (req,res)=>{const id=req.params.id;if(!pool){
  const project=memoryProjects.find(p=>(p.id===id||p.slug===id)&&p.studio_id===req.user.studio_id)
  if(!project) return res.status(404).json({error:'Проект не найден'})
  return res.json({project,pages:memoryPages.get(project.id)||[]})
}const pr=await pool.query('select * from projects where studio_id::text=$2::text and (id::text=$1 or slug=$1) limit 1',[id,req.user.studio_id]);if(!pr.rows[0])return res.status(404).json({error:'Проект не найден'});const pg=await pool.query('select * from pages where project_id::text=$1::text order by created_at',[pr.rows[0].id]);res.json({project:pr.rows[0],pages:pg.rows})});
app.post('/api/projects/:id/duplicate',async(req,res)=>{
  const source=await ownedProject(req,req.params.id); if(!source)return res.status(404).json({error:'Проект не найден'})
  const name=String(req.body?.name||source.name+' — копия').trim().slice(0,160)||'Копия проекта'
  if(!pool){
    const slugBase=slugify(name); let slug=slugBase,suffix=2
    while(memoryProjects.some(x=>x.slug.toLowerCase()===slug.toLowerCase())) slug=slugBase+'-'+suffix++
    const copy={...source,id:crypto.randomUUID(),name,slug,status:'draft',domain:null,settings:JSON.parse(JSON.stringify(source.settings||{})),created_at:new Date().toISOString(),updated_at:new Date().toISOString()}
    memoryProjects.unshift(copy)
    memoryPages.set(copy.id,(memoryPages.get(source.id)||[]).map(p=>({...p,id:crypto.randomUUID(),published:false})))
    memoryCatalog.set(copy.id,(memoryCatalog.get(source.id)||[]).map(x=>({...x,id:crypto.randomUUID(),project_id:copy.id})))
    return res.status(201).json({project:copy})
  }
  const usage=await pool.query('select count(*)::int as count from projects where studio_id::text=$1::text',[req.user.studio_id])
  const limit=Number(req.studio.project_limit||planConfig(req.studio.plan).projectLimit)
  if(Number(usage.rows[0].count)>=limit)return res.status(409).json({error:'Достигнут лимит проектов вашего тарифа',code:'PLAN_LIMIT'})
  let slug=slugify(name),base=slug,suffix=2
  while((await pool.query('select 1 from projects where lower(slug)=lower($1)',[slug])).rows[0]) slug=base+'-'+suffix++
  const q=await pool.query('insert into projects(studio_id,name,slug,project_type,status,domain,settings) values($1,$2,$3,$4,$5,$6,$7) returning *',[req.user.studio_id,name,slug,source.project_type,'draft',null,JSON.stringify(source.settings||{})])
  const project=q.rows[0]
  const pages=await pool.query('select title,slug,content from pages where project_id::text=$1::text order by created_at',[source.id])
  for(const p of pages.rows){await pool.query('insert into pages(project_id,title,slug,content,published) values($1,$2,$3,$4,false)',[project.id,p.title,p.slug,JSON.stringify(p.content||{blocks:[]})])}
  const items=await pool.query('select name,description,price,currency,active from catalog_items where project_id::text=$1::text order by created_at',[source.id])
  for(const item of items.rows){await pool.query('insert into catalog_items(project_id,name,description,price,currency,active) values($1,$2,$3,$4,$5,$6)',[project.id,item.name,item.description,item.price,item.currency,item.active])}
  res.status(201).json({project})
})
app.post('/api/projects/:id/archive',async(req,res)=>{
  const project=await ownedProject(req,req.params.id);if(!project)return res.status(404).json({error:'Проект не найден'})
  if(!pool){project.status='archived';return res.json({project})}
  const q=await pool.query("update projects set status='archived',updated_at=now() where id::text=$1::text and studio_id::text=$2::text returning *",[project.id,req.user.studio_id]);res.json({project:q.rows[0]})
})
app.post('/api/projects/:id/restore',async(req,res)=>{
  const project=await ownedProject(req,req.params.id);if(!project)return res.status(404).json({error:'Проект не найден'})
  if(!pool){project.status='draft';return res.json({project})}
  const q=await pool.query("update projects set status='draft',updated_at=now() where id::text=$1::text and studio_id::text=$2::text returning *",[project.id,req.user.studio_id]);res.json({project:q.rows[0]})
})
app.delete('/api/projects/:id',async(req,res)=>{
  if(!pool){
    const index=memoryProjects.findIndex(x=>(x.id===req.params.id||x.slug===req.params.id)&&x.studio_id===req.user.studio_id)
    if(index<0)return res.status(404).json({error:'Проект не найден'})
    const id=memoryProjects[index].id
    memoryProjects.splice(index,1); memoryPages.delete(id); memoryCatalog.delete(id)
    for(const list of [memoryLeads,memoryBookings,memoryPayments,memoryInvoices,memoryOrders]){for(let i=list.length-1;i>=0;i--)if(list[i].project_id===id)list.splice(i,1)}
    return res.json({deleted:true})
  }
  const client=await pool.connect()
  try{
    await client.query('begin')
    const check=await client.query('select id from projects where (id::text=$1::text or slug=$1::text) and studio_id::text=$2::text limit 1',[req.params.id,req.user.studio_id])
    if(!check.rows[0]){await client.query('rollback');return res.status(404).json({error:'Проект не найден'})}
    const projectId=check.rows[0].id
    await client.query('delete from payments where project_id::text=$1::text',[projectId])
    await client.query('delete from invoices where project_id::text=$1::text',[projectId])
    await client.query('delete from orders where project_id::text=$1::text',[projectId])
    await client.query('delete from bookings where project_id::text=$1::text',[projectId])
    await client.query('delete from leads where project_id::text=$1::text',[projectId])
    await client.query('delete from analytics_events where project_id::text=$1::text',[projectId])
    await client.query('delete from pages where project_id::text=$1::text',[projectId])
    await client.query('delete from catalog_items where project_id::text=$1::text',[projectId])
    const deleted=await client.query('delete from projects where id::text=$1::text and studio_id::text=$2::text returning id',[projectId,req.user.studio_id])
    if(!deleted.rows[0]){await client.query('rollback');return res.status(404).json({error:'Проект не найден'})}
    await client.query('commit')
    res.json({deleted:true})
  }catch(error){
    try{await client.query('rollback')}catch{}
    throw error
  }finally{client.release()}
})
app.patch('/api/projects/:id',async(req,res)=>{if(!pool){
  const p=memoryProjects.find(x=>(x.id===req.params.id||x.slug===req.params.id)&&x.studio_id===req.user.studio_id)
  if(!p)return res.status(404).json({error:'Проект не найден'})
  if(req.body?.name!==undefined){
    const name=String(req.body.name).trim()
    if(!name)return res.status(400).json({error:'Название проекта обязательно'})
    if(name.length>160)return res.status(400).json({error:'Название проекта слишком длинное'})
    p.name=name
  }
  if(req.body?.domain!==undefined){
    const domain=String(req.body.domain||'').trim().toLowerCase()
    if(domain && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)) return res.status(400).json({error:'Введите корректный домен'})
    p.domain=domain||null
  }
  if(req.body?.settings){
    let serialized=''
    try{serialized=JSON.stringify(req.body.settings)}catch{return res.status(400).json({error:'Некорректные настройки проекта'})}
    if(serialized.length>50000)return res.status(400).json({error:'Настройки проекта слишком большие'})
    p.settings={...(p.settings||{}),...req.body.settings}
  }
  return res.json({project:p})
}const current=await pool.query('select * from projects where (id::text=$1::text or slug=$1::text) and studio_id::text=$2::text limit 1',[req.params.id,req.user.studio_id]);if(!current.rows[0])return res.status(404).json({error:'Проект не найден'});
let nextName=current.rows[0].name;
if(req.body?.name!==undefined){nextName=String(req.body.name||'').trim();if(!nextName)return res.status(400).json({error:'Название проекта обязательно'});if(nextName.length>160)return res.status(400).json({error:'Название проекта слишком длинное'})}
let nextDomain=current.rows[0].domain;
if(req.body?.domain!==undefined){nextDomain=String(req.body.domain||'').trim().toLowerCase();if(nextDomain&&!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(nextDomain))return res.status(400).json({error:'Введите корректный домен'})}
const settings=req.body?.settings?{...(current.rows[0].settings||{}),...req.body.settings}:current.rows[0].settings;
const serialized=JSON.stringify(settings);if(serialized.length>50000)return res.status(400).json({error:'Настройки проекта слишком большие'});
const q=await pool.query('update projects set name=$1,domain=$2,settings=$3,updated_at=now() where id::text=$4 returning *',[nextName,nextDomain||null,serialized,current.rows[0].id]);res.json({project:q.rows[0]})});
app.post('/api/projects/:id/pages',async(req,res)=>{const title=String(req.body?.title||'Новая страница').trim().slice(0,160);const slug=slugify(req.body?.slug||title).slice(0,160);if(!title||!slug)return res.status(400).json({error:'Некорректные данные страницы'});if(!title)return res.status(400).json({error:'Название страницы обязательно'});if(!pool){const project=memoryProjects.find(x=>(x.id===req.params.id||x.slug===req.params.id)&&x.studio_id===req.user.studio_id);if(!project)return res.status(404).json({error:'Проект не найден'});const pages=memoryPages.get(project.id)||[];if(pages.some(x=>x.slug===slug))return res.status(409).json({error:'Страница с таким адресом уже существует'});const page={id:crypto.randomUUID(),title,slug,content:{blocks:[]},published:false};pages.push(page);memoryPages.set(project.id,pages);return res.status(201).json({page})};const owned=await pool.query('select id from projects where (id::text=$1::text or slug=$1::text) and studio_id::text=$2::text limit 1',[req.params.id,req.user.studio_id]);if(!owned.rows[0])return res.status(404).json({error:'Проект не найден'});const projectId=owned.rows[0].id;const duplicate=await pool.query('select 1 from pages where project_id::text=$1::text and slug=$2 limit 1',[projectId,slug]);if(duplicate.rows[0])return res.status(409).json({error:'Страница с таким адресом уже существует'});const q=await pool.query('insert into pages(project_id,title,slug,content) values($1::uuid,$2,$3,$4) returning *',[projectId,title,slug,JSON.stringify({blocks:[]})]);res.status(201).json({page:q.rows[0]})});
app.patch('/api/projects/:id/pages/:pageId',async(req,res)=>{if(!pool){const project=memoryProjects.find(x=>x.id===req.params.id&&x.studio_id===req.user.studio_id);if(!project)return res.status(404).json({error:'Проект не найден'});const pages=memoryPages.get(req.params.id)||[];const p=pages.find(x=>x.id===req.params.pageId);if(!p)return res.status(404).json({error:'Страница не найдена'});if(req.body?.content){let serialized='';try{serialized=JSON.stringify(req.body.content)}catch{return res.status(400).json({error:'Некорректное содержимое страницы'})}if(serialized.length>200000)return res.status(400).json({error:'Содержимое страницы слишком большое'});p.content=req.body.content;}return res.json({page:p})}const ownership=await pool.query('select id from projects where (id::text=$1::text or slug=$1::text) and studio_id::text=$2::text limit 1',[req.params.id,req.user.studio_id]);if(!ownership.rows[0])return res.status(404).json({error:'Проект не найден'});const q=await pool.query('update pages set title=coalesce($1,title),content=coalesce($2,content),updated_at=now() where id::text=$3::text and project_id::text=$4::text returning *',[req.body?.title?String(req.body.title).trim().slice(0,160):null,req.body?.content?(JSON.stringify(req.body.content).length>200000?(()=>{throw Object.assign(new Error('Содержимое страницы слишком большое'),{status:400})})():JSON.stringify(req.body.content)):null,req.params.pageId,ownership.rows[0].id]);if(!q.rows[0])return res.status(404).json({error:'Страница не найдена'});res.json({page:q.rows[0]})});

app.delete('/api/projects/:id/pages/:pageId',async(req,res)=>{
  const project=await ownedProject(req,req.params.id); if(!project)return res.status(404).json({error:'Проект не найден'})
  if(!pool){const pages=memoryPages.get(project.id)||[];if(pages.length<=1)return res.status(409).json({error:'Нельзя удалить последнюю страницу'});const next=pages.filter(x=>x.id!==req.params.pageId);if(next.length===pages.length)return res.status(404).json({error:'Страница не найдена'});memoryPages.set(project.id,next);return res.json({deleted:true})}
  const count=await pool.query('select count(*)::int as count from pages where project_id::text=$1::text',[project.id]);if(Number(count.rows[0]?.count||0)<=1)return res.status(409).json({error:'Нельзя удалить последнюю страницу'})
  const deleted=await pool.query('delete from pages where id::text=$1::text and project_id::text=$2::text returning id',[req.params.pageId,project.id]);if(!deleted.rows[0])return res.status(404).json({error:'Страница не найдена'});res.json({deleted:true})
})

app.get('/api/public/:slug', async (req,res) => {
  const slug = String(req.params.slug || '').trim()
  if (!pool) {
    const project = memoryProjects.find(p => p.slug === slug && p.status === 'published')
    if (!project) return res.status(404).json({error:'Публичный проект не найден'})
    const publicProject = {
      id: project.id,
      name: project.name,
      slug: project.slug,
      project_type: project.project_type,
      status: project.status,
      domain: project.domain,
      settings: {
        ...(project.settings?.public || {}),
        miniApp: project.settings?.miniApp ? {
          enabled: Boolean(project.settings.miniApp.enabled),
          url: project.settings.miniApp.url || null,
          buttonText: project.settings.miniApp.buttonText || null
        } : undefined
      }
    }
    const publicCatalog = (memoryCatalog.get(project.id)||[]).filter(item => item.active !== false).map(item => ({
      id: item.id,
      project_id: item.project_id,
      name: item.name,
      description: item.description || '',
      price: Number(item.price || 0),
      currency: String(item.currency || 'RUB').toUpperCase(),
      image_url: item.image_url || null,
      active: true
    }))
    return res.json({project:publicProject,pages:(memoryPages.get(project.id)||[]).filter(x=>x.published),catalog:publicCatalog})
  }
  const q = await pool.query('select * from projects where slug=$1 and status=\'published\' limit 1',[slug])
  if (!q.rows[0]) return res.status(404).json({error:'Публичный проект не найден'})
  const project = q.rows[0]
  // Public API must never expose the full project row/settings because those fields
  // may contain studio-only configuration (integrations, internal flags, etc.).
  const publicProject = {
    id: project.id,
    name: project.name,
    slug: project.slug,
    project_type: project.project_type,
    status: project.status,
    domain: project.domain,
    settings: {
      ...(project.settings?.public || {}),
      miniApp: project.settings?.miniApp ? {
        enabled: Boolean(project.settings.miniApp.enabled),
        url: project.settings.miniApp.url || null,
        buttonText: project.settings.miniApp.buttonText || null
      } : undefined
    }
  }
  const pages = await pool.query('select id,title,slug,content,published from pages where project_id::text=$1::text and published=true order by created_at',[project.id])
  const catalog = await pool.query('select id,name,description,price,currency,image_url,active from catalog_items where project_id::text=$1::text and active=true order by created_at desc',[project.id])
  res.json({project:publicProject,pages:pages.rows,catalog:catalog.rows})
})

app.post('/api/projects/:id/domain/check', async (req,res) => {
  const raw=String(req.body?.domain||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'').replace(/\.$/,'')
  if(!raw || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(raw)) return res.status(400).json({error:'Введите корректный домен, например client.ru'})
  const project=await ownedProject(req,req.params.id)
  if(!project)return res.status(404).json({error:'Проект не найден'})
  const others=!pool?memoryProjects.find(p=>p.id!==project.id&&String(p.domain||'').toLowerCase()===raw):(await pool.query('select id,name from projects where lower(domain)=lower($1) and id<>$2 limit 1',[raw,project.id])).rows[0]
  const dnsTarget=project.slug+'.nexora.site'
  if(others)return res.status(409).json({available:false,domain:raw,error:'Этот домен уже подключён к другому проекту'})
  let verified=false
  let records=[]
  try{
    records=(await dns.resolveCname(raw)).map(x=>String(x).toLowerCase().replace(/\.$/,''))
    verified=records.includes(dnsTarget.toLowerCase())
  }catch{}
  return res.json({available:true,domain:raw,verified,dns:{type:'CNAME',host:raw,value:dnsTarget,records},message:verified?'DNS настроен. Домен можно подключить.':'Добавьте CNAME и повторите проверку.'})
})

app.post('/api/projects/:id/domain/connect', async (req,res) => {
  const raw=String(req.body?.domain||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'').replace(/\.$/,'')
  if(!raw || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(raw)) return res.status(400).json({error:'Введите корректный домен, например client.ru'})
  const project=await ownedProject(req,req.params.id)
  if(!project)return res.status(404).json({error:'Проект не найден'})
  const taken=!pool?memoryProjects.find(p=>p.id!==project.id&&String(p.domain||'').toLowerCase()===raw):(await pool.query('select id from projects where lower(domain)=lower($1) and id<>$2 limit 1',[raw,project.id])).rows[0]
  if(taken)return res.status(409).json({error:'Этот домен уже подключён'})
  const dnsTarget=project.slug+'.nexora.site'
  let verified=false
  try{const records=(await dns.resolveCname(raw)).map(x=>String(x).toLowerCase().replace(/\.$/,''));verified=records.includes(dnsTarget.toLowerCase())}catch{}
  if(!verified)return res.status(409).json({error:'DNS ещё не подтверждён. Добавьте CNAME '+raw+' → '+dnsTarget+' и повторите проверку.'})
  const settings={...(project.settings||{}),domain:{...(project.settings||{}).domain||{},domain:raw,verified:true,status:'connected',dnsTarget}}
  if(!pool){project.domain=raw;project.settings=settings;return res.json({project,domain:settings.domain})}
  const q=await pool.query('update projects set domain=$1,settings=$2,updated_at=now() where id::text=$3::text returning *',[raw,JSON.stringify(settings),project.id])
  res.json({project:q.rows[0],domain:settings.domain})
})

app.post('/api/projects/:id/domain/disconnect', async (req,res) => {
  const project = await ownedProject(req,req.params.id)
  if(!project)return res.status(404).json({error:'Проект не найден'})
  const settings={...(project.settings||{})}
  delete settings.domain
  if(!pool){
    project.domain=null
    project.settings=settings
    return res.json({project,domain:null})
  }
  const q=await pool.query('update projects set domain=null,settings=$1,updated_at=now() where id::text=$2::text returning *',[JSON.stringify(settings),project.id])
  return res.json({project:q.rows[0],domain:null})
})

app.post('/api/projects/:id/telegram/configure', async (req,res) => {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
  if (!token) return res.status(503).json({ error: 'TELEGRAM_BOT_TOKEN не настроен на сервере' })
  const project = await ownedProject(req,req.params.id)
  if (!project) return res.status(404).json({ error: 'Проект не найден' })
  if (project.status !== 'published') return res.status(409).json({ error: 'Сначала опубликуйте проект. Telegram Mini App доступен только для опубликованных проектов.', code: 'PROJECT_NOT_PUBLISHED' })
  const domain = String(project.domain || '').trim()
  const base = domain ? 'https://' + domain.replace(/^https?:\/\//,'').replace(/\/$/,'') : billingAppUrl()
  const miniAppUrl = base + '/miniapp/' + project.slug
  const callTelegram = async (method, body) => {
    const response = await fetch('https://api.telegram.org/bot' + token + '/' + method, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) })
    const payload = await response.json()
    if (!response.ok || !payload.ok) throw new Error(payload.description || 'Telegram API error')
    return payload.result
  }
  try {
    const bot = await callTelegram('getMe', {})
    const buttonText = String(req.body?.button_text || 'Открыть Mini App').trim().slice(0,64) || 'Открыть Mini App'
    await callTelegram('setChatMenuButton', { menu_button:{type:'web_app',text:buttonText,web_app:{url:miniAppUrl}} })
    const settings = {...(project.settings||{}), miniApp:{...((project.settings||{}).miniApp||{}),enabled:true,configured:true,botUsername:bot.username||'',url:miniAppUrl,buttonText}}
    if (!pool) project.settings=settings
    else await pool.query('update projects set settings=$1,updated_at=now() where id=$2',[JSON.stringify(settings),project.id])
    return res.json({configured:true,bot:{username:bot.username||'',name:bot.first_name||''},url:miniAppUrl,project})
  } catch (error) {
    return res.status(502).json({error:'Telegram не принял настройку Mini App: '+error.message})
  }
})

app.post('/api/public/:slug/leads', async (req,res) => {
  const slug=String(req.params.slug||'').trim()
  const name=String(req.body?.name||'').trim()
  const phone=String(req.body?.phone||'').trim()
  const message=String(req.body?.message||'').trim()
  const email=String(req.body?.email||'').trim().toLowerCase()
  if(name.length>120||phone.length>40||email.length>160||message.length>2000) return res.status(400).json({error:'Некорректная длина данных'})
  if(!name || (!phone && !email)) return res.status(400).json({error:'Укажите имя и телефон или email'})
  if(email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return res.status(400).json({error:'Некорректный email'})
  if(phone && !/^[0-9+()\\-\\s]{5,40}$/.test(phone)) return res.status(400).json({error:'Некорректный телефон'})
  if(!pool){const project=memoryProjects.find(p=>p.slug===slug && p.status==='published');if(!project) return res.status(404).json({error:'Публичный проект не найден'});const lead={id:crypto.randomUUID(),studio_id:project.studio_id,project_slug:slug,project_id:project.id,name,phone,email,message,status:'new',source:'public',created_at:new Date().toISOString()};memoryLeads.unshift(lead);memoryEvents.push({slug,studio_id:project.studio_id,event_type:'lead',path:'/lead',created_at:new Date().toISOString()});return res.status(201).json({lead})}
  const pr=await pool.query("select id from projects where slug=$1 and status='published' limit 1",[slug])
  if(!pr.rows[0]) return res.status(404).json({error:'Публичный проект не найден'})
  const q=await pool.query('insert into leads(project_id,name,email,phone,message,status,source) values($1,$2,$3,$4,$5,$6,$7) returning id,name,email,phone,message,status,source,created_at',[pr.rows[0].id,name,String(req.body?.email||'').trim()||null,phone||null,message,'new','public'])
  await pool.query('insert into analytics_events(project_id,event_type,path,value,metadata) values($1,$2,$3,$4,$5)',[pr.rows[0].id,'lead','/lead',0,JSON.stringify({source:'public'})])
  res.status(201).json({lead:q.rows[0]})
})

app.post('/api/public/:slug/bookings', async (req,res) => {
  const slug=String(req.params.slug||'').trim()
  const name=String(req.body?.name||'').trim()
  const phone=String(req.body?.phone||'').trim()
  if(!/^[0-9+()\\-\\s]{5,40}$/.test(phone)) return res.status(400).json({error:'Некорректный телефон'})
  const startsAt=String(req.body?.starts_at||'').trim()
  const serviceName=String(req.body?.service_name||'').trim().slice(0,160)
  const startsDate=new Date(startsAt)
  if(!name || !phone || !startsAt) return res.status(400).json({error:'Заполните имя, телефон и время'})
  if(name.length>120||phone.length>40) return res.status(400).json({error:'Некорректная длина данных'})
  if(Number.isNaN(startsDate.getTime()) || startsDate.getTime() < Date.now()+60000) return res.status(400).json({error:'Укажите корректное будущее время записи'})
  const endsDate=new Date(startsDate.getTime()+60*60000)
  const endsAt=endsDate.toISOString()
  if(!pool){const project=memoryProjects.find(p=>p.slug===slug && p.status==='published');if(!project) return res.status(404).json({error:'Публичный проект не найден'});return withMemoryBookingLock(project.id+':'+startsDate.toISOString(),async()=>{let client=memoryClients.find(x=>x.studio_id===project.studio_id&&x.phone===phone);if(!client){if(!await requireClientCapacity(project.studio_id,res))return;client={id:crypto.randomUUID(),studio_id:project.studio_id,name,email:'',phone,created_at:new Date().toISOString()};memoryClients.unshift(client)}const conflict=memoryBookings.find(x=>x.project_id===project.id&&x.status!=='cancelled'&&new Date(x.starts_at)<endsDate&&new Date(x.ends_at||new Date(new Date(x.starts_at).getTime()+60*60000))>startsDate);if(conflict)return res.status(409).json({error:'На это время уже есть запись'});const booking={id:crypto.randomUUID(),studio_id:project.studio_id,project_slug:slug,project_id:project.id,client_id:client.id,customer_name:name,customer_phone:phone,starts_at:startsAt,ends_at:endsAt,service_name:serviceName,status:'pending'};memoryBookings.push(booking);memoryEvents.push({slug,studio_id:project.studio_id,event_type:'booking',path:'/booking',created_at:new Date().toISOString()});return res.status(201).json({booking})})}
  const client=await pool.connect()
  try{
    await client.query('begin')
    const pr=await client.query("select id,studio_id from projects where slug=$1 and status='published' limit 1",[slug])
    if(!pr.rows[0]){await client.query('rollback');return res.status(404).json({error:'Публичный проект не найден'})}
    await client.query('select pg_advisory_xact_lock(hashtext($1))',[String(pr.rows[0].id)+':'+startsDate.toISOString()])
    const conflict=await client.query("select id from bookings where project_id::text=$1::text and status<>'cancelled' and starts_at < $3::timestamptz and coalesce(ends_at,starts_at + interval '1 hour') > $2::timestamptz limit 1",[pr.rows[0].id,startsAt,endsAt])
    if(conflict.rows[0]){await client.query('rollback');return res.status(409).json({error:'На это время уже есть запись'})}
    const existingClient=await client.query('select id from clients where studio_id::text=$1::text and phone=$2 limit 1',[pr.rows[0].studio_id,phone])
    let clientId=existingClient.rows[0]?.id||null
    if(!clientId){
      if(!await requireClientCapacity(pr.rows[0].studio_id,res)){await client.query('rollback');return}
      clientId=(await client.query('insert into clients(studio_id,name,phone) values($1,$2,$3) returning id',[pr.rows[0].studio_id,name,phone])).rows[0].id
    }
    const q=await client.query('insert into bookings(project_id,client_id,customer_name,customer_phone,starts_at,ends_at,service_name,status) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[pr.rows[0].id,clientId,name,phone,startsAt,endsAt,serviceName||null,'pending'])
    await client.query('insert into analytics_events(project_id,event_type,path,value,metadata) values($1,$2,$3,$4,$5)',[pr.rows[0].id,'booking','/booking',0,JSON.stringify({source:'public',service_name:serviceName})])
    await client.query('commit')
    return res.status(201).json({booking:q.rows[0]})
  }catch(error){
    try{await client.query('rollback')}catch{}
    throw error
  }finally{client.release()}
})

app.post('/api/public/:slug/checkout', async (req,res) => {
  const slug=String(req.params.slug||'').trim()
  const name=String(req.body?.name||'').trim()
  const phone=String(req.body?.phone||'').trim()
  const email=String(req.body?.email||'').trim().toLowerCase()
  const items=Array.isArray(req.body?.items)?req.body.items:[]
  if(name.length>120||phone.length>40||email.length>160) return res.status(400).json({error:'Некорректная длина данных'})
  if(!name || (!phone && !email) || !items.length) return res.status(400).json({error:'Укажите имя, телефон или email и хотя бы один товар'})
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:'Некорректный email'})
  if(phone && !/^[0-9+()\-\s]{5,40}$/.test(phone)) return res.status(400).json({error:'Некорректный телефон'})
  if(items.length>50) return res.status(400).json({error:'Слишком много позиций в заказе'})
  let project
  if(!pool) project=memoryProjects.find(p=>p.slug===slug && p.status==='published')
  else project=(await pool.query("select id,name,slug,studio_id from projects where slug=$1 and status='published' limit 1",[slug])).rows[0]
  if(!project) return res.status(404).json({error:'Публичный проект не найден'})
  let total=0
  let currency=null
  const normalized=[]
  for(const item of items){
    const catalogId=String(item.catalog_id||item.id||'').trim()
    const rawQuantity=Number(item.quantity||1)
    if(!Number.isInteger(rawQuantity)||rawQuantity<1||rawQuantity>100) return res.status(400).json({error:'Некорректное количество товара'})
    const quantity=rawQuantity
    let source
    if(pool) source=(await pool.query('select id,name,price,currency from catalog_items where id::text=$1 and project_id::text=$2 and active=true limit 1',[catalogId,project.id])).rows[0]
    else source=(memoryCatalog.get(project.id)||[]).find(x=>x.id===catalogId && x.active!==false)
    if(!source) return res.status(400).json({error:'Товар не найден'})
    const price=Number(source.price||0)
    if(!Number.isFinite(price)||price<0) return res.status(400).json({error:'У товара некорректная цена'})
    const sourceCurrency=String(source.currency||'RUB').toUpperCase()
    if(sourceCurrency!=='RUB') return res.status(400).json({error:'В Nexora доступны только товары и оплаты в RUB.'})
    if(currency && currency!==sourceCurrency) return res.status(400).json({error:'Нельзя оформить заказ с товарами в разных валютах'})
    currency='RUB'
    total+=price*quantity
    if(!Number.isFinite(total)||total>100000000) return res.status(400).json({error:'Сумма заказа превышает допустимый лимит'})
    normalized.push({catalog_id:source.id,name:source.name,price,quantity})
  }
  const createMemoryCheckout=async()=>{
    let clientId=null
    const studioId=project.studio_id||demoStudio.id
    const existing=memoryClients.find(c=>c.studio_id===studioId&&((phone && c.phone===phone)||(email && c.email===email)))
    if(existing) clientId=existing.id
    else {
      if(!await requireClientCapacity(studioId,res))return null
      const client={id:crypto.randomUUID(),studio_id:studioId,name,email,phone,created_at:new Date().toISOString()}
      memoryClients.unshift(client); clientId=client.id
    }
    const number='ORD-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+crypto.randomUUID().slice(0,6).toUpperCase()
    const order={id:crypto.randomUUID(),studio_id:studioId,project_id:project.id,client_id:clientId,number,status:'pending',total,currency:currency||'RUB',items:normalized,created_at:new Date().toISOString()}
    memoryOrders.unshift(order)
    memoryEvents.push({slug,studio_id:studioId,event_type:'order_created',path:'/checkout',value:total,created_at:new Date().toISOString()})
    return order
  }
  let order
  if(!pool){
    order=await withMemoryWorkspaceLock('checkout:'+project.studio_id,createMemoryCheckout)
    if(!order)return
  } else {
    const dbClient=await pool.connect()
    try{
      await dbClient.query('begin')
      await dbClient.query('select pg_advisory_xact_lock(hashtext($1))',[String(project.studio_id||'')])
      const existing=(await dbClient.query("select id from clients where studio_id::text=$1::text and (($2 <> '' and phone=$2) or ($3 <> '' and lower(email)=lower($3))) limit 1",[project.studio_id,phone,email])).rows[0]
      let clientId=existing?.id||null
      if(!clientId){
        const studio=(await dbClient.query('select plan from studios where id::text=$1::text for update',[project.studio_id])).rows[0]
        const plan=planConfig(studio?.plan)
        const count=Number((await dbClient.query('select count(*)::int as count from clients where studio_id::text=$1::text',[project.studio_id])).rows[0]?.count||0)
        if(count>=plan.clientLimit){
          await dbClient.query('rollback')
          return res.status(409).json({error:'Достигнут лимит клиентов вашего тарифа',code:'PLAN_LIMIT',limit:plan.clientLimit,plan:plan.name})
        }
        clientId=(await dbClient.query('insert into clients(studio_id,name,email,phone) values($1,$2,$3,$4) returning id',[project.studio_id,name,email||null,phone||null])).rows[0].id
      }
      const number='ORD-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+crypto.randomUUID().slice(0,6).toUpperCase()
      order=(await dbClient.query('insert into orders(project_id,client_id,number,status,total,currency,items) values($1,$2,$3,$4,$5,$6,$7) returning *',[project.id,clientId,number,'pending',total,'RUB',JSON.stringify(normalized)])).rows[0]
      await dbClient.query('insert into analytics_events(project_id,event_type,path,value,metadata) values($1,$2,$3,$4,$5)',[project.id,'order_created','/checkout',total,JSON.stringify({order_id:order.id})])
      await dbClient.query('commit')
    }catch(error){
      try{await dbClient.query('rollback')}catch{}
      throw error
    }finally{dbClient.release()}
  }
  // External payments are intentionally deferred to the final billing phase.
  // The public checkout still creates a real pending order and CRM client now.
  const publicOrder = {
    id: order.id,
    number: order.number,
    status: order.status,
    total: Number(order.total),
    currency: order.currency,
    items: order.items
  }
  res.status(201).json({order:publicOrder,checkout_url:null,payment_pending:false})
})


app.post('/api/public/order/:id/paymaster-webhook', async (_req,res)=>{
  return res.status(410).json({error:'Внешняя оплата PayMaster пока не подключена'})
})

app.get('/api/public/order/:id/payment-status', async (_req,res)=>{
  return res.status(410).json({error:'Внешняя оплата PayMaster пока не подключена'})
})

app.post('/api/public/:slug/events', async (req,res) => {
  const slug=String(req.params.slug||'').trim().slice(0,120)
  const allowedEventTypes=new Set(['page_view'])
  const type=String(req.body?.event_type||'page_view').trim().slice(0,64)
  const pathValue=String(req.body?.path||'').trim().slice(0,500)
  const value=Number(req.body?.value||0)
  if(!slug) return res.status(400).json({error:'Проект не указан'})
  if(!allowedEventTypes.has(type)) return res.status(400).json({error:'Недопустимый тип события'})
  if(!Number.isFinite(value)||Math.abs(value)>100000000) return res.status(400).json({error:'Некорректное значение события'})
  const metadata=req.body?.metadata && typeof req.body.metadata==='object' && !Array.isArray(req.body.metadata) ? req.body.metadata : {}
  let metadataJson=''
  try{metadataJson=JSON.stringify(metadata)}catch{return res.status(400).json({error:'Некорректные данные события'})}
  if(metadataJson.length>10000) return res.status(400).json({error:'Данные события слишком большие'})
  if(!pool){
    const project=memoryProjects.find(p=>p.slug===slug && p.status==='published')
    if(!project)return res.status(404).json({error:'Публичный проект не найден'})
    memoryEvents.push({slug,studio_id:project.studio_id,event_type:type,path:pathValue,value,metadata,created_at:new Date().toISOString()})
    return res.status(204).end()
  }
  const pr=await pool.query("select id from projects where slug=$1 and status='published' limit 1",[slug])
  if(!pr.rows[0]) return res.status(404).json({error:'Публичный проект не найден'})
  await pool.query('insert into analytics_events(project_id,event_type,path,value,metadata) values($1,$2,$3,$4,$5)',[pr.rows[0].id,type,pathValue,value,metadataJson])
  res.status(204).end()
})

app.post('/api/projects/:id/unpublish',async(req,res)=>{const project=await ownedProject(req,req.params.id);if(!project)return res.status(404).json({error:'Проект не найден'});if(!pool){project.status='draft';(memoryPages.get(project.id)||[]).forEach(p=>p.published=false);return res.json({published:false,project})}const q=await pool.query("update projects set status='draft',updated_at=now() where id::text=$1::text and studio_id::text=$2::text returning *",[project.id,req.user.studio_id]);await pool.query('update pages set published=false,updated_at=now() where project_id::text=$1::text',[project.id]);res.json({published:false,project:q.rows[0]})});
app.get('/api/projects/:id/catalog', async (req,res) => {
  const id = String(req.params.id||'').trim()
  if (!id) return res.status(400).json({error:'Проект не указан'})
  if (!pool) { const project=memoryProjects.find(x=>(x.id===id||x.slug===id)&&x.studio_id===req.user.studio_id); if(!project)return res.status(404).json({error:'Проект не найден'}); return res.json({ items: memoryCatalog.get(project.id) || [] }) }
  // Resolve the project first and keep every comparison explicitly text-to-text.
  // This avoids PostgreSQL text/uuid operator mismatches on installations with
  // mixed legacy column types.
  const project = await pool.query(
    'select id from projects where (id::text=$1::text or slug=$1::text) and studio_id::text=$2::text limit 1',
    [id,req.user.studio_id]
  )
  if (!project.rows[0]) return res.status(404).json({error:'Проект не найден'})
  const projectId = String(project.rows[0].id)
  const q = await pool.query(
    'select id, project_id, name, description, price, currency, image_url, active, created_at from catalog_items where project_id::text=$1::text order by created_at desc',
    [projectId]
  )
  res.json({ items: q.rows })
})
app.post('/api/projects/:id/catalog', async (req,res) => {
  const name = String(req.body?.name || '').trim()
  if (!name) return res.status(400).json({ error:'Название товара обязательно' })
  const rawPrice=req.body?.price
  const price = rawPrice === '' || rawPrice == null ? null : Number(rawPrice)
  if(price!=null && (!Number.isFinite(price) || price<0 || price>100000000)) return res.status(400).json({error:'Некорректная цена'})
  const description=String(req.body?.description || '').trim()
  const imageUrl=String(req.body?.image_url || '').trim()
  if(name.length>160||description.length>2000||imageUrl.length>2000)return res.status(400).json({error:'Слишком длинные данные товара'})
  const payload = { name, description, price, currency:'RUB', image_url:imageUrl, active:req.body?.active !== false }
  const projectKey=String(req.params.id)
  const owned=await ownedProject(req,projectKey)
  if(!owned)return res.status(404).json({error:'Проект не найден'})
  const projectId=owned.id
  if (!pool) { const item={id:crypto.randomUUID(),project_id:projectId,...payload};const list=memoryCatalog.get(projectId)||[];list.unshift(item);memoryCatalog.set(projectId,list);return res.status(201).json({item}) }
  const q = await pool.query('insert into catalog_items(project_id,name,description,price,currency,image_url,active) values($1::uuid,$2,$3,$4,\'RUB\',$5,$6) returning *',[owned.id,payload.name,payload.description,payload.price,payload.image_url,payload.active])
  res.status(201).json({ item:q.rows[0] })
})
app.patch('/api/projects/:id/catalog/:itemId', async (req,res) => {
  const owned=await ownedProject(req,req.params.id)
  if(!owned)return res.status(404).json({error:'Проект не найден'})
  const name=req.body?.name===undefined?undefined:String(req.body?.name||'').trim()
  const description=req.body?.description===undefined?undefined:String(req.body?.description||'').trim()
  const imageUrl=req.body?.image_url===undefined?undefined:String(req.body?.image_url||'').trim()
  const rawPrice=req.body?.price
  const price=rawPrice===undefined?undefined:(rawPrice===''||rawPrice==null?null:Number(rawPrice))
  if(name!==undefined && (!name||name.length>160))return res.status(400).json({error:'Некорректное название товара'})
  if(description!==undefined && description.length>2000)return res.status(400).json({error:'Описание товара слишком длинное'})
  if(imageUrl!==undefined && imageUrl.length>2000)return res.status(400).json({error:'Ссылка на изображение слишком длинная'})
  if(price!==undefined && price!==null && (!Number.isFinite(price)||price<0||price>100000000))return res.status(400).json({error:'Некорректная цена'})
  if(req.body?.active!==undefined && typeof req.body.active!=='boolean')return res.status(400).json({error:'Некорректный статус товара'})
  if(!pool){
    const list=memoryCatalog.get(owned.id)||[]
    const item=list.find(x=>x.id===req.params.itemId)
    if(!item)return res.status(404).json({error:'Позиция каталога не найдена'})
    if(name!==undefined)item.name=name
    if(description!==undefined)item.description=description
    if(price!==undefined)item.price=price
    if(imageUrl!==undefined)item.image_url=imageUrl
    if(req.body?.active!==undefined)item.active=req.body.active
    return res.json({item})
  }
  const q=await pool.query("update catalog_items set name=coalesce($1,name),description=coalesce($2,description),price=coalesce($3,price),currency='RUB',image_url=coalesce($4,image_url),active=coalesce($5,active) where id::text=$6 and project_id::text=$7 returning *",[name,description,price,imageUrl,req.body?.active,req.params.itemId,owned.id])
  if(!q.rows[0])return res.status(404).json({error:'Позиция каталога не найдена'})
  res.json({item:q.rows[0]})
})
app.delete('/api/projects/:id/catalog/:itemId', async (req,res) => {
  const owned=await ownedProject(req,req.params.id)
  if(!owned)return res.status(404).json({error:'Проект не найден'})
  if (!pool){const list=memoryCatalog.get(owned.id)||[];const next=list.filter(x=>x.id!==req.params.itemId);if(next.length===list.length)return res.status(404).json({error:'Позиция каталога не найдена'});memoryCatalog.set(owned.id,next);return res.json({deleted:true})}
  const q = await pool.query('delete from catalog_items where id::text=$1 and project_id::text=$2 returning id',[req.params.itemId,owned.id])
  if (!q.rows[0]) return res.status(404).json({error:'Позиция каталога не найдена'})
  res.json({deleted:true})
})

app.post('/api/projects/:id/publish',async(req,res)=>{
  const owned=await ownedProject(req,req.params.id)
  if(!owned)return res.status(404).json({error:'Проект не найден'})
  if(!pool){
    const p=owned
    p.status='published'
    ;(memoryPages.get(p.id)||[]).forEach(x=>x.published=true)
    const publicBase=p.domain?'https://'+p.domain:billingAppUrl()
    return res.json({published:true,project:p,url:publicBase+'/published/'+encodeURIComponent(p.slug),miniapp_url:publicBase+'/miniapp/'+encodeURIComponent(p.slug)})
  }
  const q=await pool.query("update projects set status='published',updated_at=now() where id::text=$1::text and studio_id::text=$2::text returning *",[owned.id,req.user.studio_id])
  if(!q.rows[0])return res.status(404).json({error:'Проект не найден'})
  await pool.query('update pages set published=true,updated_at=now() where project_id::text=$1::text',[owned.id])
  const publicBase=q.rows[0].domain?'https://'+q.rows[0].domain:billingAppUrl()
  res.json({published:true,project:q.rows[0],url:publicBase+'/published/'+encodeURIComponent(q.rows[0].slug),miniapp_url:publicBase+'/miniapp/'+encodeURIComponent(q.rows[0].slug)})
})

app.get('/api/leads', async (req, res) => {
  if (!pool) return res.json({ leads: memoryLeads.filter(x=>x.studio_id===req.user.studio_id) })
  const { rows } = await pool.query('select l.id, l.project_id, l.name, l.email, l.phone, l.message, l.source, l.status, l.created_at, p.name as project_name from leads l left join projects p on p.id::text=l.project_id::text where p.studio_id::text=$1::text order by created_at desc limit 100',[req.user.studio_id])
  res.json({ leads: rows })
})

app.get('/api/bookings', async (req, res) => {
  if (!pool) return res.json({ bookings: memoryBookings.filter(x=>x.studio_id===req.user.studio_id) })
  const { rows } = await pool.query('select b.id, b.project_id, b.client_id, b.customer_name, b.customer_phone, b.starts_at, b.ends_at, b.service_name, b.status, p.name as project_name from bookings b left join projects p on p.id::text=b.project_id::text where p.studio_id::text=$1::text order by starts_at asc limit 100',[req.user.studio_id])
  res.json({ bookings: rows })
})

app.post('/api/bookings', async (req,res) => {
  const body=req.body||{}
  const projectId=String(body.project_id||'').trim()
  const name=String(body.customer_name||'').trim()
  const phone=String(body.customer_phone||'').trim()
  const service=String(body.service_name||'').trim()
  const clientId=body.client_id?String(body.client_id).trim():null
  const startsAt=String(body.starts_at||'').trim()
  const endsAt=String(body.ends_at||'').trim()
  const status=String(body.status||'confirmed').trim()
  if(!projectId||!name||!startsAt||!endsAt)return res.status(400).json({error:'Укажите проект, клиента и время начала и окончания'})
  if(name.length>120||phone.length>40||service.length>160)return res.status(400).json({error:'Слишком длинные данные бронирования'})
  if(!['pending','confirmed','completed','cancelled'].includes(status))return res.status(400).json({error:'Недопустимый статус'})
  if(Number.isNaN(Date.parse(startsAt))||Number.isNaN(Date.parse(endsAt))||new Date(endsAt)<=new Date(startsAt))return res.status(400).json({error:'Проверьте время начала и окончания'})
  if(!pool){
    const project=memoryProjects.find(x=>x.id===projectId&&x.studio_id===req.user.studio_id)
    if(!project)return res.status(404).json({error:'Проект не найден'})
    const conflict=memoryBookings.find(x=>x.project_id===projectId&&x.status!=='cancelled'&&new Date(x.starts_at)<new Date(endsAt)&&new Date(x.ends_at||new Date(new Date(x.starts_at).getTime()+3600000))>new Date(startsAt))
    if(conflict)return res.status(409).json({error:'Это время уже занято другой записью'})
    let client=clientId?memoryClients.find(x=>x.id===clientId&&x.studio_id===req.user.studio_id):null
    if(clientId&&!client)return res.status(404).json({error:'Выбранный клиент не найден'})
    if(!client && phone) client=memoryClients.find(x=>x.studio_id===req.user.studio_id&&x.phone===phone)
    if(!client){
      if(!await requireClientCapacity(req.user.studio_id,res))return
      client={id:crypto.randomUUID(),studio_id:req.user.studio_id,name,email:'',phone,created_at:new Date().toISOString()}
      memoryClients.unshift(client)
    }
    const booking={id:crypto.randomUUID(),studio_id:req.user.studio_id,project_id:projectId,project_name:project.name,client_id:client.id,customer_name:name,customer_phone:phone,starts_at:startsAt,ends_at:endsAt,service_name:service,status}
    memoryBookings.push(booking)
    return res.status(201).json({booking})
  }
  const project=(await pool.query('select id,name from projects where id::text=$1 and studio_id::text=$2::text limit 1',[projectId,req.user.studio_id])).rows[0]
  if(!project)return res.status(404).json({error:'Проект не найден'})
  const conflict=(await pool.query("select id from bookings where project_id::text=$1::text and status <> 'cancelled' and starts_at < $3 and ends_at > $2 limit 1",[projectId,startsAt,endsAt])).rows[0]
  if(conflict)return res.status(409).json({error:'Это время уже занято другой записью'})
  let client=null
  if(clientId){
    client=(await pool.query('select id,name,phone from clients where id::text=$1::text and studio_id::text=$2::text limit 1',[clientId,req.user.studio_id])).rows[0]
    if(!client)return res.status(404).json({error:'Выбранный клиент не найден'})
  }else if(phone){
    client=(await pool.query('select id,name,phone from clients where studio_id::text=$1::text and phone=$2 limit 1',[req.user.studio_id,phone])).rows[0]
  }
  if(phone&&!client && !await requireClientCapacity(req.user.studio_id,res))return
  const q=await pool.query('insert into bookings(project_id,client_id,customer_name,customer_phone,starts_at,ends_at,service_name,status) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[projectId,client?.id||null,name,phone||client?.phone||null,startsAt,endsAt,service||null,status])
  res.status(201).json({booking:{...q.rows[0],project_name:project.name}})
})

app.patch('/api/bookings/:id', async (req,res) => {
  const body=req.body||{}
  const hasStatus=body.status!==undefined
  const status=hasStatus?String(body.status||'').trim():''
  const startsAt=body.starts_at!==undefined?String(body.starts_at||'').trim():undefined
  const endsAt=body.ends_at!==undefined?String(body.ends_at||'').trim():undefined
  const customerName=body.customer_name!==undefined?String(body.customer_name||'').trim():undefined
  const customerPhone=body.customer_phone!==undefined?String(body.customer_phone||'').trim():undefined
  const serviceName=body.service_name!==undefined?String(body.service_name||'').trim():undefined
  if(hasStatus&&!['pending','confirmed','completed','cancelled'].includes(status)) return res.status(400).json({error:'Недопустимый статус бронирования'})
  if(customerName!==undefined&&customerName.length>120)return res.status(400).json({error:'Имя клиента слишком длинное'})
  if(customerPhone!==undefined&&customerPhone.length>40)return res.status(400).json({error:'Телефон слишком длинный'})
  if(serviceName!==undefined&&serviceName.length>160)return res.status(400).json({error:'Название услуги слишком длинное'})
  if(startsAt&&Number.isNaN(Date.parse(startsAt))) return res.status(400).json({error:'Некорректное время начала'})
  if(endsAt&&Number.isNaN(Date.parse(endsAt))) return res.status(400).json({error:'Некорректное время окончания'})
  if(startsAt&&endsAt&&new Date(endsAt)<=new Date(startsAt)) return res.status(400).json({error:'Время окончания должно быть позже начала'})
  if(!pool){
    const booking=memoryBookings.find(x=>x.id===req.params.id&&x.studio_id===req.user.studio_id)
    if(!booking)return res.status(404).json({error:'Бронирование не найдено'})
    const nextStart=startsAt!==undefined?new Date(startsAt):new Date(booking.starts_at)
    const nextEnd=endsAt!==undefined?new Date(endsAt):new Date(booking.ends_at||new Date(nextStart.getTime()+3600000))
    if(startsAt!==undefined||endsAt!==undefined){
      const conflict=memoryBookings.find(x=>x.id!==booking.id&&x.studio_id===req.user.studio_id&&x.project_id===booking.project_id&&x.status!=='cancelled'&&new Date(x.starts_at)<nextEnd&&new Date(x.ends_at||new Date(new Date(x.starts_at).getTime()+3600000))>nextStart)
      if(conflict)return res.status(409).json({error:'Это время уже занято другой записью'})
    }
    if(hasStatus)booking.status=status
    if(startsAt!==undefined)booking.starts_at=startsAt
    if(endsAt!==undefined)booking.ends_at=endsAt
    if(customerName!==undefined)booking.customer_name=customerName
    if(customerPhone!==undefined)booking.customer_phone=customerPhone
    if(serviceName!==undefined)booking.service_name=serviceName
    return res.json({booking})
  }
  const current=(await pool.query('select b.* from bookings b join projects p on p.id=b.project_id where b.id::text=$1::text and p.studio_id::text=$2::text limit 1',[req.params.id,req.user.studio_id])).rows[0]
  if(!current)return res.status(404).json({error:'Бронирование не найдено'})
  const nextStart=startsAt!==undefined?startsAt:current.starts_at
  const nextEnd=endsAt!==undefined?endsAt:(current.ends_at||new Date(new Date(nextStart).getTime()+3600000).toISOString())
  if(startsAt!==undefined||endsAt!==undefined){
    const conflict=(await pool.query("select id from bookings where project_id::text=$1::text and id::text<>$2::text and status <> 'cancelled' and starts_at < $4 and ends_at > $3 limit 1",[current.project_id,current.id,nextStart,nextEnd])).rows[0]
    if(conflict)return res.status(409).json({error:'Это время уже занято другой записью'})
  }
  const fields=[],values=[]
  const add=(column,value)=>{fields.push(column+'=$'+(values.length+1));values.push(value)}
  if(hasStatus)add('status',status)
  if(startsAt!==undefined)add('starts_at',startsAt)
  if(endsAt!==undefined)add('ends_at',endsAt)
  if(customerName!==undefined)add('customer_name',customerName)
  if(customerPhone!==undefined)add('customer_phone',customerPhone)
  if(serviceName!==undefined)add('service_name',serviceName)
  if(!fields.length)return res.status(400).json({error:'Нет изменений'})
  values.push(req.params.id)
  values.push(req.user.studio_id)
  const q=await pool.query('update bookings set '+fields.join(', ')+' where id::text=$'+(values.length-1)+'::text and project_id in (select id from projects where studio_id::text=$'+values.length+'::text) returning *',values)
  if(!q.rows[0])return res.status(404).json({error:'Бронирование не найдено'})
  res.json({booking:q.rows[0]})
})

app.post('/api/bookings/:id/payment', async (req,res) => {
  const id=req.params.id
  const amount=Number(req.body?.amount)
  const currency=String(req.body?.currency||'RUB').trim().toUpperCase()
  if(!Number.isFinite(amount)||amount<=0||amount>100000000)return res.status(400).json({error:'Укажите корректную сумму оплаты'})
  if(currency!=='RUB')return res.status(400).json({error:'Оплата доступна только в RUB'})
  let booking
  if(!pool) booking=memoryBookings.find(x=>x.id===id&&x.studio_id===req.user.studio_id)
  else booking=(await pool.query('select b.* from bookings b join projects p on p.id=b.project_id where b.id::text=$1 and p.studio_id::text=$2::text limit 1',[id,req.user.studio_id])).rows[0]
  if(!booking)return res.status(404).json({error:'Бронирование не найдено'})
  const projectId=booking.project_id||null
  if(!projectId)return res.status(400).json({error:'У бронирования не указан проект'})
  const description='Оплата бронирования'+(booking.service_name?' · '+booking.service_name:'')
  if(!pool){const payment={id:crypto.randomUUID(),project_id:projectId,client_id:booking.client_id||null,booking_id:id,order_id:null,amount,currency,status:'paid',description,created_at:new Date().toISOString()};memoryPayments.unshift(payment);booking.status='completed';memoryEvents.push({slug:booking.project_slug,event_type:'payment',path:'/booking',value:amount,created_at:new Date().toISOString()});return res.status(201).json({payment,booking})}
  const q=await pool.query('insert into payments(project_id,client_id,booking_id,amount,currency,status,description) values($1,$2,$3,$4,$5,$6,$7) returning *',[projectId,booking.client_id||null,id,amount,currency,'paid',description])
  await pool.query("update bookings set status='completed' where id::text=$1::text",[id])
  await pool.query('insert into analytics_events(project_id,event_type,path,value,metadata) values($1,$2,$3,$4,$5)',[projectId,'payment','/booking',amount,JSON.stringify({booking_id:id})])
  res.status(201).json({payment:q.rows[0],booking:{...booking,status:'completed'}})
})


app.patch('/api/leads/:id', async (req,res) => {
  const id=String(req.params.id)
  const status=String(req.body?.status||'').trim()
  if(!status)return res.status(400).json({error:'Статус обязателен'})
  const allowed=['new','in_progress','won','lost']
  if(!allowed.includes(status))return res.status(400).json({error:'Недопустимый статус'})
  if(!pool){
    const lead=memoryLeads.find(x=>x.id===id&&x.studio_id===req.user.studio_id)
    if(!lead)return res.status(404).json({error:'Заявка не найдена'})
    lead.status=status
    return res.json({lead})
  }
  const q=await pool.query('update leads l set status=$1 from projects p where l.id::text=$2::text and p.id::text=l.project_id::text and p.studio_id::text=$3::text returning l.*',[status,id,req.user.studio_id])
  if(!q.rows[0])return res.status(404).json({error:'Заявка не найдена'})
  res.json({lead:q.rows[0]})
})

app.post('/api/leads/:id/convert', async (req,res) => {
  const id=String(req.params.id)
  if(!pool){
    const lead=memoryLeads.find(x=>x.id===id&&x.studio_id===req.user.studio_id)
    if(!lead)return res.status(404).json({error:'Заявка не найдена'})
    const existing=memoryClients.find(x=>x.studio_id===req.user.studio_id&&((lead.phone&&x.phone===lead.phone)||(lead.email&&x.email===lead.email)))
    if(existing)return res.json({client:existing,existing:true})
    if(!await requireClientCapacity(req.user.studio_id,res))return
    const client={id:crypto.randomUUID(),studio_id:req.user.studio_id,name:lead.name,email:lead.email||'',phone:lead.phone||'',created_at:new Date().toISOString(),source_lead_id:id}
    lead.status='won'
    memoryClients.unshift(client)
    return res.status(201).json({client,existing:false})
  }
  const leadQ=await pool.query('select l.*,p.studio_id from leads l left join projects p on p.id::text=l.project_id::text where l.id::text=$1::text and p.studio_id::text=$2::text limit 1',[id,req.user.studio_id])
  if(!leadQ.rows[0])return res.status(404).json({error:'Заявка не найдена'})
  const lead=leadQ.rows[0]
  const existingQ=await pool.query('select id,name,email,phone,created_at from clients where studio_id::text=$3::text and ((phone=$1 and $1 is not null) or (email=$2 and $2 is not null)) limit 1',[lead.phone,lead.email,lead.studio_id])
  if(existingQ.rows[0])return res.json({client:existingQ.rows[0],existing:true})
  if(!await requireClientCapacity(lead.studio_id,res))return
  const q=await pool.query('insert into clients(studio_id,name,email,phone) values($1,$2,$3,$4) returning id,name,email,phone,created_at',[lead.studio_id,lead.name,lead.email||null,lead.phone||null])
  await pool.query("update leads set status='won' where id::text=$1::text and project_id in (select id from projects where studio_id::text=$2::text)",[id,req.user.studio_id])
  res.status(201).json({client:q.rows[0],existing:false})
})

app.get('/api/clients/:id', async (req,res) => {
  const id=String(req.params.id)
  if(!pool){
    const client=memoryClients.find(x=>x.id===id&&x.studio_id===req.user.studio_id)
    if(!client)return res.status(404).json({error:'Клиент не найден'})
    const phone=client.phone||'',email=client.email||''
    return res.json({
      client,
      leads:memoryLeads.filter(x=>x.studio_id===req.user.studio_id&&((phone&&x.phone===phone)||(email&&x.email===email))),
      bookings:memoryBookings.filter(x=>x.studio_id===req.user.studio_id&&x.customer_phone===phone),
      payments:memoryPayments.filter(x=>x.studio_id===req.user.studio_id&&x.client_id===id),
      invoices:memoryInvoices.filter(x=>x.studio_id===req.user.studio_id&&x.client_id===id),
      orders:memoryOrders.filter(x=>x.studio_id===req.user.studio_id&&x.client_id===id)
    })
  }
  const cq=await pool.query('select id,name,email,phone,created_at from clients where id::text=$1::text and studio_id::text=$2::text limit 1',[id,req.user.studio_id])
  if(!cq.rows[0])return res.status(404).json({error:'Клиент не найден'})
  const [leads,bookings,payments,invoices,orders]=await Promise.all([
    pool.query('select l.id,l.project_id,l.name,l.message,l.status,l.created_at from leads l join projects pr on pr.id::text=l.project_id::text where pr.studio_id::text=$3::text and (l.phone=$1 or l.email=$2) order by l.created_at desc',[cq.rows[0].phone,cq.rows[0].email,req.user.studio_id]),
    pool.query('select b.id,b.project_id,b.customer_name,b.customer_phone,b.starts_at,b.ends_at,b.status,b.service_name,pr.name as project_name from bookings b join projects pr on pr.id=b.project_id where pr.studio_id::text=$3::text and (b.client_id::text=$1::text or b.customer_phone=$2) order by b.starts_at desc',[id,cq.rows[0].phone,req.user.studio_id]),
    pool.query('select p.id,p.project_id,p.amount,p.currency,p.status,p.description,p.order_id,p.created_at from payments p join projects pr on pr.id=p.project_id where pr.studio_id::text=$2::text and p.client_id::text=$1::text order by p.created_at desc',[id,req.user.studio_id]),
    pool.query('select i.id,i.project_id,i.number,i.amount,i.currency,i.status,i.due_date,i.description,i.created_at from invoices i join projects pr on pr.id::text=i.project_id::text where pr.studio_id::text=$2::text and i.client_id::text=$1::text order by i.created_at desc',[id,req.user.studio_id]),
    pool.query('select o.id,o.project_id,o.client_id,o.number,o.status,o.total,o.currency,o.items,o.created_at,pr.name as project_name from orders o left join projects pr on pr.id::text=o.project_id::text where o.client_id::text=$1::text and pr.studio_id::text=$2::text order by o.created_at desc',[id,req.user.studio_id])
  ])
  res.json({client:cq.rows[0],leads:leads.rows,bookings:bookings.rows,payments:payments.rows,invoices:invoices.rows,orders:orders.rows})
})
app.patch('/api/clients/:id', async (req,res) => {
  const id=String(req.params.id)
  const name=String(req.body?.name||'').trim()
  const email=String(req.body?.email||'').trim() || null
  const phone=String(req.body?.phone||'').trim() || null
  if(!name)return res.status(400).json({error:'Имя клиента обязательно'})
  if(name.length>120)return res.status(400).json({error:'Имя клиента слишком длинное'})
  if(email&&email.length>160)return res.status(400).json({error:'Email слишком длинный'})
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Некорректный email'})
  if(phone&&phone.length>40)return res.status(400).json({error:'Телефон слишком длинный'})
  if(!pool){
    const client=memoryClients.find(x=>x.id===id&&x.studio_id===req.user.studio_id)
    if(!client)return res.status(404).json({error:'Клиент не найден'})
    const duplicate=memoryClients.find(x=>x.id!==id&&x.studio_id===req.user.studio_id&&((phone&&x.phone===phone)||(email&&x.email===email)))
    if(duplicate)return res.status(409).json({error:'Клиент с таким телефоном или email уже существует'})
    client.name=name;client.email=email;client.phone=phone
    return res.json({client})
  }
  const duplicate=await pool.query('select id from clients where studio_id::text=$4::text and id<>$1 and ((phone is not null and phone=$2) or (email is not null and email=$3)) limit 1',[id,phone,email,req.user.studio_id])
  if(duplicate.rows[0])return res.status(409).json({error:'Клиент с таким телефоном или email уже существует'})
  const q=await pool.query('update clients set name=$1,email=$2,phone=$3 where id::text=$4::text and studio_id::text=$5::text returning id,name,email,phone,created_at',[name,email,phone,id,req.user.studio_id])
  if(!q.rows[0])return res.status(404).json({error:'Клиент не найден'})
  res.json({client:q.rows[0]})
})

app.post('/api/clients', async (req,res) => {
  const name=String(req.body?.name||'').trim()
  const email=String(req.body?.email||'').trim()
  const phone=String(req.body?.phone||'').trim()
  if(!name)return res.status(400).json({error:'Имя клиента обязательно'})
  if(name.length>120)return res.status(400).json({error:'Имя клиента слишком длинное'})
  if(email.length>160 || (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)))return res.status(400).json({error:'Некорректный email клиента'})
  if(phone.length>40)return res.status(400).json({error:'Телефон клиента слишком длинный'})
  if(!pool){
    return withMemoryWorkspaceLock('client-create:'+req.user.studio_id,async()=>{
      if(!(await requireClientCapacity(req.user.studio_id,res)))return
      const duplicate=memoryClients.find(x=>x.studio_id===req.user.studio_id && ((phone&&x.phone===phone)||(email&&x.email===email)))
      if(duplicate)return res.status(409).json({error:'Клиент с таким телефоном или email уже существует'})
      const client={id:crypto.randomUUID(),studio_id:req.user.studio_id,name,email:email||null,phone:phone||null,created_at:new Date().toISOString()}
      memoryClients.unshift(client)
      return res.status(201).json({client})
    })
  }
  const client=await pool.connect()
  try{
    await client.query('begin')
    await client.query('select pg_advisory_xact_lock(hashtext($1))',[String('client-create:'+req.user.studio_id)])
    const capacity=await client.query('select count(*)::int as count from clients where studio_id::text=$1::text',[req.user.studio_id])
    const limit=Number(req.studio.client_limit||planConfig(req.studio.plan).clientLimit)
    if(capacity.rows[0].count>=limit){await client.query('rollback');return res.status(409).json({error:'Достигнут лимит клиентов вашего тарифа',code:'PLAN_LIMIT',limit,plan:planConfig(req.studio.plan).name})}
    const duplicate=await client.query("select id from clients where studio_id::text=$1::text and (($2 <> '' and phone=$2) or ($3 <> '' and lower(email)=lower($3))) limit 1",[req.user.studio_id,phone,email])
    if(duplicate.rows[0]){await client.query('rollback');return res.status(409).json({error:'Клиент с таким телефоном или email уже существует'})}
    const q=await client.query('insert into clients(studio_id,name,email,phone) values($1,$2,$3,$4) returning id,studio_id,name,email,phone,created_at',[req.user.studio_id,name,email||null,phone||null])
    await client.query('commit')
    res.status(201).json({client:q.rows[0]})
  }catch(error){
    try{await client.query('rollback')}catch{}
    if(error?.code==='23505')return res.status(409).json({error:'Клиент с таким телефоном или email уже существует'})
    throw error
  }finally{client.release()}
})
app.get('/api/clients', async (req, res) => {
  if (!pool) {
    const rows=memoryClients.filter(x=>x.studio_id===req.user.studio_id).map(client=>{
      const phone=client.phone||'',email=client.email||''
      const leads=memoryLeads.filter(x=>x.studio_id===client.studio_id&&((phone&&x.phone===phone)||(email&&x.email===email)))
      const bookings=memoryBookings.filter(x=>x.studio_id===client.studio_id&&(x.client_id===client.id||(phone&&x.customer_phone===phone)))
      const orders=memoryOrders.filter(x=>x.studio_id===client.studio_id&&x.client_id===client.id)
      const projects=new Set([...orders.map(x=>x.project_id),...bookings.map(x=>x.project_id)].filter(Boolean))
      const dates=[...leads,...bookings,...orders].map(x=>new Date(x.created_at||x.starts_at||0).getTime()).filter(Boolean)
      return {...client,project_count:projects.size,contact_count:leads.length+bookings.length+orders.length,last_activity:dates.length?new Date(Math.max(...dates)).toISOString():client.created_at}
    })
    return res.json({clients:rows})
  }
  const sql="select c.id,c.name,c.email,c.phone,c.created_at,"+
    "(select count(distinct x.project_id)::int from (select l.project_id from leads l join projects lp on lp.id=l.project_id where lp.studio_id=c.studio_id and (l.phone=c.phone or l.email=c.email) union all select b.project_id from bookings b join projects bp on bp.id=b.project_id where bp.studio_id=c.studio_id and (b.client_id::text=c.id::text or b.customer_phone=c.phone) union all select o.project_id from orders o join projects op on op.id=o.project_id where op.studio_id=c.studio_id and o.client_id::text=c.id::text) x) as project_count,"+
    "((select count(*) from leads l join projects lp on lp.id=l.project_id where lp.studio_id=c.studio_id and (l.phone=c.phone or l.email=c.email))+(select count(*) from bookings b join projects bp on bp.id=b.project_id where bp.studio_id=c.studio_id and (b.client_id::text=c.id::text or b.customer_phone=c.phone))+(select count(*) from orders o join projects op on op.id=o.project_id where op.studio_id=c.studio_id and o.client_id::text=c.id::text))::int as contact_count,"+
    "greatest(c.created_at,(select max(o.created_at) from orders o join projects op on op.id=o.project_id where op.studio_id=c.studio_id and o.client_id::text=c.id::text),(select max(p.created_at) from payments p join orders po on po.id=p.order_id join projects pp on pp.id=po.project_id where pp.studio_id=c.studio_id and p.client_id::text=c.id::text),(select max(b.starts_at) from bookings b join projects bp on bp.id=b.project_id where bp.studio_id=c.studio_id and (b.client_id::text=c.id::text or b.customer_phone=c.phone))) as last_activity "+
    "from clients c where c.studio_id::text=$1::text order by last_activity desc nulls last limit 500"
  const { rows } = await pool.query(sql,[req.user.studio_id])
  res.json({ clients: rows })
})

app.get('/api/projects/:id/analytics', async (req,res) => {
  const id=req.params.id
  if(!pool){
    const project=memoryProjects.find(p=>(p.id===id||p.slug===id)&&p.studio_id===req.user.studio_id)
    if(!project)return res.status(404).json({error:'Проект не найден'})
    const slug=project.slug
    const events=memoryEvents.filter(e=>e.slug===slug&&e.studio_id===req.user.studio_id)
    const leads=memoryLeads.filter(l=>l.project_slug===slug&&l.studio_id===req.user.studio_id)
    const bookings=memoryBookings.filter(b=>b.project_slug===slug&&b.studio_id===req.user.studio_id)
    return res.json({metrics:{visits:events.filter(e=>e.event_type==='page_view').length,leads:leads.length,bookings:bookings.length,revenue:memoryPayments.filter(p=>p.project_id===project.id&&p.status==='paid').reduce((a,p)=>a+Number(p.amount||0),0)}})
  }
  const project=await pool.query('select id from projects where (id::text=$1::text or slug=$1::text) and studio_id::text=$2::text limit 1',[id,req.user.studio_id])
  if(!project.rows[0])return res.status(404).json({error:'Проект не найден'})
  const q=await pool.query(`select
    count(*) filter (where event_type='page_view')::int as visits,
    count(*) filter (where event_type='lead')::int as leads,
    count(*) filter (where event_type='booking')::int as bookings,
    coalesce(sum(value) filter (where event_type='payment'),0)::numeric as revenue
    from analytics_events where project_id::text=$1::text and created_at >= now() - interval '30 days'`,[project.rows[0].id])
  const series=await pool.query(`select to_char(date_trunc('day',created_at),'YYYY-MM-DD') as day,
    count(*) filter (where event_type='page_view')::int as visits,
    count(*) filter (where event_type='lead')::int as leads,
    count(*) filter (where event_type='booking')::int as bookings,
    coalesce(sum(value) filter (where event_type='payment'),0)::numeric as revenue
    from analytics_events where project_id::text=$1::text and created_at >= now() - interval '30 days'
    group by 1 order by 1`,[project.rows[0].id])
  res.json({metrics:q.rows[0],series:series.rows})
})


app.get('/api/orders', async (req,res) => {
  if (!pool) return res.json({orders: memoryOrders.filter(x=>x.studio_id===req.user.studio_id)})
  const {rows}=await pool.query('select o.id,o.project_id,o.client_id,o.number,o.status,o.total,o.currency,o.items,o.created_at,pr.name as project_name,c.name as client_name from orders o left join projects pr on pr.id::text=o.project_id::text left join clients c on c.id=o.client_id where pr.studio_id::text=$1::text order by o.created_at desc limit 200',[req.user.studio_id])
  res.json({orders:rows})
})
app.get('/api/orders/:id', async (req,res) => {
  const id=String(req.params.id)
  if(!pool){
    const order=memoryOrders.find(x=>x.id===id&&x.studio_id===req.user.studio_id)
    if(!order)return res.status(404).json({error:'Заказ не найден'})
    const client=order.client_id?memoryClients.find(x=>x.id===order.client_id):null
    const payments=memoryPayments.filter(x=>x.order_id===id)
    const invoice=memoryInvoices.find(x=>x.order_id===id)||memoryInvoices.find(x=>x.description===('Счёт по заказу '+order.number))
    const timeline=[{type:'order',text:'Заказ создан',date:order.created_at},...payments.map(p=>({type:'payment',text:'Платёж · '+Number(p.amount||0)+' '+(p.currency||order.currency||'RUB'),date:p.created_at}))]
    return res.json({order,client,payments,invoice,timeline})
  }
  const oq=await pool.query('select o.id,o.project_id,o.client_id,o.number,o.status,o.total,o.currency,o.items,o.created_at,pr.name as project_name,c.name as client_name,c.phone,c.email from orders o left join projects pr on pr.id::text=o.project_id::text left join clients c on c.id=o.client_id where o.id::text=$1::text and pr.studio_id::text=$2::text limit 1',[id,req.user.studio_id])
  if(!oq.rows[0])return res.status(404).json({error:'Заказ не найден'})
  const [payments,invoices]=await Promise.all([
    pool.query('select id,amount,currency,status,description,created_at from payments where order_id::text=$1::text order by created_at desc',[id]),
    pool.query('select id,number,amount,currency,status,due_date,description,created_at from invoices where order_id::text=$1::text or description=$2 order by created_at desc limit 1',[id,'Счёт по заказу '+oq.rows[0].number])
  ])
  const timeline=[{type:'order',text:'Заказ создан',date:oq.rows[0].created_at},...(invoices.rows[0]?[{type:'invoice',text:'Счёт '+invoices.rows[0].number+' выставлен',date:invoices.rows[0].created_at}]:[]),...payments.rows.map(p=>({type:'payment',text:'Платёж · '+p.amount+' '+p.currency,date:p.created_at}))].sort((a,b)=>new Date(b.date)-new Date(a.date))
  res.json({order:oq.rows[0],client:oq.rows[0].client_id?{id:oq.rows[0].client_id,name:oq.rows[0].client_name,phone:oq.rows[0].phone,email:oq.rows[0].email}:null,payments:payments.rows,invoice:invoices.rows[0]||null,timeline})
})

app.post('/api/orders', async (req,res) => {
  const projectId=String(req.body?.project_id||'').trim()
  const items=Array.isArray(req.body?.items)?req.body.items:[]
  const currency=String(req.body?.currency||'RUB').trim().toUpperCase()
  const clientId=req.body?.client_id||null
  if(!projectId || !items.length) return res.status(400).json({error:'Проект и товары обязательны'})
  const owned=await ownedProject(req,projectId)
  if(!owned)return res.status(404).json({error:'Проект не найден'})
  if(clientId && !(await ownedClient(req,clientId)))return res.status(404).json({error:'Клиент не найден'})
  let total=0
  const normalized=[]
  for(const item of items){
    const catalogId=String(item.catalog_id||item.id||'').trim()
    const rawQuantity=item?.quantity ?? 1
    const quantity=Number(rawQuantity)
    if(!Number.isInteger(quantity) || quantity<1 || quantity>100) return res.status(400).json({error:'Количество товара должно быть целым числом от 1 до 100'})
    let source=null
    if(pool){const q=await pool.query('select id,name,price,currency from catalog_items where id::text=$1::text and project_id::text=$2::text limit 1',[catalogId,projectId]);source=q.rows[0]}
    else source=(memoryCatalog.get(projectId)||[]).find(x=>x.id===catalogId)
    if(!source) return res.status(400).json({error:'Товар не найден: '+catalogId})
    const price=Number(source.price||0)
    const sourceCurrency=String(source.currency||'RUB').trim().toUpperCase()
    if(sourceCurrency!=='RUB' || currency!=='RUB') return res.status(400).json({error:'Заказы доступны только в RUB'})
    if(!Number.isFinite(price) || price<0 || price>100000000) return res.status(400).json({error:'У товара некорректная цена'})
    total+=price*quantity
    normalized.push({catalog_id:source.id,name:source.name,price,quantity})
  }
  const number='ORD-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+crypto.randomUUID().slice(0,6).toUpperCase()
  // New orders always start pending. Paid is derived from a confirmed payment.
  const status='pending'
  if(!Number.isFinite(total)||total<=0||total>100000000) return res.status(400).json({error:'Некорректная сумма заказа'})
  if(!pool){const order={id:crypto.randomUUID(),studio_id:req.user.studio_id,project_id:projectId,client_id:clientId,number,status,total,currency,items:normalized,created_at:new Date().toISOString()};memoryOrders.unshift(order);return res.status(201).json({order})}
  const q=await pool.query('insert into orders(project_id,client_id,number,status,total,currency,items) values($1,$2,$3,$4,$5,$6,$7) returning *',[projectId,clientId,number,status,total,currency,JSON.stringify(normalized)])
  res.status(201).json({order:q.rows[0]})
})
app.patch('/api/orders/:id', async (req,res) => {
  const status=String(req.body?.status||'').trim()
  if(!['pending','paid','cancelled','refunded'].includes(status)) return res.status(400).json({error:'Недопустимый статус заказа'})
  if(!pool){const x=memoryOrders.find(v=>v.id===req.params.id&&v.studio_id===req.user.studio_id);if(!x)return res.status(404).json({error:'Заказ не найден'});if(status==='paid'){const paid=memoryPayments.some(p=>p.studio_id===req.user.studio_id&&p.order_id===x.id&&p.status==='paid');if(!paid)return res.status(409).json({error:'Нельзя пометить заказ оплаченным без подтверждённого платежа'})}x.status=status;return res.json({order:x})}
  const q=await pool.query('update orders o set status=$1 from projects p where o.id::text=$2::text and o.project_id::text=p.id::text and p.studio_id::text=$3::text returning o.*',[status,req.params.id,req.user.studio_id])
  if(!q.rows[0])return res.status(404).json({error:'Заказ не найден'})
  res.json({order:q.rows[0]})
})
app.post('/api/orders/:id/invoice', async (req,res) => {
  const id=req.params.id
  let order
  if(!pool) order=memoryOrders.find(x=>x.id===id&&x.studio_id===req.user.studio_id)
  else { const q=await pool.query('select o.* from orders o join projects p on p.id::text=o.project_id::text where o.id::text=$1::text and p.studio_id::text=$2::text limit 1',[id,req.user.studio_id]); order=q.rows[0] }
  if(!order) return res.status(404).json({error:'Заказ не найден'})
  if(Number(order.total||0)<=0) return res.status(400).json({error:'У заказа некорректная сумма'})
  const number='INV-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+crypto.randomUUID().slice(0,6).toUpperCase()
  const description='Счёт по заказу '+order.number
  if(!pool){
    if(memoryInvoices.some(x=>(x.order_id===id)||(x.description===description&&x.project_id===order.project_id&&x.client_id===(order.client_id||null)))) return res.status(409).json({error:'Счёт для этого заказа уже создан'})
    const invoice={id:crypto.randomUUID(),studio_id:req.user.studio_id,project_id:order.project_id,client_id:order.client_id||null,order_id:id,number,amount:Number(order.total),currency:order.currency||'RUB',status:'sent',due_date:null,description,created_at:new Date().toISOString()}; memoryInvoices.unshift(invoice); return res.status(201).json({invoice}) }
  const existing=await pool.query('select id,number,amount,currency,status,due_date,description,created_at from invoices where order_id::text=$1::text or (project_id::text=$2::text and ((client_id is null and $3::text is null) or client_id::text=$3::text) and description=$4) order by created_at desc limit 1',[id,order.project_id,order.client_id||null,description])
  if(existing.rows[0]) return res.status(409).json({error:'Счёт для этого заказа уже создан',invoice:existing.rows[0]})
  const q=await pool.query('insert into invoices(project_id,client_id,order_id,number,amount,currency,status,description) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[order.project_id,order.client_id||null,id,number,order.total,order.currency||'RUB','sent',description])
  res.status(201).json({invoice:q.rows[0]})
})


app.get('/api/invoices', async (req,res) => {
  if (!pool) return res.json({invoices:memoryInvoices.filter(x=>x.studio_id===req.user.studio_id)})
  const {rows}=await pool.query('select i.id,i.project_id,i.client_id,i.number,i.amount,i.currency,i.status,i.due_date,i.description,i.created_at,p.name as project_name,c.name as client_name from invoices i left join projects p on p.id::text=i.project_id::text left join clients c on c.id=i.client_id where p.studio_id::text=$1::text order by i.created_at desc limit 200',[req.user.studio_id])
  res.json({invoices:rows})
})
app.post('/api/invoices', async (req,res) => {
  const projectId=String(req.body?.project_id||'').trim()
  if(!projectId)return res.status(400).json({error:'Проект обязателен'})
  const owned=await ownedProject(req,projectId)
  if(!owned)return res.status(404).json({error:'Проект не найден'})
  if(req.body?.client_id && !(await ownedClient(req,req.body.client_id)))return res.status(404).json({error:'Клиент не найден'})
  const number=String(req.body?.number||('INV-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+crypto.randomUUID().slice(0,6).toUpperCase())).trim()
  const amount=Number(req.body?.amount||0),currency='RUB',status=String(req.body?.status||'sent')
  if(number.length>80)return res.status(400).json({error:'Номер счёта слишком длинный'})
  if(!Number.isFinite(amount)||amount<=0||amount>100000000)return res.status(400).json({error:'Некорректная сумма счёта'})
  if(!['draft','sent','paid','overdue','cancelled'].includes(status))return res.status(400).json({error:'Недопустимый статус счёта'})
  const description=String(req.body?.description||'').trim()
  if(description.length>500)return res.status(400).json({error:'Описание счёта слишком длинное'})
  if(!pool){const x={id:crypto.randomUUID(),studio_id:req.user.studio_id,project_id:projectId,client_id:req.body?.client_id||null,number,amount,currency,status,due_date:req.body?.due_date||null,description,created_at:new Date().toISOString()};memoryInvoices.unshift(x);return res.status(201).json({invoice:x})}
  const q=await pool.query('insert into invoices(project_id,client_id,number,amount,currency,status,due_date,description) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[projectId,req.body?.client_id||null,number,amount,currency,status,req.body?.due_date||null,description])
  res.status(201).json({invoice:q.rows[0]})
})
app.patch('/api/invoices/:id', async (req,res) => {
  const status=String(req.body?.status||'').trim()
  if(!['draft','sent','paid','overdue','cancelled'].includes(status))return res.status(400).json({error:'Недопустимый статус счёта'})
  if(!pool){const x=memoryInvoices.find(v=>v.id===req.params.id&&v.studio_id===req.user.studio_id);if(!x)return res.status(404).json({error:'Счёт не найден'});x.status=status;return res.json({invoice:x})}
  const q=await pool.query('update invoices i set status=$1 from projects p where i.id::text=$2 and i.project_id::text=p.id::text and p.studio_id::text=$3::text returning i.*',[status,req.params.id,req.user.studio_id])
  if(!q.rows[0])return res.status(404).json({error:'Счёт не найден'})
  res.json({invoice:q.rows[0]})
})

app.get('/api/payments', async (req,res) => {
  if (!pool) return res.json({payments:memoryPayments.filter(x=>x.studio_id===req.user.studio_id)})
  const {rows}=await pool.query('select p.id,p.project_id,p.client_id,p.booking_id,p.order_id,p.amount,p.currency,p.status,p.description,p.created_at,pr.name as project_name from payments p left join projects pr on pr.id::text=p.project_id::text where pr.studio_id::text=$1::text order by p.created_at desc limit 200',[req.user.studio_id])
  res.json({payments:rows})
})
app.post('/api/payments', async (req,res) => {
  const projectId=String(req.body?.project_id||'').trim()
  const amount=Number(req.body?.amount)
  const currency=String(req.body?.currency||'RUB').trim().toUpperCase()
  const description=String(req.body?.description||'').trim()
  const status=String(req.body?.status||'paid').trim()
  const orderId=req.body?.order_id||null
  if(!projectId || !Number.isFinite(amount) || amount<=0 || amount>100000000) return res.status(400).json({error:'Проект и сумма обязательны'})
  if(currency!=='RUB') return res.status(400).json({error:'Платежи доступны только в RUB'})
  if(description.length>500) return res.status(400).json({error:'Описание платежа слишком длинное'})
  const owned=await ownedProject(req,projectId)
  if(!owned)return res.status(404).json({error:'Проект не найден'})
  if(req.body?.client_id && !(await ownedClient(req,req.body.client_id)))return res.status(404).json({error:'Клиент не найден'})
  const bookingId=req.body?.booking_id?String(req.body.booking_id).trim():null
  if(bookingId){
    if(!pool){
      const booking=memoryBookings.find(x=>x.id===bookingId&&x.studio_id===req.user.studio_id&&x.project_id===projectId)
      if(!booking)return res.status(404).json({error:'Бронирование не найдено'})
    }else{
      const booking=(await pool.query('select b.id from bookings b join projects p on p.id=b.project_id where b.id::text=$1::text and b.project_id::text=$2::text and p.studio_id::text=$3::text limit 1',[bookingId,projectId,req.user.studio_id])).rows[0]
      if(!booking)return res.status(404).json({error:'Бронирование не найдено'})
    }
  }
  if(!['pending','paid','refunded','failed'].includes(status)) return res.status(400).json({error:'Недопустимый статус платежа'})
  if(!pool){
    if(orderId){
      const order=memoryOrders.find(x=>x.id===orderId&&x.studio_id===req.user.studio_id)
      if(!order)return res.status(404).json({error:'Заказ не найден'})
      if(order.project_id!==projectId)return res.status(400).json({error:'Заказ относится к другому проекту'})
      if(req.body?.client_id && order.client_id && String(req.body.client_id)!==String(order.client_id))return res.status(400).json({error:'Клиент платежа не совпадает с клиентом заказа'})
      if(order.client_id && !req.body?.client_id){} else if(!order.client_id && req.body?.client_id)return res.status(400).json({error:'У заказа не указан клиент'})
      if(Math.abs(Number(order.total||0)-amount)>0.01)return res.status(400).json({error:'Сумма платежа не совпадает с заказом'})
      if(status==='paid' && memoryPayments.some(x=>x.order_id===orderId&&x.status==='paid'))return res.status(409).json({error:'Заказ уже оплачен'})
    }
    const payment={id:crypto.randomUUID(),studio_id:req.user.studio_id,project_id:projectId,client_id:req.body?.client_id||null,booking_id:bookingId,order_id:orderId,amount,currency,status,description,created_at:new Date().toISOString()}
    memoryPayments.unshift(payment)
    if(orderId && status==='paid'){
      const order=memoryOrders.find(x=>x.id===orderId)
      if(order) order.status='paid'
      memoryEvents.push({studio_id:req.user.studio_id,slug:memoryProjects.find(x=>x.id===projectId)?.slug,event_type:'payment',path:'/payment',value:amount,created_at:new Date().toISOString()})
    }
    return res.status(201).json({payment})
  }
  if(orderId){
    const oq=await pool.query('select o.id,o.project_id,o.total,o.status from orders o join projects p on p.id=o.project_id where o.id::text=$1 and p.studio_id::text=$2::text limit 1',[orderId,req.user.studio_id])
    if(!oq.rows[0])return res.status(404).json({error:'Заказ не найден'})
    if(oq.rows[0].project_id!==projectId)return res.status(400).json({error:'Заказ относится к другому проекту'})
    if(Math.abs(Number(oq.rows[0].total||0)-amount)>0.01)return res.status(400).json({error:'Сумма платежа не совпадает с заказом'})
    if(status==='paid' && oq.rows[0].status==='paid')return res.status(409).json({error:'Заказ уже оплачен'})
    const dup=await pool.query("select id from payments where order_id::text=$1::text and status='paid' limit 1",[orderId])
    if(status==='paid' && dup.rows[0])return res.status(409).json({error:'Заказ уже оплачен'})
  }
  const q=await pool.query('insert into payments(project_id,client_id,booking_id,order_id,amount,currency,status,description) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[projectId,req.body?.client_id||null,bookingId,orderId,amount,currency,status,description||null])
  if(orderId && status==='paid'){
    await pool.query("update orders set status='paid' where id::text=$1 and project_id in (select id from projects where studio_id::text=$2::text)",[orderId,req.user.studio_id])
    await pool.query('insert into analytics_events(project_id,event_type,path,value,metadata) values($1,$2,$3,$4,$5)',[projectId,'payment','/payment',amount,JSON.stringify({order_id:orderId,payment_id:q.rows[0].id})])
  }
  res.status(201).json({payment:q.rows[0]})
})
app.patch('/api/payments/:id', async (req,res) => {
  const status=String(req.body?.status||'').trim()
  if(!['pending','paid','refunded','failed'].includes(status)) return res.status(400).json({error:'Недопустимый статус платежа'})
  if(!pool){
    const p=memoryPayments.find(x=>x.id===req.params.id&&x.studio_id===req.user.studio_id)
    if(!p)return res.status(404).json({error:'Платёж не найден'})
    const previous=p.status
    if(status==='paid'){
      const duplicate=memoryPayments.find(x=>x.id!==p.id&&x.order_id&&x.order_id===p.order_id&&x.status==='paid'&&x.studio_id===req.user.studio_id)
      if(duplicate)return res.status(409).json({error:'Для заказа уже есть оплаченный платёж'})
      if(p.order_id){
        const o=memoryOrders.find(x=>x.id===p.order_id&&x.studio_id===req.user.studio_id)
        if(!o)return res.status(404).json({error:'Заказ не найден'})
        if(Number(p.amount)!==Number(o.total))return res.status(409).json({error:'Сумма платежа не совпадает с суммой заказа'})
        o.status='paid'
      }
    } else if(status==='refunded' && p.order_id){
      const o=memoryOrders.find(x=>x.id===p.order_id&&x.studio_id===req.user.studio_id)
      if(o)o.status='refunded'
    }
    p.status=status
    if(p.project_id && previous!==status && status==='paid'){
      const project=memoryProjects.find(x=>x.id===p.project_id&&x.studio_id===req.user.studio_id)
      if(project)memoryEvents.push({studio_id:req.user.studio_id,slug:project.slug,event_type:'payment',path:'/payment',value:Number(p.amount||0),created_at:new Date().toISOString()})
    }
    if(p.project_id && previous!==status && status==='refunded'){
      const project=memoryProjects.find(x=>x.id===p.project_id&&x.studio_id===req.user.studio_id)
      if(project)memoryEvents.push({studio_id:req.user.studio_id,slug:project.slug,event_type:'payment',path:'/refund',value:-Number(p.amount||0),created_at:new Date().toISOString()})
    }
    return res.json({payment:p})
  }
  const current=(await pool.query("select p.* from payments p join projects pr on pr.id=p.project_id where p.id::text=$1 and pr.studio_id::text=$2::text limit 1",[req.params.id,req.user.studio_id])).rows[0]
  if(!current)return res.status(404).json({error:'Платёж не найден'})
  const previous=current.status
  if(status==='paid'){
    if(current.order_id){
      const order=(await pool.query("select id,total from orders where id=$1 and project_id in (select id from projects where studio_id::text=$2::text) limit 1",[current.order_id,req.user.studio_id])).rows[0]
      if(!order)return res.status(404).json({error:'Заказ не найден'})
      if(current.client_id && order.client_id && String(current.client_id)!==String(order.client_id))return res.status(409).json({error:'Клиент платежа не совпадает с клиентом заказа'})
      if(order.client_id && !current.client_id)return res.status(409).json({error:'У платежа не указан клиент заказа'})
      if(Number(current.amount)!==Number(order.total))return res.status(409).json({error:'Сумма платежа не совпадает с суммой заказа'})
      const duplicate=(await pool.query("select id from payments where order_id=$1 and status='paid' and id<>$2 limit 1",[current.order_id,current.id])).rows[0]
      if(duplicate)return res.status(409).json({error:'Для заказа уже есть оплаченный платёж'})
    }
  }
  const q=await pool.query("update payments p set status=$1 from projects pr where p.id::text=$2 and p.project_id::text=pr.id::text and pr.studio_id::text=$3::text returning p.*",[status,req.params.id,req.user.studio_id])
  if(!q.rows[0])return res.status(404).json({error:'Платёж не найден'})
  if(q.rows[0].order_id) await pool.query("update orders set status=$1 where id=$2 and project_id in (select id from projects where studio_id::text=$3::text)",[status==='paid'?'paid':status==='refunded'?'refunded':'pending',q.rows[0].order_id,req.user.studio_id])
  if(previous!==status && status==='paid'){
    await pool.query('insert into analytics_events(project_id,event_type,path,value,metadata) values($1,$2,$3,$4,$5)',[q.rows[0].project_id,'payment','/payment',Number(q.rows[0].amount||0),JSON.stringify({payment_id:q.rows[0].id})])
  } else if(previous!==status && status==='refunded'){
    await pool.query('insert into analytics_events(project_id,event_type,path,value,metadata) values($1,$2,$3,$4,$5)',[q.rows[0].project_id,'payment','/refund',-Number(q.rows[0].amount||0),JSON.stringify({payment_id:q.rows[0].id})])
  }
  res.json({payment:q.rows[0]})
})

app.get('/api/analytics/overview', async (req, res) => {
  if (!pool) {
    const since=new Date(Date.now()-30*86400000)
    const base=memoryEvents.filter(e=>e.studio_id===req.user.studio_id && e.created_at && new Date(e.created_at)>=since)
    const paidOrders=memoryOrders.filter(o=>o.studio_id===req.user.studio_id && o.status==='paid' && new Date(o.created_at)>=since)
    const allOrders=memoryOrders.filter(o=>o.studio_id===req.user.studio_id && new Date(o.created_at)>=since)
    const revenue=memoryPayments.filter(p=>p.studio_id===req.user.studio_id && p.status==='paid' && new Date(p.created_at)>=since).reduce((sum,p)=>sum+Number(p.amount||0),0)
    const series=Array.from({length:14},(_,idx)=>{const d=new Date(Date.now()-(13-idx)*86400000);const key=d.toISOString().slice(0,10);const day=base.filter(e=>String(e.created_at).slice(0,10)===key);return {day:key,visits:day.filter(e=>e.event_type==='page_view').length,leads:day.filter(e=>e.event_type==='lead').length,bookings:day.filter(e=>e.event_type==='booking').length,revenue:day.filter(e=>e.event_type==='payment').reduce((s,e)=>s+Number(e.value||0),0)}})
    return res.json({metrics:{visits:base.filter(e=>e.event_type==='page_view').length,leads:memoryLeads.filter(x=>x.studio_id===req.user.studio_id).length,bookings:memoryBookings.filter(x=>x.studio_id===req.user.studio_id).length,revenue,orders:allOrders.length,paidOrders:paidOrders.length,averageOrder:allOrders.length?allOrders.reduce((s,o)=>s+Number(o.total||0),0)/allOrders.length:0,paymentConversion:allOrders.length?paidOrders.length/allOrders.length*100:0,series}})
  }
  const q=await pool.query(`select
    count(*) filter (where event_type='page_view')::int as visits,
    count(*) filter (where event_type='lead')::int as leads,
    count(*) filter (where event_type='booking')::int as bookings,
    coalesce(sum(value) filter (where event_type='payment'),0)::numeric as revenue
    from analytics_events ae join projects pr on pr.id::text=ae.project_id::text where pr.studio_id::text=$1::text and ae.created_at >= now() - interval '30 days'`,[req.user.studio_id])
  const oq=await pool.query(`select count(*)::int as orders,count(*) filter (where o.status='paid')::int as paid_orders,coalesce(avg(o.total),0)::numeric as average_order from orders o join projects pr on pr.id::text=o.project_id::text where pr.studio_id::text=$1::text and o.created_at >= now() - interval '30 days'`,[req.user.studio_id])
  const s=await pool.query(`select to_char(date_trunc('day',ae.created_at),'YYYY-MM-DD') as day,count(*) filter (where ae.event_type='page_view')::int as visits,count(*) filter (where ae.event_type='lead')::int as leads,count(*) filter (where ae.event_type='booking')::int as bookings,coalesce(sum(ae.value) filter (where ae.event_type='payment'),0)::numeric as revenue from analytics_events ae join projects pr on pr.id::text=ae.project_id::text where pr.studio_id::text=$1::text and ae.created_at >= now() - interval '30 days' group by 1 order by 1`,[req.user.studio_id])
  const metrics={...q.rows[0],orders:oq.rows[0].orders,paidOrders:oq.rows[0].paid_orders,averageOrder:oq.rows[0].average_order,paymentConversion:oq.rows[0].orders?Number(oq.rows[0].paid_orders)/Number(oq.rows[0].orders)*100:0,series:s.rows}
  res.json({metrics})
})


// Unknown API methods must return JSON, never the frontend HTML shell.
app.use('/api',(req,res)=>res.status(404).json({error:'API route not found',path:req.originalUrl,method:req.method}))

app.use(async (req,res,next)=>{
  if(req.method==='GET' && !req.path.startsWith('/api') && req.path!=='/health') {
    try {
      const host=String(req.headers.host||'').split(':')[0].toLowerCase()
      const appHost=new URL(billingAppUrl()).hostname.toLowerCase()
      if(host && host!==appHost && !['localhost','127.0.0.1'].includes(host) && !req.path.startsWith('/published/') && !req.path.startsWith('/miniapp/')) {
        let project=null
        if(pool) project=(await pool.query("select slug from projects where lower(domain)=lower($1) and status='published' limit 1",[host])).rows[0]
        else project=memoryProjects.find(p=>p.status==='published'&&String(p.domain||'').toLowerCase()===host)
        if(project) return res.redirect(302,'/published/'+encodeURIComponent(project.slug))
      }
    } catch(error) {
      console.error('Custom domain routing error:',error.message)
    }
    return res.sendFile(path.join(distDir,'index.html'), { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } })
  }
  next()
})

app.use((err,req,res,next)=>{
  console.error('Nexora request error', {method:req.method,path:req.path,error:err?.message||String(err)})
  if(res.headersSent) return next(err)
  res.status(Number(err?.status)||500).json({error:'Внутренняя ошибка сервера',detail:process.env.NODE_ENV==='production'?undefined:(err?.message||String(err))})
})

async function bootstrapOwnerAccount(){
  const email=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase()
  const password=String(process.env.ADMIN_PASSWORD||'')
  const name=String(process.env.ADMIN_NAME||'Владелец Nexora').trim()
  if(!pool||!email||password.length<12) return
  const client=await pool.connect()
  try{
    await client.query('begin')
    const existing=(await client.query('select id,studio_id,role from users where lower(email)=lower($1) limit 1',[email])).rows[0]
    if(existing){
      await client.query("update users set name=$1,role='superadmin',password_hash=$2 where id=$3",[name,hashPassword(password),existing.id])
      await client.query('commit')
      console.log('Nexora owner account verified:',email)
      return
    }
    let studio=(await client.query("select id,name,owner_name,plan,project_limit from studios where name='Nexora Owner' order by created_at asc limit 1")).rows[0]
    if(!studio){
      studio=(await client.query("insert into studios(name,owner_name,plan,project_limit) values($1,$2,'pro',200) returning id,name,owner_name,plan,project_limit",['Nexora Owner',name])).rows[0]
    }
    await client.query("insert into users(studio_id,name,email,role,password_hash) values($1,$2,$3,'superadmin',$4)",[studio.id,name,email,hashPassword(password)])
    await client.query('commit')
    console.log('Nexora owner account bootstrapped:',email)
  }catch(error){
    await client.query('rollback')
    console.error('Owner account bootstrap failed:',error.message)
    throw error
  }finally{client.release()}
}

async function runStartupMigrations(){
  if(!pool) return
  const client=await pool.connect()
  try{
    await client.query('begin')
    const schema=await fs.readFile(path.join(process.cwd(),'server','schema.sql'),'utf8')
    await client.query(schema)
    await client.query('create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())')
    const dir=path.join(process.cwd(),'server','migrations')
    const files=(await fs.readdir(dir)).filter(name=>/^\d+_.+\.sql$/.test(name)).sort()
    for(const file of files){
      const exists=await client.query('select 1 from schema_migrations where version=$1',[file])
      if(exists.rowCount) continue
      await client.query(await fs.readFile(path.join(dir,file),'utf8'))
      await client.query('insert into schema_migrations(version) values($1)',[file])
      console.log('Applied migration:',file)
    }
    await client.query('commit')
  }catch(error){
    await client.query('rollback')
    console.error('Startup database migration failed:',error.message)
    throw error
  }finally{client.release()}
}

if (process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in production')
  }
  await runStartupMigrations()
  await bootstrapOwnerAccount()
  const server = app.listen(port, host, () => console.log('Nexora API listening on '+host+':'+port))
  server.on('error', (err) => {
    console.error('Nexora server error', err)
    process.exitCode = 1
  })
  const shutdown=async(signal)=>{
    console.log('Nexora shutdown:',signal)
    server.close(async()=>{
      try{ if(pool) await pool.end() }catch(error){ console.error('Database shutdown error:',error.message) }
      process.exit(0)
    })
    setTimeout(()=>process.exit(1),10000).unref()
  }
  process.once('SIGTERM',()=>shutdown('SIGTERM'))
  process.once('SIGINT',()=>shutdown('SIGINT'))
}