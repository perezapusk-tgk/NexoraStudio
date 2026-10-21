import express from 'express'
import cors from 'cors'
import pg from 'pg'
import crypto from 'node:crypto'

const { Pool } = pg
const app = express()
const port = Number(process.env.PORT || 4000)
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false }) : null

app.use(cors())
app.use(express.json())

const demoStudio = { id: '00000000-0000-0000-0000-000000000001', name: 'Nexora Studio', ownerName: 'Алексей', plan: 'pro', projectLimit: 50 }
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
const memoryEvents = []

app.get('/api/health', async (_req, res) => {
  let database = 'not_configured'
  if (pool) {
    try { await pool.query('select 1'); database = 'connected' } catch { database = 'error' }
  }
  res.json({ ok: true, service: 'nexora-api', version: '0.2.0', database })
})

app.get('/api/studio', (_req, res) => res.json({ studio: demoStudio }))

app.get('/api/projects', async (_req, res) => {
  if (!pool) return res.json({ projects: memoryProjects })
  const { rows } = await pool.query('select id, name, slug, project_type, status, domain, settings, created_at, updated_at from projects order by updated_at desc')
  res.json({ projects: rows })
})

app.post('/api/projects', async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const projectType = String(req.body?.projectType || 'website').trim()
  const templateId = String(req.body?.templateId || '').trim()
  if (!name) return res.status(400).json({ error: 'Название проекта обязательно' })
  if (!pool) {
  const template=templateDefinition(templateId)
  const project={id:crypto.randomUUID(),name,slug:slugify(name),project_type:projectType,status:'draft',domain:null,settings:{miniApp:{enabled:projectType.includes('miniapp')}}}
  memoryProjects.unshift(project)
  memoryPages.set(project.id,[{id:crypto.randomUUID(),title:'Главная',slug:'home',published:false,content:{blocks:template.blocks}}])
  memoryCatalog.set(project.id,template.catalog.map(item=>({id:crypto.randomUUID(),project_id:project.id,...item})))
  return res.status(201).json({project})
}
  const slug = slugify(name)
  const template=templateDefinition(templateId)
  const { rows } = await pool.query(
    'insert into projects (studio_id, name, slug, project_type, status, settings) values ($1,$2,$3,$4,$5,$6) returning *',
    [demoStudio.id, name, slug, projectType, 'draft', JSON.stringify({miniApp:{enabled:projectType.includes('miniapp')}})]
  )
  await pool.query(
    'insert into pages(project_id,title,slug,content) values($1,$2,$3,$4)',
    [rows[0].id,'Главная','home',JSON.stringify({blocks:template.blocks})]
  )
  for (const item of template.catalog) {
    await pool.query('insert into catalog_items(project_id,name,description,price,currency,active) values($1,$2,$3,$4,$5,$6)',[rows[0].id,item.name,item.description,item.price,item.currency,true])
  }
  res.status(201).json({ project: rows[0] })
})

