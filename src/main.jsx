import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import {
  LayoutDashboard, FolderKanban, Inbox, Users, CalendarDays, Globe2,
  Smartphone, BarChart3, Plug, Zap, Settings, Plus, Search, Bell,
  ArrowUpRight, MoreHorizontal, ChevronRight, CheckCircle2, Clock3,
  CircleDollarSign, ExternalLink, Filter, Send, CreditCard, Palette,
  ShieldCheck, Bot, Sparkles, X, Menu, LogOut, UserRound, Layers3, Receipt, ShoppingCart
} from 'lucide-react'
import './styles.css'

const nav = [
  ['Обзор', LayoutDashboard],
  ['Проекты', FolderKanban],
  ['Заявки', Inbox],
  ['Клиенты', Users],
  ['Бронирования', CalendarDays],
  ['Платежи', CreditCard],
  ['Заказы', ShoppingCart],
  ['Счета', Receipt],
  ['Сайты', Globe2],
  ['Mini Apps', Smartphone],
  ['Аналитика', BarChart3],
  ['Интеграции', Plug],
  ['Шаблоны', Layers3],
  ['Настройки', Settings],
]

const projects = [
  { name: 'Barber House', type: 'Сайт + Mini App', status: 'Опубликован', color: 'dark', leads: 18, bookings: 12, revenue: '€1 840', updated: 'сегодня' },
  { name: 'Nordic Beauty', type: 'Сайт', status: 'В работе', color: 'blue', leads: 11, bookings: 4, revenue: '€920', updated: '2 ч назад' },
  { name: 'Urban Fitness', type: 'Mini App', status: 'Опубликован', color: 'purple', leads: 8, bookings: 7, revenue: '€2 060', updated: 'вчера' },
  { name: 'Mokka Coffee', type: 'Сайт + каталог', status: 'Черновик', color: 'orange', leads: 0, bookings: 0, revenue: '€0', updated: 'вчера' },
]

const activities = [
  ['Новая заявка', 'Barber House', '2 мин назад', 'lead'],
  ['Бронирование подтверждено', 'Urban Fitness', '18 мин назад', 'booking'],
  ['Сайт опубликован', 'Nordic Beauty', '2 ч назад', 'site'],
  ['Получен платёж', 'Barber House · €85', '3 ч назад', 'payment'],
]

function PublicApp({mode,slug}){
  const [data,setData]=useState(null)
  const [error,setError]=useState('')
  useEffect(()=>{let alive=true;api.publicProject(slug).then(v=>alive&&setData(v)).catch(()=>alive&&setError('Проект не найден')).finally(()=>{});return()=>{alive=false}},[slug])
  if(error) return <div className="public-error"><b>{error}</b><span>Проверьте адрес публикации.</span></div>
  if(!data) return <div className="public-loading">Загрузка…</div>
  return mode==='miniapp'?<PublicMiniApp data={data} slug={slug}/>:<PublicSite data={data} slug={slug}/>
}

function PublicSite({data,slug}){
  const project=data.project,pages=data.pages||[],blocks=pages[0]?.content?.blocks||[],catalog=(data.catalog||[]).filter(x=>x.active!==false)
  const [open,setOpen]=useState(false),[sent,setSent]=useState(null),[cart,setCart]=useState([]),[form,setForm]=useState({name:'',phone:'',email:''}),[sending,setSending]=useState(false)
  useEffect(()=>{api.publicEvent(slug,{event_type:'page_view',path:window.location.pathname}).catch(()=>{})},[slug])
  const add=(item)=>setCart(v=>{const found=v.find(x=>x.id===item.id);return found?v.map(x=>x.id===item.id?{...x,quantity:x.quantity+1}:x):[...v,{...item,quantity:1}]})
  const change=(id,delta)=>setCart(v=>v.map(x=>x.id===id?{...x,quantity:Math.max(0,x.quantity+delta)}:x).filter(x=>x.quantity>0))
  const total=cart.reduce((s,x)=>s+Number(x.price||0)*x.quantity,0)
  const checkout=async(e)=>{e.preventDefault();setSending(true);try{const r=await api.publicCheckout(slug,{...form,items:cart.map(x=>({catalog_id:x.id,quantity:x.quantity})),currency:cart[0]?.currency||'EUR'});setSent(r.order);setCart([]);setForm({name:'',phone:'',email:''})}catch(err){alert(err.message||'Не удалось оформить заказ.')}finally{setSending(false)}}
  return <div className="public-app"><header className="public-nav"><b>{project.name}</b><span>Сайт</span>{cart.length>0&&<button className="filter" onClick={()=>setOpen(true)}>Корзина · {cart.reduce((s,x)=>s+x.quantity,0)}</button>}</header><main className="public-site">
    {blocks.map((b,i)=>b.type==='hero'?<section className="public-hero" key={i}><small>NEXORA</small><h1>{b.headline}</h1><p>{b.subheadline}</p><button onClick={()=>catalog.length?setOpen(true):setOpen(true)}>{b.cta||'Оставить заявку'}</button></section>:b.type==='services'?<section className="public-block" key={i}><div className="public-kicker">{b.title}</div><div className="public-cards">{(b.items||[]).map(x=><article key={x}><b>{x}</b><span>Подробности и запись доступны онлайн.</span><button className="text-action" onClick={()=>setOpen(true)}>Записаться →</button></article>)}</div></section>:<section className="public-block" key={i}><div className="public-kicker">{b.title}</div><p>{b.text}</p></section>)}
    {catalog.length>0&&<section className="public-block"><div className="public-kicker">Каталог</div><div className="public-cards">{catalog.map(x=><article key={x.id}><b>{x.name}</b><span>{x.description||'Услуга или товар'}</span><strong>{x.price!=null?new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.price)):'По запросу'}</strong><button className="text-action" onClick={()=>add(x)}>В корзину →</button></article>)}</div></section>}
  </main>
  {cart.length>0&&<div className="public-cart card"><div><b>Корзина</b><span>{cart.reduce((s,x)=>s+x.quantity,0)} позиции · {new Intl.NumberFormat('ru-RU',{style:'currency',currency:cart[0]?.currency||'EUR'}).format(total)}</span></div><button className="primary" onClick={()=>setOpen(true)}>Оформить заказ</button></div>}
  {open&&<div className="public-modal-backdrop" onMouseDown={()=>setOpen(false)}><form className="public-modal card" onSubmit={checkout} onMouseDown={e=>e.stopPropagation()}><button type="button" className="public-close" onClick={()=>setOpen(false)}><X size={18}/></button>{sent?<div className="public-success"><CheckCircle2 size={30}/><h2>Заказ оформлен</h2><p>Номер заказа: <b>{sent.number}</b></p><p>Мы получили ваши данные и свяжемся для подтверждения.</p><button type="button" onClick={()=>{setSent(null);setOpen(false)}}>Готово</button></div>:<><div className="eyebrow">Оформление заказа</div><h2>Ваш заказ</h2><div className="checkout-lines">{cart.map(x=><div key={x.id}><span>{x.name} × {x.quantity}</span><b>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.price||0)*x.quantity)}</b><button type="button" onClick={()=>change(x.id,-1)}>−</button><button type="button" onClick={()=>change(x.id,1)}>+</button></div>)}</div><strong className="checkout-total">Итого: {new Intl.NumberFormat('ru-RU',{style:'currency',currency:cart[0]?.currency||'EUR'}).format(total)}</strong><label>Имя<input required value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Телефон<input value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label><button className="primary" disabled={sending||!cart.length}>{sending?'Оформляем…':'Подтвердить заказ'}</button></>}</form></div>}
  </div>
}

