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

const demoStudio = { id: 'studio_demo', name: 'Nexora Studio', ownerName: 'Алексей', plan: 'pro', projectLimit: 50 }

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
  const { rows } = await pool.query('select id, name, slug, project_type, status, created_at, updated_at from projects order by updated_at desc')
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

app.get('/api/leads', async (_req, res) => {
  if (!pool) return res.json({ leads: demoLeads() })
  const { rows } = await pool.query('select id, project_id, name, message, status, created_at from leads order by created_at desc limit 100')
  res.json({ leads: rows })
})

app.get('/api/bookings', async (_req, res) => {
  if (!pool) return res.json({ bookings: demoBookings() })
  const { rows } = await pool.query('select id, project_id, customer_name, starts_at, status from bookings order by starts_at asc limit 100')
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
function demoLeads(){ return [{id:'l1',name:'Марина Соколова',message:'Хочу записаться на стрижку',status:'new'},{id:'l2',name:'Иван Петров',message:'Есть ли свободное окно в субботу?',status:'in_progress'}] }
function demoBookings(){ return [{id:'b1',customer_name:'Александр К.',starts_at:'2026-10-21T10:00:00',status:'confirmed'},{id:'b2',customer_name:'Елена М.',starts_at:'2026-10-21T11:00:00',status:'confirmed'}] }
function demoClients(){ return [{id:'c1',name:'Barber House',email:'client@example.com',phone:'+358 40 000 0000'},{id:'c2',name:'Nordic Beauty',email:'hello@example.com',phone:'+358 40 000 0001'}] }