app.get('/api/projects/:id', async (req,res)=>{const id=req.params.id;if(!pool){
  const project=memoryProjects.find(p=>p.id===id||p.slug===id)
  if(!project) return res.status(404).json({error:'Проект не найден'})
  return res.json({project,pages:memoryPages.get(project.id)||[]})
}const pr=await pool.query('select * from projects where id=$1 or slug=$1 limit 1',[id]);if(!pr.rows[0])return res.status(404).json({error:'Проект не найден'});const pg=await pool.query('select * from pages where project_id=$1 order by created_at',[pr.rows[0].id]);res.json({project:pr.rows[0],pages:pg.rows})});
app.patch('/api/projects/:id',async(req,res)=>{if(!pool){
  const p=memoryProjects.find(x=>x.id===req.params.id||x.slug===req.params.id)
  if(!p)return res.status(404).json({error:'Проект не найден'})
  if(req.body?.name)p.name=String(req.body.name).trim()
  if(req.body?.domain!==undefined)p.domain=String(req.body.domain||'').trim()||null
  if(req.body?.settings)p.settings={...(p.settings||{}),...req.body.settings}
  return res.json({project:p})
}const current=await pool.query('select * from projects where id=$1',[req.params.id]);if(!current.rows[0])return res.status(404).json({error:'Проект не найден'});const settings=req.body?.settings?{...(current.rows[0].settings||{}),...req.body.settings}:current.rows[0].settings;const q=await pool.query('update projects set name=coalesce($1,name),domain=case when $2 is null then domain else $2 end,settings=$3,updated_at=now() where id=$4 returning *',[req.body?.name,req.body?.domain===undefined?null:String(req.body.domain||'').trim()||null,JSON.stringify(settings),req.params.id]);res.json({project:q.rows[0]})});
app.post('/api/projects/:id/pages',async(req,res)=>{const title=String(req.body?.title||'Новая страница'),slug=slugify(req.body?.slug||title);if(!pool){const project=memoryProjects.find(x=>x.id===req.params.id||x.slug===req.params.id);if(!project)return res.status(404).json({error:'Проект не найден'});const page={id:crypto.randomUUID(),title,slug,content:{blocks:[]},published:false};const pages=memoryPages.get(project.id)||[];pages.push(page);memoryPages.set(project.id,pages);return res.status(201).json({page})};const q=await pool.query('insert into pages(project_id,title,slug,content) values($1,$2,$3,$4) returning *',[req.params.id,title,slug,JSON.stringify({blocks:[]})]);res.status(201).json({page:q.rows[0]})});
app.patch('/api/projects/:id/pages/:pageId',async(req,res)=>{if(!pool){const pages=memoryPages.get(req.params.id)||[];const p=pages.find(x=>x.id===req.params.pageId);if(!p)return res.status(404).json({error:'Страница не найдена'});if(req.body?.content)p.content=req.body.content;return res.json({page:p})}const q=await pool.query('update pages set content=coalesce($1,content),updated_at=now() where id=$2 and project_id=$3 returning *',[req.body?.content?JSON.stringify(req.body.content):null,req.params.pageId,req.params.id]);if(!q.rows[0])return res.status(404).json({error:'Страница не найдена'});res.json({page:q.rows[0]})});
app.get('/api/public/:slug', async (req,res) => {
  const slug = String(req.params.slug || '').trim()
  if (!pool) {
    const project = memoryProjects.find(p => p.slug === slug && p.status === 'published')
    if (!project) return res.status(404).json({error:'Публичный проект не найден'})
    return res.json({project,pages:(memoryPages.get(project.id)||[]).filter(x=>x.published),catalog:memoryCatalog.get(project.id)||[]})
  }
  const q = await pool.query('select * from projects where slug=$1 and status=\'published\' limit 1',[slug])
  if (!q.rows[0]) return res.status(404).json({error:'Публичный проект не найден'})
  const project = q.rows[0]
  const pages = await pool.query('select id,title,slug,content,published from pages where project_id=$1 and published=true order by created_at',[project.id])
  const catalog = await pool.query('select id,name,description,price,currency,image_url,active from catalog_items where project_id=$1 and active=true order by created_at desc',[project.id])
  res.json({project,pages:pages.rows,catalog:catalog.rows})
})