function PublicMiniApp({data,slug}){
  const project=data.project,catalog=(data.catalog||[]).filter(x=>x.active!==false)
  const [open,setOpen]=useState(false),[sent,setSent]=useState(null),[cart,setCart]=useState([]),[form,setForm]=useState({name:'',phone:'',email:''}),[sending,setSending]=useState(false)
  useEffect(()=>{api.publicEvent(slug,{event_type:'page_view',path:window.location.pathname,metadata:{surface:'miniapp'}}).catch(()=>{})},[slug])
  const add=(item)=>setCart(v=>{const found=v.find(x=>x.id===item.id);return found?v.map(x=>x.id===item.id?{...x,quantity:x.quantity+1}:x):[...v,{...item,quantity:1}]})
  const change=(id,delta)=>setCart(v=>v.map(x=>x.id===id?{...x,quantity:Math.max(0,x.quantity+delta)}:x).filter(x=>x.quantity>0))
  const total=cart.reduce((s,x)=>s+Number(x.price||0)*x.quantity,0)
  const checkout=async(e)=>{e.preventDefault();setSending(true);try{const r=await api.publicCheckout(slug,{...form,items:cart.map(x=>({catalog_id:x.id,quantity:x.quantity})),currency:cart[0]?.currency||'EUR'});setSent(r.order);setCart([]);setForm({name:'',phone:'',email:''})}catch(err){alert(err.message||'Не удалось оформить заказ.')}finally{setSending(false)}}
  return <div className="mini-public"><div className="mini-public-top"><b>{project.name}</b><span>Telegram Mini App</span>{cart.length>0&&<button className="filter" onClick={()=>setOpen(true)}>Корзина · {cart.reduce((s,x)=>s+x.quantity,0)}</button>}</div><section className="mini-public-hero"><small>ОНЛАЙН-СЕРВИС</small><h1>{project.name}</h1><p>Каталог, заказ и запись — прямо внутри Telegram.</p><button onClick={()=>setOpen(true)}>Открыть корзину</button></section><section className="mini-public-section"><div className="public-kicker">Каталог</div>{catalog.length?catalog.map(x=><div className="mini-public-item" key={x.id}><div><b>{x.name}</b><span>{x.description||'Услуга'}</span></div><strong>{x.price!=null?new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.price)):'По запросу'}</strong><button onClick={()=>add(x)}>В корзину</button></div>):<div className="mini-public-empty">Каталог будет доступен после публикации позиций.</div>}</section>
  {cart.length>0&&<div className="public-cart card"><div><b>Корзина</b><span>{cart.reduce((s,x)=>s+x.quantity,0)} позиции · {new Intl.NumberFormat('ru-RU',{style:'currency',currency:cart[0]?.currency||'EUR'}).format(total)}</span></div><button className="primary" onClick={()=>setOpen(true)}>Оформить</button></div>}
  {open&&<div className="public-modal-backdrop" onMouseDown={()=>setOpen(false)}><form className="public-modal card" onSubmit={checkout} onMouseDown={e=>e.stopPropagation()}><button type="button" className="public-close" onClick={()=>setOpen(false)}><X size={18}/></button>{sent?<div className="public-success"><CheckCircle2 size={30}/><h2>Заказ оформлен</h2><p>Номер заказа: <b>{sent.number}</b></p><p>Спасибо! Заказ принят.</p><button type="button" onClick={()=>{setSent(null);setOpen(false)}}>Готово</button></div>:<><div className="eyebrow">Заказ</div><h2>Оформление</h2><div className="checkout-lines">{cart.map(x=><div key={x.id}><span>{x.name} × {x.quantity}</span><b>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.price||0)*x.quantity)}</b><button type="button" onClick={()=>change(x.id,-1)}>−</button><button type="button" onClick={()=>change(x.id,1)}>+</button></div>)}</div><strong className="checkout-total">Итого: {new Intl.NumberFormat('ru-RU',{style:'currency',currency:cart[0]?.currency||'EUR'}).format(total)}</strong><label>Имя<input required value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Телефон<input value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label><button className="primary" disabled={sending||!cart.length}>{sending?'Оформляем…':'Подтвердить заказ'}</button></>}</form></div>}
  </div>
}

function Root(){
  const path=window.location.pathname.split('/').filter(Boolean)
  if(path[0]==='published'&&path[1]) return <PublicApp mode="site" slug={path[1]}/>
  if(path[0]==='miniapp'&&path[1]) return <PublicApp mode="miniapp" slug={path[1]}/>
  return <App/>
}

function App() {
  const [active, setActive] = useState('Обзор')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [projectData, setProjectData] = useState(projects)
  const [apiState, setApiState] = useState('loading')
  const [crm, setCrm] = useState({ leads: [], clients: [], bookings: [], payments: [], invoices: [], analytics: null })
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectView, setProjectView] = useState('overview')
  const [workspaceData, setWorkspaceData] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [orders, setOrders] = useState([])
  const [clientData, setClientData] = useState(null)

  useEffect(() => {
    let alive = true
    api.projects().then(items => {
      if (!alive) return
      const list = Array.isArray(items) ? items : (items.projects || [])
      if (list.length) setProjectData(list.map(p => ({
        id: p.id,
        name: p.name || p.title || 'Без названия',
        type: p.project_type === 'miniapp' ? 'Mini App' : p.project_type === 'site' ? 'Сайт' : 'Сайт + Mini App',
        status: p.status === 'published' ? 'Опубликован' : p.status === 'draft' ? 'Черновик' : 'В работе',
        color: 'dark', leads: Number(p.leads || 0), bookings: Number(p.bookings || 0), revenue: p.revenue || '€0', updated: 'только что'
      })))
      setApiState('online')
    }).catch(() => alive && setApiState('offline'))
    Promise.allSettled([api.leads(), api.clients(), api.bookings(), api.payments(), api.invoices(), api.analytics(), api.orders()]).then(([leads, clients, bookings, payments, invoices, analytics, ordersResult]) => {
      if (!alive) return
      setOrders(ordersResult.status === 'fulfilled' ? (ordersResult.value.orders || []) : [])
      setCrm({
        leads: leads.status === 'fulfilled' ? (leads.value.leads || []) : [],
        clients: clients.status === 'fulfilled' ? (clients.value.clients || []) : [],
        bookings: bookings.status === 'fulfilled' ? (bookings.value.bookings || []) : [],
        payments: payments.status === 'fulfilled' ? (payments.value.payments || []) : [],
        invoices: invoices.status === 'fulfilled' ? (invoices.value.invoices || []) : [],
        analytics: analytics.status === 'fulfilled' ? analytics.value.metrics : null
      })
    })
    return () => { alive = false }
  }, [])

  const createProject = async (projectType, templateId = '') => {
    const name = window.prompt('Название проекта')
    if (!name?.trim()) return
    try {
      const created = await api.createProject({ name: name.trim(), projectType, templateId })
      const mapped = { id: created.id, type: projectType === 'miniapp' ? 'Mini App' : projectType === 'site' ? 'Сайт' : 'Сайт + Mini App', status: 'Черновик', color: 'dark', leads: 0, bookings: 0, revenue: '€0', updated: 'только что' }
      setProjectData(v => [mapped, ...v])
      setShowCreate(false)
      setActive('Проекты')
    } catch { window.alert('Не удалось создать проект. Проверьте API.') }
  }

  const filteredProjects = useMemo(
    () => projectData.filter(p => p.name.toLowerCase().includes(query.toLowerCase())),
    [query]
  )

  const go = (item) => {
    setActive(item); setSelectedProject(null); setProjectView('overview'); setWorkspaceData(null); setSelectedClient(null); setClientData(null); setMobileOpen(false)
  }
  const openClient = async (client) => {
    if (!client?.id) return
    setSelectedClient(client)
    setSelectedProject(null)
    try { setClientData(await api.client(client.id)) } catch { setClientData({client,leads:[],bookings:[],payments:[],invoices:[]}) }
  }
  const openProject = async (project) => {
    if (!project.id) return
    setSelectedProject(project); setProjectView('overview')
    try { setWorkspaceData(await api.project(project.id)) } catch { setWorkspaceData({project,pages:[]}) }
  }

  return (
    <div className="app">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark">N</div><div><strong>Nexora</strong><span>Studio OS</span></div></div>
        <div className="workspace"><div className="workspace-avatar">NS</div><div><b>Nexora Studio</b><span>Рабочее пространство</span></div><ChevronRight size={15}/></div>
        <nav>
          <div className="nav-label">Рабочая область</div>
          {nav.slice(0, 5).map(([label, Icon]) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => go(label)}><Icon size={18}/><span>{label}</span>{label === 'Заявки' && <em>7</em>}</button>)}
          <div className="nav-label">Создание</div>
          {nav.slice(5, 10).map(([label, Icon]) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => go(label)}><Icon size={18}/><span>{label}</span></button>)}
          <div className="nav-label">Система</div>
          <button className={active === 'Настройки' ? 'nav-item active' : 'nav-item'} onClick={() => go('Настройки')}><Settings size={18}/><span>Настройки</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="plan"><div className="plan-icon"><Sparkles size={16}/></div><div><b>Pro Studio</b><span>24 из 50 проектов</span></div></div>
          <div className="user"><div className="user-avatar">АК</div><div><b>Алексей</b><span>Владелец</span></div><MoreHorizontal size={17}/></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(v => !v)}><Menu size={21}/></button>
          <div className="crumb"><span>Nexora Studio</span><ChevronRight size={15}/><b>{active}</b></div>
          <div className="top-actions">
            <div className="search"><Search size={17}/><input placeholder="Поиск..." value={query} onChange={e => setQuery(e.target.value)}/><kbd>⌘ K</kbd></div>
            <button className="icon-btn"><Bell size={18}/><i/></button>
            <div className="top-avatar">АК</div>
          </div>
        </header>

        <div className="content">
          {active === 'Обзор' && !selectedProject && <Dashboard projects={filteredProjects} onCreate={() => setShowCreate(true)} onNavigate={go} onOpenProject={openProject}/>}
          {active === 'Проекты' && !selectedProject && <Projects projects={filteredProjects} onCreate={() => setShowCreate(true)} onOpenProject={openProject}/>}
          {active === 'Заявки' && <InboxPage leads={crm.leads} />}
          {active === 'Клиенты' && !selectedClient && <Clients clients={crm.clients} onOpenClient={openClient} />}
          {active === 'Клиенты' && selectedClient && <ClientWorkspace data={clientData} onBack={() => { setSelectedClient(null); setClientData(null) }} />}
          {active === 'Бронирования' && <Bookings bookings={crm.bookings} />}
          {active === 'Платежи' && <Payments payments={crm.payments} />}
          {active === 'Счета' && <Invoices invoices={crm.invoices} projects={projectData} />}
          {active === 'Заказы' && <Orders orders={orders} projects={projectData} />}
          {active === 'Сайты' && <Sites onCreate={() => setShowCreate(true)} />}
          {active === 'Mini Apps' && <MiniApps projects={projectData} onCreate={() => setShowCreate(true)} onOpenProject={openProject} />}
          {active === 'Аналитика' && <Analytics metrics={crm.analytics} />}
          {active === 'Интеграции' && <Integrations />}
          {active === 'Шаблоны' && <Templates onCreate={() => setShowCreate(true)} />}
          {active === 'Настройки' && !selectedProject && <SettingsPage />}
          {selectedProject && <ProjectWorkspace project={selectedProject} data={workspaceData} view={projectView} setView={setProjectView} onBack={() => { setSelectedProject(null); setWorkspaceData(null) }} onRefresh={async()=>setWorkspaceData(await api.project(selectedProject.id))} />}
        </div>
      </main>

      {showCreate && <CreateProject onClose={() => setShowCreate(false)} onCreate={createProject} />}
    </div>
  )
}

