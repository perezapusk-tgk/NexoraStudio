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

app.get('/api/health', async (_req, res) => {
  let database = 'not_configured'
  if (pool) {
    try { await pool.query('select 1'); database = 'connected' } catch { database = 'error' }
  }
  res.json({ ok: true, service: 'nexora-api', version: '0.2.0', database })
})

app.get('/api/studio', (_req, res) => res.json({ studio: demoStudio }))

app.get('/api/projects', async (_req, res) => {
  if (!pool) return res.json({ projects: demoProjects() })
  const { rows } = await pool.query('select id, name, slug, project_type, status, domain, settings, created_at, updated_at from projects order by updated_at desc')
  res.json({ projects: rows })
})

app.post('/api/projects', async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const projectType = String(req.body?.projectType || 'website').trim()
  if (!name) return res.status(400).json({ error: 'Название проекта обязательно' })
  if (!pool) return res.status(201).json({ project: { id: crypto.randomUUID(), name, slug: slugify(name), project_type: projectType, status: 'draft' } })
  const slug = slugify(name)
  const { rows } = await pool.query(
    'insert into projects (studio_id, name, slug, project_type, status) values ($1,$2,$3,$4,$5) returning *',
    [demoStudio.id, name, slug, projectType, 'draft']
  )
  res.status(201).json({ project: rows[0] })
})

app.get('/api/projects/:id', async (req,res)=>{const id=req.params.id;if(!pool){const project=demoProjects().find(p=>p.id===id)||{id,name:'Новый проект',project_type:'website',status:'draft'};return res.json({project,pages:[{id:'page-'+id,title:'Главная',slug:'home',published:false,content:{blocks:[{type:'hero',headline:'Ваш бизнес. Онлайн.'}]}}]})}const pr=await pool.query('select * from projects where id=$1 or slug=$1 limit 1',[id]);if(!pr.rows[0])return res.status(404).json({error:'Проект не найден'});const pg=await pool.query('select * from pages where project_id=$1 order by created_at',[pr.rows[0].id]);res.json({project:pr.rows[0],pages:pg.rows})});
app.patch('/api/projects/:id',async(req,res)=>{if(!pool)return res.json({project:{id:req.params.id,name:req.body?.name,domain:req.body?.domain}});const q=await pool.query('update projects set name=coalesce($1,name),domain=coalesce($2,domain),updated_at=now() where id=$3 returning *',[req.body?.name,req.body?.domain,req.params.id]);if(!q.rows[0])return res.status(404).json({error:'Проект не найден'});res.json({project:q.rows[0]})});
app.post('/api/projects/:id/pages',async(req,res)=>{const title=String(req.body?.title||'Новая страница'),slug=slugify(req.body?.slug||title);if(!pool)return res.status(201).json({page:{id:crypto.randomUUID(),title,slug,content:{blocks:[]},published:false}});const q=await pool.query('insert into pages(project_id,title,slug,content) values($1,$2,$3,$4) returning *',[req.params.id,title,slug,JSON.stringify({blocks:[]})]);res.status(201).json({page:q.rows[0]})});
app.patch('/api/projects/:id/pages/:pageId',async(req,res)=>{if(!pool)return res.json({page:{id:req.params.pageId,...req.body}});const q=await pool.query('update pages set content=coalesce($1,content),updated_at=now() where id=$2 and project_id=$3 returning *',[req.body?.content?JSON.stringify(req.body.content):null,req.params.pageId,req.params.id]);if(!q.rows[0])return res.status(404).json({error:'Страница не найдена'});res.json({page:q.rows[0]})});
app.get('/api/public/:slug', async (req,res) => {
  const slug = String(req.params.slug || '').trim()
  if (!pool) {
    const project = demoProjects().find(p => p.slug === slug)
    if (!project) return res.status(404).json({error:'Публичный проект не найден'})
    return res.json({project,pages:[{id:'page-'+project.id,title:'Главная',slug:'home',published:true,content:{blocks:[
      {type:'hero',headline:project.name,subheadline:'Современный цифровой опыт для ваших клиентов.',cta:'Записаться'},
      {type:'services',title:'Услуги',items:['Основная услуга','Популярная услуга','Премиум услуга']},
      {type:'contacts',title:'Контакты',text:'Свяжитесь с нами удобным способом.'}
    ]}}],catalog:demoCatalog(project.id)})
  }
  const q = await pool.query('select * from projects where slug=$1 and status=\'published\' limit 1',[slug])
  if (!q.rows[0]) return res.status(404).json({error:'Публичный проект не найден'})
  const project = q.rows[0]
  const pages = await pool.query('select id,title,slug,content,published from pages where project_id=$1 and published=true order by created_at',[project.id])
  const catalog = await pool.query('select id,name,description,price,currency,image_url,active from catalog_items where project_id=$1 and active=true order by created_at desc',[project.id])
  res.json({project,pages:pages.rows,catalog:catalog.rows})
})