app.post('/api/projects/:id/telegram/configure', async (req,res) => {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
  if (!token) return res.status(503).json({ error: 'TELEGRAM_BOT_TOKEN не настроен на сервере' })
  const project = !pool
    ? memoryProjects.find(p => p.id === req.params.id || p.slug === req.params.id)
    : (await pool.query('select * from projects where id=$1 or slug=$1 limit 1',[req.params.id])).rows[0]
  if (!project) return res.status(404).json({ error: 'Проект не найден' })
  const domain = String(project.domain || '').trim()
  const base = domain ? 'https://' + domain.replace(/^https?:\\/\\//,'').replace(/\\/$/,'') : 'https://' + project.slug + '.nexora.site'
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
  if(!name || (!phone && !String(req.body?.email||'').trim())) return res.status(400).json({error:'Укажите имя и телефон или email'})
  if(!pool){const lead={id:crypto.randomUUID(),project_slug:slug,name,phone,email:String(req.body?.email||''),message,status:'new',source:'public',created_at:new Date().toISOString()};memoryLeads.unshift(lead);return res.status(201).json({lead})}
  const pr=await pool.query("select id from projects where slug=$1 and status='published' limit 1",[slug])
  if(!pr.rows[0]) return res.status(404).json({error:'Публичный проект не найден'})
  const q=await pool.query('insert into leads(project_id,name,email,phone,message,status,source) values($1,$2,$3,$4,$5,$6,$7) returning id,name,email,phone,message,status,source,created_at',[pr.rows[0].id,name,String(req.body?.email||'').trim()||null,phone||null,message,'new','public'])
  res.status(201).json({lead:q.rows[0]})
})

app.post('/api/public/:slug/bookings', async (req,res) => {
  const slug=String(req.params.slug||'').trim()
  const name=String(req.body?.name||'').trim()
  const phone=String(req.body?.phone||'').trim()
  const startsAt=String(req.body?.starts_at||'').trim()
  const serviceName=String(req.body?.service_name||'').trim()
  if(!name || !phone || !startsAt) return res.status(400).json({error:'Заполните имя, телефон и время'})
  if(!pool){const booking={id:crypto.randomUUID(),project_slug:slug,customer_name:name,customer_phone:phone,starts_at:startsAt,service_name:serviceName,status:'pending'};memoryBookings.push(booking);return res.status(201).json({booking})}
  const pr=await pool.query("select id from projects where slug=$1 and status='published' limit 1",[slug])
  if(!pr.rows[0]) return res.status(404).json({error:'Публичный проект не найден'})
  const q=await pool.query('insert into bookings(project_id,customer_name,customer_phone,starts_at,service_name,status) values($1,$2,$3,$4,$5,$6) returning *',[pr.rows[0].id,name,phone,startsAt,serviceName||null,'pending'])
  res.status(201).json({booking:q.rows[0]})
})

app.post('/api/public/:slug/events', async (req,res) => {
  const slug=String(req.params.slug||'').trim()
  if(!pool){memoryEvents.push({slug,event_type:String(req.body?.event_type||'page_view'),path:String(req.body?.path||''),created_at:new Date().toISOString()});return res.status(204).end()}
  const pr=await pool.query('select id from projects where slug=$1 limit 1',[slug])
  if(!pr.rows[0]) return res.status(404).json({error:'Проект не найден'})
  const type=String(req.body?.event_type||'page_view')
  const value=Number(req.body?.value||0)
  await pool.query('insert into analytics_events(project_id,event_type,path,value,metadata) values($1,$2,$3,$4,$5)',[pr.rows[0].id,type,String(req.body?.path||''),value,JSON.stringify(req.body?.metadata||{})])
  res.status(204).end()
})

app.get('/api/projects/:id/catalog', async (req,res) => {
  const id = req.params.id
  if (!pool) return res.json({ items: memoryCatalog.get(id) || [] })
  const q = await pool.query('select id, project_id, name, description, price, currency, image_url, active, created_at from catalog_items where project_id=$1 order by created_at desc',[id])
  res.json({ items: q.rows })
})
app.post('/api/projects/:id/catalog', async (req,res) => {
  const name = String(req.body?.name || '').trim()
  if (!name) return res.status(400).json({ error:'Название товара обязательно' })
  const payload = {
    name,
    description: String(req.body?.description || ''),
    price: req.body?.price === '' || req.body?.price == null ? null : Number(req.body.price),
    currency: String(req.body?.currency || 'EUR'),
    image_url: String(req.body?.image_url || ''),
    active: req.body?.active !== false
  }
  if (!pool) { const item={id:crypto.randomUUID(),project_id:req.params.id,...payload};const list=memoryCatalog.get(req.params.id)||[];list.unshift(item);memoryCatalog.set(req.params.id,list);return res.status(201).json({item}) }
  const q = await pool.query('insert into catalog_items(project_id,name,description,price,currency,image_url,active) values($1,$2,$3,$4,$5,$6,$7) returning *',[req.params.id,payload.name,payload.description,payload.price,payload.currency,payload.image_url,payload.active])
  res.status(201).json({ item:q.rows[0] })
})
app.patch('/api/projects/:id/catalog/:itemId', async (req,res) => {
  if (!pool){const list=memoryCatalog.get(req.params.id)||[];const item=list.find(x=>x.id===req.params.itemId);if(!item)return res.status(404).json({error:'Позиция каталога не найдена'});Object.assign(item,req.body);return res.json({item})}
  const q = await pool.query('update catalog_items set name=coalesce($1,name),description=coalesce($2,description),price=coalesce($3,price),currency=coalesce($4,currency),image_url=coalesce($5,image_url),active=coalesce($6,active) where id=$7 and project_id=$8 returning *',[req.body?.name,req.body?.description,req.body?.price === '' ? null : req.body?.price,req.body?.currency,req.body?.image_url,req.body?.active,req.params.itemId,req.params.id])
  if (!q.rows[0]) return res.status(404).json({error:'Позиция каталога не найдена'})
  res.json({item:q.rows[0]})
})
app.delete('/api/projects/:id/catalog/:itemId', async (req,res) => {
  if (!pool){const list=memoryCatalog.get(req.params.id)||[];const next=list.filter(x=>x.id!==req.params.itemId);if(next.length===list.length)return res.status(404).json({error:'Позиция каталога не найдена'});memoryCatalog.set(req.params.id,next);return res.json({deleted:true})}
  const q = await pool.query('delete from catalog_items where id=$1 and project_id=$2 returning id',[req.params.itemId,req.params.id])
  if (!q.rows[0]) return res.status(404).json({error:'Позиция каталога не найдена'})
  res.json({deleted:true})
})

app.post('/api/projects/:id/publish',async(req,res)=>{if(!pool){const p=memoryProjects.find(x=>x.id===req.params.id||x.slug===req.params.id);if(!p)return res.status(404).json({error:'Проект не найден'});p.status='published';(memoryPages.get(p.id)||[]).forEach(x=>x.published=true);return res.json({published:true,project:p,url:'https://'+p.slug+'.nexora.site'})}const q=await pool.query("update projects set status='published',updated_at=now() where id=$1 returning *",[req.params.id]);if(!q.rows[0])return res.status(404).json({error:'Проект не найден'});await pool.query('update pages set published=true,updated_at=now() where project_id=$1',[req.params.id]);res.json({published:true,project:q.rows[0],url:q.rows[0].domain?'https://'+q.rows[0].domain:'https://'+q.rows[0].slug+'.nexora.site'})});
app.get('/api/leads', async (_req, res) => {
  if (!pool) return res.json({ leads: memoryLeads })
  const { rows } = await pool.query('select l.id, l.project_id, l.name, l.message, l.status, l.created_at, p.name as project_name from leads l left join projects p on p.id=l.project_id order by created_at desc limit 100')
  res.json({ leads: rows })
})

app.get('/api/bookings', async (_req, res) => {
  if (!pool) return res.json({ bookings: memoryBookings })
  const { rows } = await pool.query('select b.id, b.project_id, b.customer_name, b.starts_at, b.status, p.name as project_name from bookings b left join projects p on p.id=b.project_id order by starts_at asc limit 100')
  res.json({ bookings: rows })
})

app.patch('/api/leads/:id', async (req,res) => {
  const id=String(req.params.id)
  const status=String(req.body?.status||'').trim()
  if(!status)return res.status(400).json({error:'Статус обязателен'})
  const allowed=['new','in_progress','won','lost']
  if(!allowed.includes(status))return res.status(400).json({error:'Недопустимый статус'})
  if(!pool){
    const lead=memoryLeads.find(x=>x.id===id)
    if(!lead)return res.status(404).json({error:'Заявка не найдена'})
    lead.status=status
    return res.json({lead})
  }
  const q=await pool.query('update leads set status=$1 where id=$2 returning *',[status,id])
  if(!q.rows[0])return res.status(404).json({error:'Заявка не найдена'})
  res.json({lead:q.rows[0]})
})

app.post('/api/leads/:id/convert', async (req,res) => {
  const id=String(req.params.id)
  if(!pool){
    const lead=memoryLeads.find(x=>x.id===id)
    if(!lead)return res.status(404).json({error:'Заявка не найдена'})
    const existing=demoClients().find(x=>(lead.phone&&x.phone===lead.phone)||(lead.email&&x.email===lead.email))
    if(existing)return res.json({client:existing,existing:true})
    const client={id:crypto.randomUUID(),name:lead.name,email:lead.email||'',phone:lead.phone||'',created_at:new Date().toISOString(),source_lead_id:id}
    lead.status='won'
    memoryClients.unshift(client)
    return res.status(201).json({client,existing:false})
  }
  const leadQ=await pool.query('select * from leads where id=$1 limit 1',[id])
  if(!leadQ.rows[0])return res.status(404).json({error:'Заявка не найдена'})
  const lead=leadQ.rows[0]
  const existingQ=await pool.query('select id,name,email,phone,created_at from clients where (phone=$1 and $1 is not null) or (email=$2 and $2 is not null) limit 1',[lead.phone,lead.email])
  if(existingQ.rows[0])return res.json({client:existingQ.rows[0],existing:true})
  const q=await pool.query('insert into clients(studio_id,name,email,phone) values($1,$2,$3,$4) returning id,name,email,phone,created_at',[demoStudio.id,lead.name,lead.email||null,lead.phone||null])
  await pool.query("update leads set status='won' where id=$1",[id])
  res.status(201).json({client:q.rows[0],existing:false})
})

app.get('/api/clients', async (_req, res) => {
  if (!pool) return res.json({ clients: demoClients() })
  const { rows } = await pool.query('select id, name, email, phone, created_at from clients order by created_at desc')
  res.json({ clients: rows })
})

app.get('/api/projects/:id/analytics', async (req,res) => {
  const id=req.params.id
  if(!pool){
    const project=memoryProjects.find(p=>p.id===id||p.slug===id)
    if(!project)return res.status(404).json({error:'Проект не найден'})
    const slug=project.slug
    const events=memoryEvents.filter(e=>e.slug===slug)
    const leads=memoryLeads.filter(l=>l.project_slug===slug)
    const bookings=memoryBookings.filter(b=>b.project_slug===slug)
    return res.json({metrics:{visits:events.filter(e=>e.event_type==='page_view').length,leads:leads.length,bookings:bookings.length,revenue:0}})
  }
  const project=await pool.query('select id from projects where id=$1 or slug=$1 limit 1',[id])
  if(!project.rows[0])return res.status(404).json({error:'Проект не найден'})
  const q=await pool.query(`select
    count(*) filter (where event_type='page_view')::int as visits,
    count(*) filter (where event_type='lead')::int as leads,
    count(*) filter (where event_type='booking')::int as bookings,
    coalesce(sum(value) filter (where event_type='payment'),0)::numeric as revenue
    from analytics_events where project_id=$1 and created_at >= now() - interval '30 days'`,[project.rows[0].id])
  res.json({metrics:q.rows[0]})
})

app.get('/api/analytics/overview', async (_req, res) => {
  if (!pool) return res.json({ metrics: { visits: 28460 + memoryEvents.length, leads: memoryLeads.length, bookings: memoryBookings.length, revenue: 18420 } })
  const { rows } = await pool.query(`
    select
      count(*) filter (where event_type='page_view')::int as visits,
      count(*) filter (where event_type='lead')::int as leads,
      count(*) filter (where event_type='booking')::int as bookings,
      coalesce(sum(value) filter (where event_type='payment'),0)::numeric as revenue
    from analytics_events
    where created_at >= now() - interval '30 days'
  `)
  res.json({ metrics: rows[0] })
})

app.get('/api/templates', (_req, res) => res.json({ templates: [
  { id:'barber', name:'Barber', category:'Барбершоп' },
  { id:'beauty', name:'Beauty', category:'Салон красоты' },
  { id:'fitness', name:'Fitness', category:'Фитнес-студия' },
  { id:'restaurant', name:'Restaurant', category:'Ресторан' },
  { id:'coffee', name:'Coffee', category:'Кофейня' },
  { id:'dental', name:'Dental', category:'Стоматология' }
]}))

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))