function Header({ eyebrow, title, description, action }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

function Dashboard({ projects, onCreate, onNavigate, onOpenProject }) {
  return <>
    <Header eyebrow="Среда студии" title="Доброе утро, Алексей 👋" description="Вот что происходит с вашими клиентскими проектами сегодня." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Новый проект</button>}/>
    <div className="metrics">
      <Metric title="Активные проекты" value="24" change="+12%" icon={FolderKanban}/>
      <Metric title="Новые заявки" value="37" change="+18%" icon={Inbox}/>
      <Metric title="Бронирования" value="18" change="+9%" icon={CalendarDays}/>
      <Metric title="Продажи" value="€4 820" change="+24%" icon={CircleDollarSign}/>
    </div>
    <div className="grid-main">
      <section className="card projects-card">
        <div className="card-head"><div><h2>Последние проекты</h2><span>Обновления по клиентским пространствам</span></div><button className="text-btn" onClick={() => onNavigate('Проекты')}>Все проекты <ArrowUpRight size={15}/></button></div>
        <ProjectTable projects={projects.slice(0, 4)} onOpenProject={onOpenProject}/>
      </section>
      <Activity />
    </div>
    <div className="quick"><div className="section-title"><div><h2>Быстрый старт</h2><span>Частые действия студии</span></div></div><div className="quick-grid">
      <Quick icon={Globe2} title="Создать сайт" text="Запустить проект из шаблона" onClick={onCreate}/><Quick icon={Smartphone} title="Создать Mini App" text="Каталог и заявки в Telegram" onClick={onCreate}/><Quick icon={Users} title="Добавить клиента" text="Создать карточку клиента" onClick={() => onNavigate('Клиенты')}/><Quick icon={BarChart3} title="Открыть аналитику" text="Посмотреть показатели" onClick={() => onNavigate('Аналитика')}/>
    </div></div>
  </>
}

function Metric({title,value,change,icon:Icon}) {
  return <div className="metric card"><div className="metric-top"><span>{title}</span><div className="metric-icon"><Icon size={17}/></div></div><div className="metric-value">{value}</div><div className="metric-foot"><b>{change}</b><span>к прошлому месяцу</span></div></div>
}

function ProjectTable({projects,onOpenProject}) {
  return <div className="table">{projects.map((p,i)=><button className="project-row project-row-button" key={p.id||p.name} onClick={() => onOpenProject?.(p)}><div className={`project-logo ${p.color}`}>{p.name.slice(0,1)}</div><div className="project-name"><b>{p.name}</b><span>{p.type}</span></div><span className={`status ${p.status === 'Опубликован' ? 'success' : p.status === 'В работе' ? 'working' : 'draft'}`}><i/>{p.status}</span><div className="project-stat"><b>{p.leads}</b><span>заявок</span></div><div className="project-stat"><b>{p.revenue}</b><span>выручка</span></div><span className="updated">{p.updated}</span><span className="row-more"><MoreHorizontal size={17}/></span></button>)}</div>
}

function Activity() {
  return <section className="card activity"><div className="card-head"><div><h2>Активность</h2><span>Последние события</span></div><button className="icon-btn"><MoreHorizontal size={17}/></button></div><div className="activity-list">{activities.map(([title,sub,time,type])=><div className="activity-item" key={title+time}><div className={`activity-icon ${type}`}>{type === 'lead' ? <Inbox size={15}/> : type === 'booking' ? <CalendarDays size={15}/> : type === 'site' ? <Globe2 size={15}/> : <CreditCard size={15}/>}</div><div><b>{title}</b><span>{sub}</span></div><time>{time}</time></div>)}</div></section>
}

function Quick({icon:Icon,title,text,onClick}) { return <button className="quick-card card" onClick={onClick}><div className="quick-icon"><Icon size={19}/></div><div><b>{title}</b><span>{text}</span></div><ChevronRight size={17}/></button> }

function Projects({projects,onCreate,onOpenProject}) { return <><Header eyebrow="Рабочая область" title="Проекты" description="Все сайты, Mini Apps и клиентские пространства студии." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Новый проект</button>}/><div className="filterbar"><button className="filter active">Все <b>24</b></button><button className="filter">Опубликованные <b>18</b></button><button className="filter">В работе <b>4</b></button><button className="filter">Черновики <b>2</b></button><button className="filter"><Filter size={15}/> Фильтры</button></div><section className="card projects-full"><ProjectTable projects={projects} onOpenProject={onOpenProject}/></section></> }

function InboxPage({leads=[]}) {
  const [items,setItems]=useState(leads)
  useEffect(()=>setItems(leads),[leads])
  const setStatus=async(id,status)=>{try{await api.updateLead(id,status);setItems(v=>v.map(x=>x.id===id?{...x,status}:x))}catch{window.alert('Не удалось изменить статус')}}
  const convert=async(id)=>{try{const r=await api.convertLead(id);setItems(v=>v.map(x=>x.id===id?{...x,status:'won'}:x));window.alert(r.existing?'Клиент уже существует':'Заявка превращена в клиента')}catch{window.alert('Не удалось создать клиента')}}
  return <><Header eyebrow="CRM" title="Заявки" description="Входящие обращения клиентов из сайтов и Mini Apps."/><div className="card inbox-list">{items.length===0?<div className="empty-editor"><Inbox size={24}/><b>Заявок пока нет</b><span>Новые обращения появятся здесь.</span></div>:items.map(l=><div className="inbox-row" key={l.id}><div className="inbox-avatar">{String(l.name||'?').slice(0,1)}</div><div className="inbox-main"><b>{l.name||'Без имени'}</b><span>{l.message||'Новое обращение'}</span></div><select value={l.status||'new'} onChange={e=>setStatus(l.id,e.target.value)}><option value="new">Новая</option><option value="in_progress">В работе</option><option value="won">Клиент</option><option value="lost">Закрыта</option></select><button className="filter" onClick={()=>convert(l.id)} disabled={l.status==='won'}>{l.status==='won'?'Клиент создан':'В клиента'}</button></div>)}</div></>
}