app.get('/api/projects/:id/catalog', async (req,res) => {
  const id = req.params.id
  if (!pool) return res.json({ items: demoCatalog(id) })
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
  if (!pool) return res.status(201).json({ item:{ id:crypto.randomUUID(), project_id:req.params.id, ...payload } })
  const q = await pool.query('insert into catalog_items(project_id,name,description,price,currency,image_url,active) values($1,$2,$3,$4,$5,$6,$7) returning *',[req.params.id,payload.name,payload.description,payload.price,payload.currency,payload.image_url,payload.active])
  res.status(201).json({ item:q.rows[0] })
})
app.patch('/api/projects/:id/catalog/:itemId', async (req,res) => {
  if (!pool) return res.json({ item:{ id:req.params.itemId, project_id:req.params.id, ...req.body } })
  const q = await pool.query('update catalog_items set name=coalesce($1,name),description=coalesce($2,description),price=coalesce($3,price),currency=coalesce($4,currency),image_url=coalesce($5,image_url),active=coalesce($6,active) where id=$7 and project_id=$8 returning *',[req.body?.name,req.body?.description,req.body?.price === '' ? null : req.body?.price,req.body?.currency,req.body?.image_url,req.body?.active,req.params.itemId,req.params.id])
  if (!q.rows[0]) return res.status(404).json({error:'Позиция каталога не найдена'})
  res.json({item:q.rows[0]})
})
app.delete('/api/projects/:id/catalog/:itemId', async (req,res) => {
  if (!pool) return res.json({deleted:true})
  const q = await pool.query('delete from catalog_items where id=$1 and project_id=$2 returning id',[req.params.itemId,req.params.id])
  if (!q.rows[0]) return res.status(404).json({error:'Позиция каталога не найдена'})
  res.json({deleted:true})
})

app.post('/api/projects/:id/publish',async(req,res)=>{if(!pool)return res.json({published:true,project:{id:req.params.id,status:'published'},url:'https://'+req.params.id+'.nexora.site'});const q=await pool.query("update projects set status='published',updated_at=now() where id=$1 returning *",[req.params.id]);if(!q.rows[0])return res.status(404).json({error:'Проект не найден'});await pool.query('update pages set published=true,updated_at=now() where project_id=$1',[req.params.id]);res.json({published:true,project:q.rows[0],url:q.rows[0].domain?'https://'+q.rows[0].domain:'https://'+q.rows[0].slug+'.nexora.site'})});
app.get('/api/leads', async (_req, res) => {
  if (!pool) return res.json({ leads: demoLeads() })
  const { rows } = await pool.query('select l.id, l.project_id, l.name, l.message, l.status, l.created_at, p.name as project_name from leads l left join projects p on p.id=l.project_id order by created_at desc limit 100')
  res.json({ leads: rows })
})

app.get('/api/bookings', async (_req, res) => {
  if (!pool) return res.json({ bookings: demoBookings() })
  const { rows } = await pool.query('select b.id, b.project_id, b.customer_name, b.starts_at, b.status, p.name as project_name from bookings b left join projects p on p.id=b.project_id order by starts_at asc limit 100')
  res.json({ bookings: rows })
})

app.get('/api/clients', async (_req, res) => {
  if (!pool) return res.json({ clients: demoClients() })
  const { rows } = await pool.query('select id, name, email, phone, created_at from clients order by created_at desc')
  res.json({ clients: rows })
})

app.get('/api/analytics/overview', async (_req, res) => {
  if (!pool) return res.json({ metrics: { visits: 28460, leads: 1284, bookings: 624, revenue: 18420 } })
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