app.listen(port, () => console.log(`Nexora API listening on :${port}`))

function templateDefinition(id){
  const common={
    barber:{hero:'Barber House',sub:'Стильная запись и услуги без звонков.',items:['Мужская стрижка','Стрижка бороды','Комплекс'],catalog:[['Мужская стрижка','Стрижка и укладка',35],['Стрижка бороды','Форма и уход',20],['Комплекс','Стрижка + борода',50]]},
    beauty:{hero:'Beauty Studio',sub:'Красота, уход и запись онлайн.',items:['Стрижка','Окрашивание','Уход'],catalog:[['Стрижка','Консультация и укладка',45],['Окрашивание','Подбор оттенка и уход',90],['Уход','Восстановление волос',55]]},
    fitness:{hero:'Fitness Studio',sub:'Тренировки и абонементы в одном месте.',items:['Персональная тренировка','Групповое занятие','Абонемент'],catalog:[['Персональная тренировка','Индивидуальная программа',40],['Групповое занятие','Тренировка с группой',15],['Абонемент','Месячный абонемент',79]]},
    restaurant:{hero:'Restaurant',sub:'Меню, бронирование и заявки онлайн.',items:['Завтраки','Основные блюда','Десерты'],catalog:[['Завтрак','Сезонное меню',14],['Основное блюдо','Авторская кухня',24],['Десерт','Домашний десерт',9]]},
    coffee:{hero:'Coffee House',sub:'Кофе, десерты и заказы для гостей.',items:['Кофе','Десерты','Завтраки'],catalog:[['Капучино','Классический кофе',4.5],['Чизкейк','Домашний десерт',6],['Завтрак','Кофе + выпечка',10]]},
    dental:{hero:'Dental Clinic',sub:'Запись на консультацию и лечение онлайн.',items:['Консультация','Гигиена','Лечение'],catalog:[['Консультация','Первичный приём',50],['Гигиена','Профессиональная чистка',80],['Лечение','План лечения после осмотра',120]]}
  }
  const x=common[id]||{hero:'Ваш бизнес',sub:'Современный цифровой опыт для клиентов.',items:['Основная услуга','Популярная услуга','Премиум услуга'],catalog:[['Основная услуга','Описание услуги',30],['Популярная услуга','Описание услуги',50],['Премиум услуга','Описание услуги',80]]}
  return {blocks:[
    {type:'hero',headline:x.hero,subheadline:x.sub,cta:'Записаться'},
    {type:'services',title:'Услуги',items:x.items},
    {type:'contacts',title:'Контакты',text:'Свяжитесь с нами удобным способом.'}
  ],catalog:x.catalog.map(([name,description,price])=>({name,description,price,currency:'EUR',active:true}))}
}

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || crypto.randomUUID().slice(0,8)
}
function demoProjects(){ return [
  {id:'p1',name:'Barber House',slug:'barber-house',project_type:'website+miniapp',status:'published'},
  {id:'p2',name:'Nordic Beauty',slug:'nordic-beauty',project_type:'website',status:'draft'},
  {id:'p3',name:'Urban Fitness',slug:'urban-fitness',project_type:'miniapp',status:'published'}
] }
function demoCatalog(projectId){ return [
  {id:'item-1',project_id:projectId,name:'Стрижка',description:'Классическая мужская стрижка',price:35,currency:'EUR',active:true},
  {id:'item-2',project_id:projectId,name:'Стрижка + борода',description:'Комплексная услуга',price:50,currency:'EUR',active:true},
  {id:'item-3',project_id:projectId,name:'Премиум уход',description:'Уход и укладка',price:65,currency:'EUR',active:true}
] }
function demoLeads(){ return [{id:'l1',name:'Марина Соколова',message:'Хочу записаться на стрижку',status:'new'},{id:'l2',name:'Иван Петров',message:'Есть ли свободное окно в субботу?',status:'in_progress'}] }
function demoBookings(){ return [{id:'b1',customer_name:'Александр К.',starts_at:'2026-10-21T10:00:00',status:'confirmed'},{id:'b2',customer_name:'Елена М.',starts_at:'2026-10-21T11:00:00',status:'confirmed'}] }
function demoClients(){ return [{id:'c1',name:'Barber House',email:'client@example.com',phone:'+358 40 000 0000'},{id:'c2',name:'Nordic Beauty',email:'hello@example.com',phone:'+358 40 000 0001'}] }