function Invoices({invoices=[],projects=[]}) {
  const fallback=[{id:'inv1',number:'INV-20261021-AB12CD',project_name:'Barber House',amount:85,currency:'EUR',status:'paid',description:'Стрижка + борода',due_date:'2026-10-28'},{id:'inv2',number:'INV-20261020-EF34GH',project_name:'Urban Fitness',amount:120,currency:'EUR',status:'sent',description:'Абонемент',due_date:'2026-10-27'}];
  const rows=invoices.length?invoices:fallback;
  const [filter,setFilter]=useState('all'),[items,setItems]=useState(rows),[creating,setCreating]=useState(false),[form,setForm]=useState({project_id:projects[0]?.id||'',amount:'',description:'',due_date:''});
  useEffect(()=>{setItems(invoices.length?invoices:fallback)},[invoices]);
  useEffect(()=>{if(!form.project_id&&projects[0]?.id)setForm(v=>({...v,project_id:projects[0].id}))},[projects,form.project_id]);
  const visible=filter==='all'?items:items.filter(x=>x.status===filter);
  const statusLabel={draft:'Черновик',sent:'Отправлен',paid:'Оплачен',overdue:'Просрочен',cancelled:'Отменён'};
  const create=async()=>{try{const r=await api.createInvoice({...form,amount:Number(form.amount),status:'draft'});setItems(v=>[r.invoice,...v]);setCreating(false);setForm(v=>({...v,amount:'',description:'',due_date:''}))}catch{window.alert('Не удалось создать счёт')}};
  const setStatus=async(id,status)=>{try{await api.updateInvoice(id,status);setItems(v=>v.map(x=>x.id===id?{...x,status}:x))}catch{window.alert('Не удалось изменить статус счёта')}};
  const total=items.filter(x=>x.status==='paid').reduce((sum,x)=>sum+Number(x.amount||0),0);
  return <><Header eyebrow="Финансы" title="Счета" description="Выставляйте счета клиентам и контролируйте оплату." action={<button className="primary" onClick={()=>setCreating(true)}><Plus size={17}/> Новый счёт</button>}/>
    <div className="metrics compact"><Metric title="Оплачено" value={new Intl.NumberFormat('ru-RU',{style:'currency',currency:'EUR'}).format(total)} change="по счетам" icon={CheckCircle2}/><Metric title="Всего" value={String(items.length)} change="счетов" icon={Receipt}/><Metric title="Ожидают" value={String(items.filter(x=>x.status==='sent').length)} change="отправлены клиентам" icon={Clock3}/><Metric title="Просрочено" value={String(items.filter(x=>x.status==='overdue').length)} change="требуют внимания" icon={CircleDollarSign}/></div>
    <section className="card calendar-card"><div className="card-head"><div><h2>Реестр счетов</h2><span>Счёт → клиент → оплата</span></div><div className="calendar-actions">{[['all','Все'],['draft','Черновики'],['sent','Отправлены'],['paid','Оплачены'],['overdue','Просрочены']].map(([id,label])=><button key={id} className={filter===id?'filter active':'filter'} onClick={()=>setFilter(id)}>{label}</button>)}</div></div>
      {visible.length===0?<div className="empty-editor"><Receipt size={24}/><b>Счетов пока нет</b><span>Создайте первый счёт для клиента.</span></div>:visible.map((x,i)=><div className="slot invoice-row" key={x.id||i}><div className="invoice-number"><b>{x.number}</b><span>{x.description||'Без описания'}</span></div><div className="invoice-project"><b>{x.project_name||'Проект'}</b><span>{x.due_date?'до '+new Date(x.due_date).toLocaleDateString('ru-RU'):''}</span></div><strong>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.amount||0))}</strong>{x.id&&<select className="booking-status" value={x.status||'draft'} onChange={e=>setStatus(x.id,e.target.value)}>{Object.entries(statusLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>}</div>)}</section>
    {creating&&<div className="modal-backdrop" onMouseDown={()=>setCreating(false)}><div className="modal card" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">Финансы</span><h2>Новый счёт</h2></div><button className="icon-btn" onClick={()=>setCreating(false)}><X size={18}/></button></div><div className="block-form"><label>Проект<select value={form.project_id} onChange={e=>setForm(v=>({...v,project_id:e.target.value}))}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Сумма<input type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm(v=>({...v,amount:e.target.value}))}/></label><label>Описание<input value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} placeholder="Например, абонемент"/></label><label>Срок оплаты<input type="date" value={form.due_date} onChange={e=>setForm(v=>({...v,due_date:e.target.value}))}/></label></div><div className="setting-actions"><button className="filter" onClick={()=>setCreating(false)}>Отмена</button><button className="primary" onClick={create} disabled={!form.project_id||!form.amount}>Создать счёт</button></div></div></div>}
  </>;
}

function Clients({clients=[],onOpenClient}){const rows=clients.length?clients:['Barber House','Nordic Beauty','Urban Fitness','Mokka Coffee','North Studio','Luna Dental'];return <><Header eyebrow="CRM" title="Клиенты" description="Управляйте клиентами и связанными проектами из одного места." action={<button className="primary"><Plus size={17}/> Добавить клиента</button>}/><div className="client-grid">{rows.map((x,i)=>{const name=typeof x==='string'?x:x.name;return <button className="card client-card client-card-button" key={x.id||x.name||x} onClick={()=>typeof x==='string'?null:onOpenClient?.(x)}><div className={`client-logo c${i}`}>{name.slice(0,1)}</div><div><h3>{name}</h3><span>{x.project_count||((i%2?'2':'3')+' проекта')} · {x.contact_count||i+2} контакта</span></div><span className="row-more"><MoreHorizontal size={17}/></span><div className="client-bottom"><span>Последняя активность</span><b>{i+1} дн. назад</b></div></button>})}</div></>}

function ClientWorkspace({data,onBack}){const c=data?.client||{};const leads=data?.leads||[],bookings=data?.bookings||[],payments=data?.payments||[],invoices=data?.invoices||[];const paid=payments.filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.amount||0),0);return <div className="client-workspace"><div className="workspace-head"><button className="filter" onClick={onBack}>← Клиенты</button><div className="workspace-title"><div className="client-logo c0">{String(c.name||'?').slice(0,1)}</div><div><h1>{c.name||'Клиент'}</h1><span>{c.email||'Без email'} · {c.phone||'Без телефона'}</span></div></div><div className="workspace-actions"><button className="primary"><Plus size={16}/> Действие</button></div></div><div className="metrics compact"><Metric title="Заявки" value={leads.length} change="история обращений" icon={Inbox}/><Metric title="Бронирования" value={bookings.length} change="записи клиента" icon={CalendarDays}/><Metric title="Оплачено" value={new Intl.NumberFormat('ru-RU',{style:'currency',currency:'EUR'}).format(paid)} change="по операциям" icon={CircleDollarSign}/><Metric title="Счета" value={invoices.length} change="выставлено" icon={Receipt}/></div><div className="client-detail-grid"><section className="card workspace-card"><div className="card-head"><div><h2>Активность</h2><span>Все взаимодействия с клиентом</span></div></div>{[...leads.map(x=>({kind:'Заявка',text:x.message||'Новое обращение',date:x.created_at})),...bookings.map(x=>({kind:'Бронирование',text:x.service_name||'Запись',date:x.starts_at})),...payments.map(x=>({kind:'Платёж',text:(x.description||'Оплата')+' · '+Number(x.amount||0)+' '+(x.currency||'EUR'),date:x.created_at}))].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,10).map((x,i)=><div className="client-activity" key={i}><div className="activity-icon"><CheckCircle2 size={15}/></div><div><b>{x.kind}</b><span>{x.text}</span></div><time>{x.date?new Date(x.date).toLocaleString('ru-RU'):''}</time></div>)}{!leads.length&&!bookings.length&&!payments.length&&<div className="empty-editor"><Users size={22}/><b>Активности пока нет</b><span>Связанные действия появятся здесь.</span></div>}</section><section className="card workspace-card"><div className="card-head"><div><h2>Связанные операции</h2><span>Счета и платежи</span></div></div><div className="client-op-list">{invoices.map(x=><div className="client-op" key={'i'+x.id}><span>Счёт</span><b>{x.number}</b><strong>{Number(x.amount||0).toLocaleString('ru-RU')} {x.currency||'EUR'}</strong></div>)}{payments.map(x=><div className="client-op" key={'p'+x.id}><span>Платёж</span><b>{x.description||'Оплата'}</b><strong>{Number(x.amount||0).toLocaleString('ru-RU')} {x.currency||'EUR'}</strong></div>)}{!invoices.length&&!payments.length&&<div className="empty-editor"><Receipt size={22}/><b>Операций пока нет</b></div>}</div></section></div></div>}

function Bookings({bookings=[]}){
  const fallback=[{customer_name:'Александр К.',starts_at:'2026-10-21T10:00:00',status:'confirmed',project_name:'Barber House',service_name:'Стрижка'},{customer_name:'Елена М.',starts_at:'2026-10-21T11:00:00',status:'pending',project_name:'Nordic Beauty',service_name:'Уход'},{customer_name:'Дмитрий П.',starts_at:'2026-10-21T13:00:00',status:'completed',project_name:'Urban Fitness',service_name:'Тренировка'}];
  const rows=bookings.length?bookings:fallback;
  const [filter,setFilter]=useState('all'),[items,setItems]=useState(rows);
  useEffect(()=>setItems(rows),[bookings]);
  const visible=filter==='all'?items:items.filter(x=>x.status===filter);
  const setStatus=async(id,status)=>{try{await api.updateBooking(id,status);setItems(v=>v.map(x=>x.id===id?{...x,status}:x))}catch{window.alert('Не удалось изменить статус бронирования')}};
  const labels={pending:'Новая',confirmed:'Подтверждено',completed:'Завершено',cancelled:'Отменено'};
  return <><Header eyebrow="Операции" title="Бронирования" description="Записи клиентов из всех подключённых проектов."/><div className="metrics compact"><Metric title="Все" value={String(items.length)} change="активные записи" icon={CalendarDays}/><Metric title="Новые" value={String(items.filter(x=>x.status==='pending').length)} change="ожидают подтверждения" icon={Clock3}/><Metric title="Подтверждено" value={String(items.filter(x=>x.status==='confirmed').length)} change="готовы к визиту" icon={CheckCircle2}/><Metric title="Завершено" value={String(items.filter(x=>x.status==='completed').length)} change="выполненные" icon={BarChart3}/></div><section className="card calendar-card"><div className="card-head"><div><h2>Расписание</h2><span>Управление статусами записей</span></div><div className="calendar-actions">{[['all','Все'],['pending','Новые'],['confirmed','Подтверждены'],['completed','Завершены'],['cancelled','Отменены']].map(([id,label])=><button key={id} className={filter===id?'filter active':'filter'} onClick={()=>setFilter(id)}>{label}</button>)}</div></div>{visible.length===0?<div className="empty-editor"><CalendarDays size={24}/><b>Записей нет</b><span>Для выбранного фильтра бронирований пока нет.</span></div>:visible.map((b,i)=><div className="slot" key={b.id||i}><time>{new Date(b.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</time><div className="booking-wrap"><Booking name={b.customer_name||'Клиент'} project={b.project_name||'Проект'} service={b.service_name} status={b.status}/>{b.id&&<select className="booking-status" value={b.status||'pending'} onChange={e=>setStatus(b.id,e.target.value)}><option value="pending">Новая</option><option value="confirmed">Подтверждено</option><option value="completed">Завершено</option><option value="cancelled">Отменено</option></select>}</div></div>)}</section></>
}

function Booking({name,project,service,status='pending'}){const labels={pending:'Новая',confirmed:'Подтверждено',completed:'Завершено',cancelled:'Отменено'};return <div className="booking"><b>{name}</b><span>{project}{service?' · '+service:''}</span><em className={status}>{labels[status]||status}</em></div>}

function Payments({payments=[]}){
  const fallback=[{id:'demo-pay-1',project_name:'Barber House',amount:85,currency:'EUR',status:'paid',description:'Стрижка + борода',created_at:'2026-10-21T12:10:00Z'},{id:'demo-pay-2',project_name:'Urban Fitness',amount:120,currency:'EUR',status:'paid',description:'Абонемент',created_at:'2026-10-20T16:30:00Z'}];
  const [items,setItems]=useState(payments.length?payments:fallback),[filter,setFilter]=useState('all');
  useEffect(()=>setItems(payments.length?payments:fallback),[payments]);
  const visible=filter==='all'?items:items.filter(x=>x.status===filter);
  const total=items.filter(x=>x.status==='paid').reduce((sum,x)=>sum+Number(x.amount||0),0);
  const fmt=x=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.amount||0));
  const setStatus=async(id,status)=>{try{await api.updatePayment(id,status);setItems(v=>v.map(x=>x.id===id?{...x,status}:x))}catch{window.alert('Не удалось изменить статус платежа')}};
  const labels={pending:'Ожидает',paid:'Оплачен',refunded:'Возврат',failed:'Ошибка'};
  return <><Header eyebrow="Финансы" title="Платежи" description="Оплаты, возвраты и финансовые операции клиентских проектов."/><div className="metrics compact"><Metric title="Получено" value={new Intl.NumberFormat('ru-RU',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(total)} change="оплаченные операции" icon={CircleDollarSign}/><Metric title="Операций" value={String(items.length)} change="всего" icon={CreditCard}/><Metric title="Ожидает" value={String(items.filter(x=>x.status==='pending').length)} change="к оплате" icon={Clock3}/><Metric title="Возвраты" value={String(items.filter(x=>x.status==='refunded').length)} change="операции" icon={BarChart3}/></div><section className="card calendar-card"><div className="card-head"><div><h2>Операции</h2><span>Платежи по всем проектам</span></div><div className="calendar-actions">{[['all','Все'],['pending','Ожидают'],['paid','Оплачены'],['refunded','Возвраты'],['failed','Ошибки']].map(([id,label])=><button key={id} className={filter===id?'filter active':'filter'} onClick={()=>setFilter(id)}>{label}</button>)}</div></div>{visible.length===0?<div className="empty-editor"><CreditCard size={24}/><b>Операций нет</b><span>Платежи появятся после первой оплаты.</span></div>:<div className="inbox-list">{visible.map((p,i)=><div className="inbox-row" key={p.id||i}><div className="inbox-avatar"><CreditCard size={17}/></div><div className="inbox-main"><b>{p.project_name||'Проект'}</b><span>{p.description||'Оплата'} · {new Date(p.created_at).toLocaleString('ru-RU')}</span></div><strong>{fmt(p)}</strong><span className={'status '+(p.status==='paid'?'success':p.status==='refunded'?'draft':'working')}><i/>{labels[p.status]||p.status}</span>{p.id&&<select value={p.status||'pending'} onChange={e=>setStatus(p.id,e.target.value)}><option value="pending">Ожидает</option><option value="paid">Оплачен</option><option value="refunded">Возврат</option><option value="failed">Ошибка</option></select>}</div>)}</div>}</section></>
}

function Orders({orders=[],projects=[]}){const fallback=[];const rows=orders.length?orders:fallback;const [filter,setFilter]=useState('all'),[items,setItems]=useState(rows);useEffect(()=>setItems(orders.length?orders:fallback),[orders]);const visible=filter==='all'?items:items.filter(x=>x.status===filter);const labels={pending:'Новый',paid:'Оплачен',cancelled:'Отменён',refunded:'Возврат'};const setStatus=async(id,status)=>{try{await api.updateOrder(id,status);setItems(v=>v.map(x=>x.id===id?{...x,status}:x))}catch{window.alert('Не удалось изменить статус заказа')}};const markPaid=async(order)=>{try{await api.createPayment({project_id:order.project_id,client_id:order.client_id||null,order_id:order.id,amount:Number(order.total||0),currency:order.currency||'EUR',status:'paid',description:'Заказ '+order.number});await api.updateOrder(order.id,'paid');setItems(v=>v.map(x=>x.id===order.id?{...x,status:'paid'}:x))}catch{window.alert('Не удалось зарегистрировать оплату')}};const total=items.filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.total||0),0);return <><Header eyebrow="Продажи" title="Заказы" description="Заказы из каталогов сайтов и Mini Apps."/><div className="metrics compact"><Metric title="Заказы" value={items.length} change="всего" icon={ShoppingCart}/><Metric title="Оплачено" value={new Intl.NumberFormat('ru-RU',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(total)} change="выручка заказов" icon={CircleDollarSign}/><Metric title="Новые" value={items.filter(x=>x.status==='pending').length} change="ожидают оплаты" icon={Clock3}/><Metric title="Средний чек" value={items.length?new Intl.NumberFormat('ru-RU',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(items.reduce((s,x)=>s+Number(x.total||0),0)/items.length):'€0'} change="по всем заказам" icon={Receipt}/></div><section className="card calendar-card"><div className="card-head"><div><h2>Реестр заказов</h2><span>Каталог → заказ → клиент → платёж</span></div><div className="calendar-actions">{[['all','Все'],['pending','Новые'],['paid','Оплачены'],['cancelled','Отменены'],['refunded','Возвраты']].map(([id,label])=><button key={id} className={filter===id?'filter active':'filter'} onClick={()=>setFilter(id)}>{label}</button>)}</div></div>{visible.length===0?<div className="empty-editor"><ShoppingCart size={24}/><b>Заказов пока нет</b><span>Заказы появятся после оформления покупки в сайте или Mini App.</span></div>:visible.map(x=><div className="slot invoice-row" key={x.id}><div className="invoice-number"><b>{x.number}</b><span>{(x.items||[]).map(i=>i.name+' × '+i.quantity).join(', ')}</span></div><div className="invoice-project"><b>{x.project_name||'Проект'}</b><span>{x.client_name||'Без клиента'}</span></div><strong>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.total||0))}</strong><select className="booking-status" value={x.status||'pending'} onChange={e=>setStatus(x.id,e.target.value)}>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>{x.status==='pending'&&<button className="filter active" onClick={()=>markPaid(x)}>Принять оплату</button>}</div>)}</section></>}

function Sites({onCreate}){return <><Header eyebrow="Публикация" title="Сайты" description="Публичные сайты клиентов и их домены." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Создать сайт</button>}/><div className="site-grid">{projects.filter(p=>p.type.includes('Сайт')).map((p,i)=><div className="card site-card" key={p.name}><div className={`site-preview p${i}`}><div className="preview-bar"><span/><span/><span/></div><div className="preview-content"><strong>{p.name}</strong><small>Современный сайт бизнеса</small></div></div><div className="site-info"><div><h3>{p.name}</h3><span>{p.name.toLowerCase().replaceAll(' ','')}.nexora.site</span></div><span className="status success"><i/> Опубликован</span></div><div className="site-actions"><button className="filter"><ExternalLink size={14}/> Открыть</button><button className="filter">Редактор</button></div></div>)}</div></>}

function MiniApps({projects=[],onCreate,onOpenProject}){const items=projects.filter(p=>String(p.type||'').includes('Mini App'));return <><Header eyebrow="Telegram" title="Mini Apps" description="Мини-приложения для клиентов внутри Telegram." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Создать Mini App</button>}/><div className="mini-hero card"><div className="mini-copy"><span className="pill"><Bot size={14}/> Telegram Web App</span><h2>Каталог, заявки и бронирования — прямо в Telegram</h2><p>Подключайте Mini App к проекту, настраивайте каталог и подключайте бота из настроек конкретного проекта.</p><div className="mini-buttons"><button className="primary" onClick={onCreate}><Send size={16}/> Создать Mini App</button><button className="filter" onClick={()=>items[0]&&onOpenProject?.(items[0])}>Открыть проект</button></div></div><div className="phone"><div className="phone-top">Telegram <span>•••</span></div><div className="phone-body"><div className="tg-logo">N</div><b>{items[0]?.name||'Ваш проект'}</b><span>Онлайн-запись</span><button>Записаться</button><div className="phone-card">Услуги <b>каталог</b></div><div className="phone-card">Бронирования <b>онлайн</b></div></div></div></div><div className="mini-list">{items.length?items.map((x,i)=><div className="card mini-row" key={x.id||x.name}><div className="mini-icon"><Smartphone size={18}/></div><div><b>{x.name}</b><span>{x.status==='Опубликован'?'Готов к публикации':'Черновик'} · Mini App</span></div><span className={x.status==='Опубликован'?'status success':'status draft'}><i/>{x.status==='Опубликован'?'Опубликован':'Черновик'}</span><button className="filter" onClick={()=>onOpenProject?.(x)}>Открыть</button></div>):<div className="card empty-editor"><Smartphone size={24}/><b>Mini Apps пока нет</b><span>Создайте проект типа «Telegram Mini App» или «Сайт + Mini App».</span></div>}</div></>}

function Analytics({metrics}){const m=metrics||{visits:0,leads:0,bookings:0,revenue:0,series:[]};const series=m.series||[];const max=Math.max(1,...series.map(x=>Number(x.revenue||0)));const visitToLead=m.visits?((m.leads/m.visits)*100).toFixed(1):'0.0';const leadToBooking=m.leads?((m.bookings/m.leads)*100).toFixed(1):'0.0';const bookingToPayment=m.bookings&&m.revenue?Math.min(100,(m.revenue>0?100:0)).toFixed(1):'0.0';return <><Header eyebrow="Отчёты" title="Аналитика" description="Показатели студии и клиентских проектов в одном отчёте." action={<button className="filter">Последние 30 дней ▾</button>}/><div className="metrics"><Metric title="Посещения" value={Number(m.visits||0).toLocaleString('ru-RU')} change="за 30 дней" icon={Globe2}/><Metric title="Заявки" value={Number(m.leads||0).toLocaleString('ru-RU')} change="за 30 дней" icon={Inbox}/><Metric title="Бронирования" value={Number(m.bookings||0).toLocaleString('ru-RU')} change="за 30 дней" icon={CalendarDays}/><Metric title="Выручка" value={new Intl.NumberFormat('ru-RU',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(m.revenue||0))} change="оплаченные" icon={CircleDollarSign}/></div><div className="analytics-grid"><section className="card chart-card"><div className="card-head"><div><h2>Динамика</h2><span>Реальные события за последние 30 дней</span></div></div><div className="analytics-bars">{(series.length?series:[{day:'Нет данных',visits:0,leads:0,bookings:0,revenue:0}]).slice(-14).map((x,i)=><div className="analytics-bar" key={x.day+i}><div className="analytics-bar-stack"><i style={{height:(Number(x.revenue||0)/max*100)+'%'}}/></div><span>{x.day==='Нет данных'?'—':new Date(x.day).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})}</span></div>)}</div></section><section className="card funnel-card"><div className="card-head"><div><h2>Конверсия</h2><span>Путь клиента по воронке</span></div></div><div className="funnel-row"><b>Посещение → заявка</b><strong>{visitToLead}%</strong></div><div className="funnel-row"><b>Заявка → бронирование</b><strong>{leadToBooking}%</strong></div><div className="funnel-row"><b>Бронирование → оплата</b><strong>{bookingToPayment}%</strong></div><div className="analytics-note">Конверсия считается по агрегированным данным студии за выбранный период.</div></section></div></>}

function Integrations(){const items=[['Telegram','Заявки, уведомления и Mini Apps','Подключено',Send],['Payments','Оплата и статусы заказов','Подключить',CreditCard],['Analytics','События и конверсии','Подключено',BarChart3],['Domains','Домены и SSL','Подключено',Globe2],['CRM','Синхронизация клиентов','Подключить',Users],['Webhooks','Внешние автоматизации','Подключить',Zap]];return <><Header eyebrow="Экосистема" title="Интеграции" description="Подключайте сервисы, которые расширяют возможности Nexora."/><div className="integration-grid">{items.map(([name,desc,status,Icon])=><div className="card integration" key={name}><div className="integration-icon"><Icon size={20}/></div><div><h3>{name}</h3><span>{desc}</span></div><button className={status==='Подключено'?'connected':'filter'}>{status}</button></div>)}</div></>}

function Templates({onCreate}){const templates=[['barber','Barber','Барбершоп','dark'],['beauty','Beauty','Салон красоты','blue'],['fitness','Fitness','Фитнес-студия','purple'],['restaurant','Restaurant','Ресторан','orange'],['coffee','Coffee','Кофейня','green'],['dental','Dental','Стоматология','pink']];return <><Header eyebrow="Библиотека" title="Шаблоны" description="Готовые стартовые проекты с готовыми страницами, блоками и каталогом."/><div className="template-grid">{templates.map(([id,name,desc,color])=><div className="card template" key={id}><div className={`template-preview ${color}`}><span>{name}</span><div className="template-lines"><i/><i/><i/></div></div><div className="template-info"><div><h3>{name}</h3><span>{desc} · страницы + каталог</span></div><button className="filter" onClick={()=>onCreate('site',id)}>Использовать</button></div></div>)}</div></>}

function SettingsPage(){return <><Header eyebrow="Рабочее пространство" title="Настройки" description="Брендинг, участники, уведомления и параметры студии."/><div className="settings-layout"><div className="settings-nav card">{['Профиль студии','Брендинг','Участники','Уведомления','Интеграции','Безопасность','Тариф и оплата'].map((x,i)=><button className={i===0?'selected':''} key={x}>{x}</button>)}</div><section className="card settings-form"><div className="setting-block"><h2>Профиль студии</h2><span>Основная информация рабочего пространства.</span><label>Название студии<input value="Nexora Studio" readOnly/></label><label>Рабочий email<input value="studio@nexora.local" readOnly/></label><label>Часовой пояс<select defaultValue="Europe/Helsinki"><option>Europe/Helsinki</option><option>Europe/Moscow</option><option>Europe/Berlin</option></select></label></div><div className="setting-block"><h2>Внешний вид</h2><span>Настройте стиль панели и клиентских проектов.</span><div className="theme-options"><button className="theme active"><span/>Светлая</button><button className="theme"><span/>Тёмная</button><button className="theme"><span/>Системная</button></div></div><div className="setting-actions"><button className="filter">Отменить</button><button className="primary">Сохранить изменения</button></div></section></div></>}

function CatalogManager({projectId}){
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [editing,setEditing]=useState(null)
  const [form,setForm]=useState({name:'',description:'',price:'',currency:'EUR',active:true})
  const load=async()=>{setLoading(true);try{const r=await api.catalog(projectId);setItems(r.items||[])}finally{setLoading(false)}}
  useEffect(()=>{load()},[projectId])
  const reset=()=>{setEditing(null);setForm({name:'',description:'',price:'',currency:'EUR',active:true})}
  const save=async()=>{
    if(!form.name.trim()) return
    setSaving(true)
    try{
      if(editing) await api.updateCatalogItem(projectId,editing,form)
      else await api.createCatalogItem(projectId,form)
      reset(); await load()
    }finally{setSaving(false)}
  }
  const edit=(item)=>{setEditing(item.id);setForm({name:item.name||'',description:item.description||'',price:item.price??'',currency:item.currency||'EUR',active:item.active!==false})}
  const remove=async(id)=>{if(!window.confirm('Удалить позицию из каталога?'))return;await api.deleteCatalogItem(projectId,id);setItems(v=>v.filter(x=>x.id!==id));if(editing===id)reset()}
  return <div className="catalog-layout">
    <section className="card workspace-card">
      <div className="card-head"><div><h2>Каталог</h2><span>{items.length} позиций · данные доступны сайту и Mini App</span></div><button className="filter" onClick={reset}>Новая позиция</button></div>
      {loading?<div className="empty-editor"><span>Загружаем каталог…</span></div>:items.length===0?<div className="empty-editor"><Layers3 size={24}/><b>Каталог пока пуст</b><span>Добавьте первую услугу или товар справа.</span></div>:
      <div className="catalog-list">{items.map(item=><div className="catalog-row" key={item.id}><div className="catalog-thumb">{item.name.slice(0,1)}</div><div className="catalog-main"><b>{item.name}</b><span>{item.description||'Без описания'}</span></div><div className="catalog-price">{item.price!=null?new Intl.NumberFormat('ru-RU',{style:'currency',currency:item.currency||'EUR'}).format(Number(item.price)):'Цена по запросу'}</div><span className={item.active?'status success':'status draft'}><i/>{item.active?'Активна':'Скрыта'}</span><div className="catalog-actions"><button className="filter" onClick={()=>edit(item)}>Изменить</button><button className="row-more" onClick={()=>remove(item.id)}><X size={16}/></button></div></div>)}</div>}
    </section>
    <section className="card workspace-card catalog-form">
      <div className="eyebrow">{editing?'Редактирование':'Новая позиция'}</div><h3>{editing?'Изменить позицию':'Добавить в каталог'}</h3>
      <label className="workspace-label">Название<input value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} placeholder="Например, Стрижка"/></label>
      <label className="workspace-label">Описание<textarea value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} placeholder="Короткое описание услуги или товара"/></label>
      <div className="catalog-form-grid"><label className="workspace-label">Цена<input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm(v=>({...v,price:e.target.value}))} placeholder="35"/></label><label className="workspace-label">Валюта<select value={form.currency} onChange={e=>setForm(v=>({...v,currency:e.target.value}))}><option>EUR</option><option>USD</option><option>RUB</option></select></label></div>
      <label className="catalog-check"><input type="checkbox" checked={form.active} onChange={e=>setForm(v=>({...v,active:e.target.checked}))}/> Показывать клиентам</label>
      <div className="setting-actions"><button className="filter" onClick={reset}>Очистить</button><button className="primary" onClick={save} disabled={saving}>{saving?'Сохраняем…':editing?'Сохранить':'Добавить'}</button></div>
    </section>
  </div>
}

function ProjectWorkspace({project,data,view,setView,onBack,onRefresh}) {
  const current=data?.project||project, pages=data?.pages||[];
  const [saving,setSaving]=useState(false), [name,setName]=useState(''), [domain,setDomain]=useState('');
  const [tg,setTg]=useState({enabled:false,configured:false,botUsername:'',buttonText:'Открыть Mini App',url:''});
  const [telegramBusy,setTelegramBusy]=useState(false);
  const [analytics,setAnalytics]=useState(null);
  const [pageId,setPageId]=useState(null), [blocks,setBlocks]=useState([]);
  const page=pages.find(p=>p.id===pageId)||pages[0];
  useEffect(()=>{
    setName(current.name||''); setDomain(current.domain||'');
    const mini=current.settings?.miniApp||{};
    setTg({enabled:mini.enabled===true || String(current.project_type||'').includes('miniapp'),configured:mini.configured===true,botUsername:mini.botUsername||'',buttonText:mini.buttonText||'Открыть Mini App',url:mini.url||''});
    const p=pages.find(x=>x.id===pageId)||pages[0];
    if(p){setPageId(p.id);setBlocks(p.content?.blocks||[])}
  },[current.id,current.name,current.domain,pages.length,pageId,JSON.stringify(current.settings||{})]);

  useEffect(()=>{api.projectAnalytics(current.id).then(r=>setAnalytics(r.metrics||null)).catch(()=>setAnalytics(null))},[current.id]);

  const updateBlock=(index,patch)=>setBlocks(v=>v.map((b,i)=>i===index?{...b,...patch}:b));
  const addBlock=(type)=>{
    const defaults={
      hero:{type:'hero',headline:'Ваш бизнес. Онлайн.',subheadline:'Понятный цифровой опыт для ваших клиентов.',cta:'Оставить заявку'},
      services:{type:'services',title:'Услуги',items:['Основная услуга','Популярная услуга','Премиум услуга']},
      contacts:{type:'contacts',title:'Контакты',text:'Свяжитесь с нами удобным способом.'}
    };
    setBlocks(v=>[...v,defaults[type]]);
  };
  const removeBlock=(index)=>setBlocks(v=>v.filter((_,i)=>i!==index));
  const moveBlock=(index,dir)=>setBlocks(v=>{const n=index+dir;if(n<0||n>=v.length)return v;const a=[...v];[a[index],a[n]]=[a[n],a[index]];return a});
  const saveEditor=async()=>{
    if(!page)return;
    setSaving(true);
    try{await api.updatePage(current.id,page.id,{content:{blocks}});await onRefresh()}
    finally{setSaving(false)}
  };
  const saveSettings=async()=>{setSaving(true);try{await api.updateProject(current.id,{name,domain,settings:{miniApp:{enabled:tg.enabled,buttonText:tg.buttonText}}});await onRefresh()}finally{setSaving(false)}};
  const configureTelegram=async()=>{setTelegramBusy(true);try{const result=await api.configureTelegram(current.id,{button_text:tg.buttonText});setTg(v=>({...v,enabled:true,configured:true,botUsername:result.bot?.username||v.botUsername,url:result.url||v.url}));await onRefresh();window.alert('Telegram Mini App подключён к боту @'+(result.bot?.username||'bot'))}catch(error){window.alert(error.message||'Не удалось подключить Telegram')}finally{setTelegramBusy(false)}};
  const publish=async()=>{setSaving(true);try{await api.publishProject(current.id);await onRefresh()}finally{setSaving(false)}};

  return <div className="workspace-page">
    <div className="workspace-head">
      <button className="filter" onClick={onBack}>← Проекты</button>
      <div className="workspace-title"><div className="project-logo dark">{current.name?.slice(0,1)}</div><div><b>{current.name}</b><span>{current.project_type||'website'} · {current.status==='published'?'Опубликован':'Черновик'}</span></div></div>
      <div className="workspace-actions"><button className="filter" onClick={()=>setView('preview')}><ExternalLink size={14}/> Предпросмотр</button><button className="primary" onClick={publish} disabled={saving}><Globe2 size={15}/> Опубликовать</button></div>
    </div>
    <div className="workspace-tabs">{[['overview','Обзор'],['pages','Страницы'],['catalog','Каталог'],['editor','Редактор'],['preview','Предпросмотр'],['settings','Настройки']].map(([id,label])=><button key={id} className={view===id?'selected':''} onClick={()=>setView(id)}>{label}</button>)}</div>

    {view==='overview'&&<div className="workspace-grid">
      <div className="card workspace-card"><div className="eyebrow">Проект</div><h2>Центр управления клиентским проектом</h2><p>Сайт, Mini App, контент, публикация и настройки клиента управляются из одного рабочего пространства.</p><div className="workspace-stat-grid"><div><b>{pages.length}</b><span>страниц</span></div><div><b>{current.status==='published'?'Опубликован':'Черновик'}</b><span>статус</span></div><div><b>{domain||'Не подключен'}</b><span>домен</span></div><div><b>{analytics?.visits??'—'}</b><span>визиты · 30 дней</span></div></div></div>
      <div className="card workspace-card"><h3>Следующие шаги</h3><button className="workspace-step" onClick={()=>setView('pages')}><Globe2 size={17}/><span><b>Настроить страницы</b><small>Создать структуру сайта</small></span><ChevronRight size={16}/></button><button className="workspace-step" onClick={()=>setView('editor')}><Palette size={17}/><span><b>Открыть редактор</b><small>Собрать страницу из блоков</small></span><ChevronRight size={16}/></button><button className="workspace-step" onClick={publish}><CheckCircle2 size={17}/><span><b>Опубликовать</b><small>Сделать проект доступным</small></span><ChevronRight size={16}/></button></div>
    </div>}

    {view==='pages'&&<div className="card workspace-card"><div className="card-head"><div><h2>Страницы</h2><span>Структура сайта</span></div><button className="primary" onClick={async()=>{await api.createPage(current.id,{title:'Новая страница',slug:'new-page'});await onRefresh()}}><Plus size={15}/> Новая страница</button></div>{pages.map(p=><div className="page-row" key={p.id}><div className="page-icon"><Globe2 size={16}/></div><div><b>{p.title}</b><span>/{p.slug}</span></div><span className={p.published?'status success':'status draft'}><i/>{p.published?'Опубликована':'Черновик'}</span><button className="filter" onClick={()=>{setPageId(p.id);setBlocks(p.content?.blocks||[]);setView('editor')}}>Редактировать</button></div>)}</div>}

    {view==='catalog'&&<CatalogManager projectId={current.id}/>}

     {view==='editor'&&<div className="editor-layout">
      <aside className="card editor-sidebar"><div className="eyebrow">Редактор</div><h3>{page?.title||'Главная'}</h3><p>Добавляйте и перестраивайте секции страницы.</p>
        <button className="editor-add" onClick={()=>addBlock('hero')}><Palette size={15}/> Первый экран <Plus size={14}/></button>
        <button className="editor-add" onClick={()=>addBlock('services')}><Layers3 size={15}/> Услуги / каталог <Plus size={14}/></button>
        <button className="editor-add" onClick={()=>addBlock('contacts')}><Users size={15}/> Контакты / CTA <Plus size={14}/></button>
        <div className="editor-hint">Изменения сохраняются в выбранной странице. Порядок блоков можно менять стрелками.</div>
      </aside>
      <section className="card editor-canvas"><div className="editor-toolbar"><div><b>{page?.title||'Главная'}</b><span>{blocks.length} блоков</span></div><button className="primary" onClick={saveEditor} disabled={saving}>{saving?'Сохраняем…':'Сохранить'}</button></div>
        <div className="editor-stack">{blocks.length===0&&<div className="empty-editor"><Palette size={24}/><b>Страница пока пустая</b><span>Добавьте первый блок слева.</span></div>}
        {blocks.map((b,i)=><div className="editable-block" key={i}>
          <div className="block-controls"><span>{i+1}</span><b>{b.type==='hero'?'Первый экран':b.type==='services'?'Услуги':'Контакты'}</b><button onClick={()=>moveBlock(i,-1)} disabled={i===0}>↑</button><button onClick={()=>moveBlock(i,1)} disabled={i===blocks.length-1}>↓</button><button onClick={()=>removeBlock(i)}>Удалить</button></div>
          {b.type==='hero'&&<div className="block-form"><label>Заголовок<input value={b.headline||''} onChange={e=>updateBlock(i,{headline:e.target.value})}/></label><label>Подзаголовок<textarea value={b.subheadline||''} onChange={e=>updateBlock(i,{subheadline:e.target.value})}/></label><label>Кнопка<input value={b.cta||''} onChange={e=>updateBlock(i,{cta:e.target.value})}/></label></div>}
          {b.type==='services'&&<div className="block-form"><label>Заголовок<input value={b.title||''} onChange={e=>updateBlock(i,{title:e.target.value})}/></label><label>Услуги<textarea value={(b.items||[]).join('\n')} onChange={e=>updateBlock(i,{items:e.target.value.split('\n').filter(Boolean)})}/></label></div>}
          {b.type==='contacts'&&<div className="block-form"><label>Заголовок<input value={b.title||''} onChange={e=>updateBlock(i,{title:e.target.value})}/></label><label>Текст<textarea value={b.text||''} onChange={e=>updateBlock(i,{text:e.target.value})}/></label></div>}
        </div>)}</div>
      </section>
    </div>}

    {view==='preview'&&<div className="card preview-shell"><div className="preview-top"><b>{current.name}</b><span>{domain||'preview.nexora.site'}</span></div><div className="public-preview">{blocks.map((b,i)=><div key={i} className={b.type==='hero'?'preview-hero':'preview-section'}>{b.type==='hero'?<><small>ПРЕДПРОСМОТР</small><h1>{b.headline}</h1><p>{b.subheadline}</p><button>{b.cta}</button></>:b.type==='services'?<><span>{b.title}</span><div className="preview-services">{(b.items||[]).map(x=><b key={x}>{x}</b>)}</div></>:<><h2>{b.title}</h2><p>{b.text}</p></>}</div>)}{!blocks.length&&<div className="empty-editor"><b>Нет блоков</b><span>Добавьте блоки в редакторе.</span></div>}</div></div>}

    {view==='settings'&&<div className="workspace-settings">
      <div className="card workspace-card"><div className="eyebrow">Настройки проекта</div><h2>Основные параметры</h2><label className="workspace-label">Название проекта<input value={name} onChange={e=>setName(e.target.value)}/></label><label className="workspace-label">Домен<input placeholder="client.ru" value={domain} onChange={e=>setDomain(e.target.value)}/></label><div className="setting-actions"><button className="primary" onClick={saveSettings} disabled={saving}>{saving?'Сохраняем…':'Сохранить'}</button></div></div>
      <div className="card workspace-card telegram-settings"><div className="eyebrow">Telegram</div><div className="setting-title-row"><div><h2>Mini App</h2><p>Открывается прямо из меню Telegram-бота и использует каталог, заявки и бронирования проекта.</p></div><label className="toggle"><input type="checkbox" checked={tg.enabled} onChange={e=>setTg(v=>({...v,enabled:e.target.checked}))}/><span></span></label></div>
        <div className="telegram-status"><span className={tg.configured?'status success':'status draft'}><i/>{tg.configured?'Подключён':'Не подключён'}</span>{tg.botUsername&&<b>@{tg.botUsername}</b>}</div>
        <label className="workspace-label">Текст кнопки в Telegram<input maxLength="64" value={tg.buttonText} onChange={e=>setTg(v=>({...v,buttonText:e.target.value}))}/></label>
        {tg.url&&<label className="workspace-label">URL Mini App<input readOnly value={tg.url}/></label>}
        <div className="setting-actions"><button className="filter" onClick={saveSettings} disabled={saving}>Сохранить настройки</button><button className="primary" onClick={configureTelegram} disabled={telegramBusy || !tg.enabled}>{telegramBusy?'Подключаем…':'Подключить к Telegram'}</button></div>
        <small className="settings-note">Токен бота хранится только на сервере. Если TELEGRAM_BOT_TOKEN ещё не задан, подключение вернёт понятную ошибку.</small>
      </div>
    </div>}
  </div>
}

function CreateProject({onClose,onCreate}){return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal card" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">Новый проект</span><h2>Что создаём?</h2></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div><div className="create-options"><button onClick={() => onCreate("site")}><div><Globe2 size={20}/></div><b>Сайт</b><span>Запустить сайт из шаблона</span><ChevronRight size={17}/></button><button onClick={() => onCreate("miniapp")}><div><Smartphone size={20}/></div><b>Telegram Mini App</b><span>Каталог, заявки и бронирования</span><ChevronRight size={17}/></button><button onClick={() => onCreate("site_miniapp")}><div><Layers3 size={20}/></div><b>Сайт + Mini App</b><span>Полный клиентский проект</span><ChevronRight size={17}/></button></div></div></div>}
 
createRoot(document.getElementById('root')).render(<Root />)
