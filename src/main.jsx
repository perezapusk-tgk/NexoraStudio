import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import {
  LayoutDashboard, FolderKanban, Inbox, Users, CalendarDays, Globe2,
  Smartphone, BarChart3, Plug, Zap, Settings, Plus, Search, Bell,
  ArrowUpRight, MoreHorizontal, ChevronRight, CheckCircle2, Clock3,
  CircleDollarSign, ExternalLink, Filter, Send, CreditCard, Palette,
  ShieldCheck, Bot, Sparkles, X, Menu, LogOut, UserRound, Layers3
} from 'lucide-react'
import './styles.css'

const nav = [
  ['Обзор', LayoutDashboard],
  ['Проекты', FolderKanban],
  ['Заявки', Inbox],
  ['Клиенты', Users],
  ['Бронирования', CalendarDays],
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

function App() {
  const [active, setActive] = useState('Обзор')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [projectData, setProjectData] = useState(projects)
  const [apiState, setApiState] = useState('loading')
  const [crm, setCrm] = useState({ leads: [], clients: [], bookings: [], analytics: null })
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectView, setProjectView] = useState('overview')
  const [workspaceData, setWorkspaceData] = useState(null)

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
    Promise.allSettled([api.leads(), api.clients(), api.bookings(), api.analytics()]).then(([leads, clients, bookings, analytics]) => {
      if (!alive) return
      setCrm({
        leads: leads.status === 'fulfilled' ? (leads.value.leads || []) : [],
        clients: clients.status === 'fulfilled' ? (clients.value.clients || []) : [],
        bookings: bookings.status === 'fulfilled' ? (bookings.value.bookings || []) : [],
        analytics: analytics.status === 'fulfilled' ? analytics.value.metrics : null
      })
    })
    return () => { alive = false }
  }, [])

  const createProject = async (projectType) => {
    const name = window.prompt('Название проекта')
    if (!name?.trim()) return
    try {
      const created = await api.createProject({ name: name.trim(), projectType })
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
    setActive(item); setSelectedProject(null); setProjectView('overview'); setWorkspaceData(null); setMobileOpen(false)
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
          {active === 'Клиенты' && <Clients clients={crm.clients} />}
          {active === 'Бронирования' && <Bookings bookings={crm.bookings} />}
          {active === 'Сайты' && <Sites onCreate={() => setShowCreate(true)} />}
          {active === 'Mini Apps' && <MiniApps />}
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
  return <div className="table">{projects.map((p,i)=><button className="project-row project-row-button" key={p.id||p.name} onClick={() => onOpenProject?.(p)}><div className={`project-logo ${p.color}`}>{p.name.slice(0,1)}</div><div className="project-name"><b>{p.name}</b><span>{p.type}</span></div><span className={`status ${p.status === 'Опубликован' ? 'success' : p.status === 'В работе' ? 'working' : 'draft'}`}><i/>{p.status}</span><div className="project-stat"><b>{p.leads}</b><span>заявок</span></div><div className="project-stat"><b>{p.revenue}</b><span>выручка</span></div><span className="updated">{p.updated}</span><button className="row-more"><MoreHorizontal size={17}/></button></button>)}</div>
}

function Activity() {
  return <section className="card activity"><div className="card-head"><div><h2>Активность</h2><span>Последние события</span></div><button className="icon-btn"><MoreHorizontal size={17}/></button></div><div className="activity-list">{activities.map(([title,sub,time,type])=><div className="activity-item" key={title+time}><div className={`activity-icon ${type}`}>{type === 'lead' ? <Inbox size={15}/> : type === 'booking' ? <CalendarDays size={15}/> : type === 'site' ? <Globe2 size={15}/> : <CreditCard size={15}/>}</div><div><b>{title}</b><span>{sub}</span></div><time>{time}</time></div>)}</div></section>
}

function Quick({icon:Icon,title,text,onClick}) { return <button className="quick-card card" onClick={onClick}><div className="quick-icon"><Icon size={19}/></div><div><b>{title}</b><span>{text}</span></div><ChevronRight size={17}/></button> }

function Projects({projects,onCreate,onOpenProject}) { return <><Header eyebrow="Рабочая область" title="Проекты" description="Все сайты, Mini Apps и клиентские пространства студии." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Новый проект</button>}/><div className="filterbar"><button className="filter active">Все <b>24</b></button><button className="filter">Опубликованные <b>18</b></button><button className="filter">В работе <b>4</b></button><button className="filter">Черновики <b>2</b></button><button className="filter"><Filter size={15}/> Фильтры</button></div><section className="card projects-full"><ProjectTable projects={projects} onOpenProject={onOpenProject}/></section></> }

function InboxPage({leads=[]}){const fallback=[['Марина Соколова','Хочу записаться на стрижку','Barber House','только что'],['Иван Петров','Есть ли свободное окно в субботу?','Urban Fitness','12 мин назад'],['Анна Лебедева','Интересует абонемент','Urban Fitness','38 мин назад'],['Михаил Орлов','Нужен сайт для кофейни','Nexora Studio','1 ч назад']]; const rows = leads.length ? leads.map(l => [l.name, l.message, l.project_name || 'Проект', l.status]) : fallback; return <><Header eyebrow="CRM" title="Заявки" description="Единый вход для обращений со всех сайтов и Mini Apps." action={<button className="primary"><Plus size={17}/> Новая заявка</button>}/><div className="inbox-layout"><section className="card"><div className="card-head"><div><h2>Входящие</h2><span>7 новых обращений</span></div><button className="filter"><Filter size={15}/> Фильтр</button></div>{rows.map((l,i)=><div className="lead-row" key={l[0]}><div className="lead-avatar">{l[0].split(' ').map(x=>x[0]).join('')}</div><div className="lead-main"><b>{l[0]}</b><span>{l[1]}</span></div><div className="lead-project">{l[2]}</div><time>{l[3]}</time><button className="row-more"><MoreHorizontal size={17}/></button></div>)}</section><div className="card pipeline"><h2>Воронка</h2><span>Текущий месяц</span><div className="funnel"><div><b>37</b><span>Новые</span></div><div><b>24</b><span>В работе</span></div><div><b>16</b><span>Успешно</span></div><div><b>€4 820</b><span>Выручка</span></div></div></div></div></>}

function Clients({clients=[]}){const rows=clients.length?clients:['Barber House','Nordic Beauty','Urban Fitness','Mokka Coffee','North Studio','Luna Dental'];return <><Header eyebrow="CRM" title="Клиенты" description="Управляйте клиентами и связанными проектами из одного места." action={<button className="primary"><Plus size={17}/> Добавить клиента</button>}/><div className="client-grid">{rows.map((x,i)=><div className="card client-card" key={x}><div className={`client-logo c${i}`}>{(typeof x === 'string' ? x : x.name).slice(0,1)}</div><div><h3>{typeof x === 'string' ? x : x.name}</h3><span>{i%2?'2 проекта':'3 проекта'} · {i+2} контакта</span></div><button className="row-more"><MoreHorizontal size={17}/></button><div className="client-bottom"><span>Последняя активность</span><b>{i+1} дн. назад</b></div></div>)}</div></>}

function Bookings({bookings=[]}){const fallback=[{customer_name:'Александр К.',starts_at:'2026-10-21T10:00:00',status:'confirmed',project_name:'Barber House'},{customer_name:'Елена М.',starts_at:'2026-10-21T11:00:00',status:'confirmed',project_name:'Nordic Beauty'},{customer_name:'Дмитрий П.',starts_at:'2026-10-21T13:00:00',status:'confirmed',project_name:'Urban Fitness'}];const rows=bookings.length?bookings:fallback;return <><Header eyebrow="Операции" title="Бронирования" description="Записи клиентов из всех подключённых проектов." action={<button className="primary"><Plus size={17}/> Создать запись</button>}/><div className="metrics compact"><Metric title="Сегодня" value={String(rows.length)} change="+2" icon={CalendarDays}/><Metric title="На неделе" value={String(rows.length+23)} change="+11%" icon={Clock3}/><Metric title="Подтверждено" value={String(rows.filter(x=>x.status==='confirmed').length)} change="+8%" icon={CheckCircle2}/><Metric title="Конверсия" value="74%" change="+6%" icon={BarChart3}/></div><section className="card calendar-card"><div className="card-head"><div><h2>Расписание</h2><span>Ближайшие записи</span></div><div className="calendar-actions"><button className="filter">Сегодня</button><button className="filter">Неделя</button></div></div>{rows.map((b,i)=><div className="slot" key={b.id||i}><time>{new Date(b.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</time><div><Booking name={b.customer_name} project={b.project_name||'Проект'} /></div></div>)}</section></>}

function Booking({name,project}){return <div className="booking"><b>{name}</b><span>{project}</span><em>Подтверждено</em></div>}

function Sites({onCreate}){return <><Header eyebrow="Публикация" title="Сайты" description="Публичные сайты клиентов и их домены." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Создать сайт</button>}/><div className="site-grid">{projects.filter(p=>p.type.includes('Сайт')).map((p,i)=><div className="card site-card" key={p.name}><div className={`site-preview p${i}`}><div className="preview-bar"><span/><span/><span/></div><div className="preview-content"><strong>{p.name}</strong><small>Современный сайт бизнеса</small></div></div><div className="site-info"><div><h3>{p.name}</h3><span>{p.name.toLowerCase().replaceAll(' ','')}.nexora.site</span></div><span className="status success"><i/> Опубликован</span></div><div className="site-actions"><button className="filter"><ExternalLink size={14}/> Открыть</button><button className="filter">Редактор</button></div></div>)}</div></>}

function MiniApps(){return <><Header eyebrow="Telegram" title="Mini Apps" description="Мини-приложения для клиентов внутри Telegram." action={<button className="primary"><Plus size={17}/> Создать Mini App</button>}/><div className="mini-hero card"><div className="mini-copy"><span className="pill"><Bot size={14}/> Telegram Web App</span><h2>Каталог, заявки и бронирования — прямо в Telegram</h2><p>Подключайте Mini App к проекту, настраивайте каталог и получайте заявки без перехода на внешний сайт.</p><div className="mini-buttons"><button className="primary"><Send size={16}/> Подключить Telegram</button><button className="filter">Как это работает</button></div></div><div className="phone"><div className="phone-top">Telegram <span>•••</span></div><div className="phone-body"><div className="tg-logo">N</div><b>Barber House</b><span>Онлайн-запись</span><button>Записаться</button><div className="phone-card">Услуги <b>12</b></div><div className="phone-card">Свободные окна <b>8</b></div></div></div></div><div className="mini-list">{['Barber House','Urban Fitness','Nordic Beauty'].map((x,i)=><div className="card mini-row" key={x}><div className="mini-icon"><Smartphone size={18}/></div><div><b>{x}</b><span>@{x.toLowerCase().replaceAll(' ','_')}_bot · Mini App</span></div><span className="status success"><i/> Активен</span><button className="filter">Открыть</button></div>)}</div></>}

function Analytics({metrics}){const m=metrics||{visits:28460,leads:1284,bookings:624,revenue:18420};return <><Header eyebrow="Отчёты" title="Аналитика" description="Показатели студии и клиентских проектов в одном отчёте." action={<button className="filter">Последние 30 дней ▾</button>}/><div className="metrics"><Metric title="Посещения" value={Number(m.visits || 0).toLocaleString("ru-RU")} change="+21%" icon={Globe2}/><Metric title="Заявки" value={Number(m.leads || 0).toLocaleString("ru-RU")} change="+18%" icon={Inbox}/><Metric title="Бронирования" value={Number(m.bookings || 0).toLocaleString("ru-RU")} change="+14%" icon={CalendarDays}/><Metric title="Выручка" value={`€${Number(m.revenue || 0).toLocaleString("ru-RU")}`} change="+27%" icon={CircleDollarSign}/></div><section className="card chart-card"><div className="card-head"><div><h2>Рост показателей</h2><span>Суммарная динамика клиентских проектов</span></div></div><div className="chart"><div className="chart-y"><span>€20k</span><span>€15k</span><span>€10k</span><span>€5k</span><span>€0</span></div><div className="bars">{[32,46,38,57,52,68,64,82,74,91,86,100].map((h,i)=><div className="bar-col" key={i}><div style={{height:h+'%'}}/><span>{['Ян','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'][i]}</span></div>)}</div></div></section></>}

function Integrations(){const items=[['Telegram','Заявки, уведомления и Mini Apps','Подключено',Send],['Payments','Оплата и статусы заказов','Подключить',CreditCard],['Analytics','События и конверсии','Подключено',BarChart3],['Domains','Домены и SSL','Подключено',Globe2],['CRM','Синхронизация клиентов','Подключить',Users],['Webhooks','Внешние автоматизации','Подключить',Zap]];return <><Header eyebrow="Экосистема" title="Интеграции" description="Подключайте сервисы, которые расширяют возможности Nexora."/><div className="integration-grid">{items.map(([name,desc,status,Icon])=><div className="card integration" key={name}><div className="integration-icon"><Icon size={20}/></div><div><h3>{name}</h3><span>{desc}</span></div><button className={status==='Подключено'?'connected':'filter'}>{status}</button></div>)}</div></>}

function Templates({onCreate}){const templates=[['Barber','Барбершоп','dark'],['Beauty','Салон красоты','blue'],['Fitness','Фитнес-студия','purple'],['Restaurant','Ресторан','orange'],['Coffee','Кофейня','green'],['Dental','Стоматология','pink']];return <><Header eyebrow="Библиотека" title="Шаблоны" description="Готовые стартовые проекты для быстрого запуска клиентов."/><div className="template-grid">{templates.map(([name,desc,color])=><div className="card template" key={name}><div className={`template-preview ${color}`}><span>{name}</span><div className="template-lines"><i/><i/><i/></div></div><div className="template-info"><div><h3>{name}</h3><span>{desc}</span></div><button className="filter" onClick={onCreate}>Использовать</button></div></div>)}</div></>}

function SettingsPage(){return <><Header eyebrow="Рабочее пространство" title="Настройки" description="Брендинг, участники, уведомления и параметры студии."/><div className="settings-layout"><div className="settings-nav card">{['Профиль студии','Брендинг','Участники','Уведомления','Интеграции','Безопасность','Тариф и оплата'].map((x,i)=><button className={i===0?'selected':''} key={x}>{x}</button>)}</div><section className="card settings-form"><div className="setting-block"><h2>Профиль студии</h2><span>Основная информация рабочего пространства.</span><label>Название студии<input value="Nexora Studio" readOnly/></label><label>Рабочий email<input value="studio@nexora.local" readOnly/></label><label>Часовой пояс<select defaultValue="Europe/Helsinki"><option>Europe/Helsinki</option><option>Europe/Moscow</option><option>Europe/Berlin</option></select></label></div><div className="setting-block"><h2>Внешний вид</h2><span>Настройте стиль панели и клиентских проектов.</span><div className="theme-options"><button className="theme active"><span/>Светлая</button><button className="theme"><span/>Тёмная</button><button className="theme"><span/>Системная</button></div></div><div className="setting-actions"><button className="filter">Отменить</button><button className="primary">Сохранить изменения</button></div></section></div></>}

function ProjectWorkspace({project,data,view,setView,onBack,onRefresh}) {
  const current=data?.project||project, pages=data?.pages||[];
  const [saving,setSaving]=useState(false), [name,setName]=useState(current.name||''), [domain,setDomain]=useState(current.domain||''), [headline,setHeadline]=useState('Ваш бизнес. Онлайн.');
  useEffect(()=>{setName(current.name||'');setDomain(current.domain||'');const h=pages[0]?.content?.blocks?.find(b=>b.type==='hero')?.headline;setHeadline(h||'Ваш бизнес. Онлайн.')},[current.id,pages.length]);
  const saveSettings=async()=>{setSaving(true);try{await api.updateProject(current.id,{name,domain});await onRefresh()}finally{setSaving(false)}};
  const saveEditor=async()=>{setSaving(true);try{let page=pages[0];if(!page)page=(await api.createPage(current.id,{title:'Главная',slug:'home'})).page;await api.updatePage(current.id,page.id,{content:{blocks:[{type:'hero',headline},{type:'services',title:'Услуги',items:['Основная услуга','Популярная услуга','Премиум услуга']},{type:'contacts',title:'Контакты'}]}});await onRefresh()}finally{setSaving(false)}};
  const publish=async()=>{setSaving(true);try{await api.publishProject(current.id);await onRefresh()}finally{setSaving(false)}};
  return <div className="workspace-page">
    <div className="workspace-head"><button className="filter" onClick={onBack}>← Проекты</button><div className="workspace-title"><div className="project-logo dark">{current.name?.slice(0,1)}</div><div><b>{current.name}</b><span>{current.project_type||'website'} · {current.status==='published'?'Опубликован':'Черновик'}</span></div></div><div className="workspace-actions"><button className="filter" onClick={()=>setView('preview')}><ExternalLink size={14}/> Предпросмотр</button><button className="primary" onClick={publish} disabled={saving}><Globe2 size={15}/> Опубликовать</button></div></div>
    <div className="workspace-tabs">{[['overview','Обзор'],['pages','Страницы'],['editor','Редактор'],['preview','Предпросмотр'],['settings','Настройки']].map(([id,label])=><button key={id} className={view===id?'selected':''} onClick={()=>setView(id)}>{label}</button>)}</div>
    {view==='overview'&&<div className="workspace-grid"><div className="card workspace-card"><div className="eyebrow">Проект</div><h2>Центр управления клиентским проектом</h2><p>Сайт, Mini App, контент, публикация и настройки клиента управляются из одного рабочего пространства.</p><div className="workspace-stat-grid"><div><b>{pages.length}</b><span>страниц</span></div><div><b>{current.status==='published'?'Опубликован':'Черновик'}</b><span>статус</span></div><div><b>{domain||'Не подключен'}</b><span>домен</span></div></div></div><div className="card workspace-card"><h3>Следующие шаги</h3><button className="workspace-step" onClick={()=>setView('pages')}><Globe2 size={17}/><span><b>Настроить страницы</b><small>Создать структуру сайта</small></span><ChevronRight size={16}/></button><button className="workspace-step" onClick={()=>setView('editor')}><Palette size={17}/><span><b>Открыть редактор</b><small>Изменить блоки и тексты</small></span><ChevronRight size={16}/></button><button className="workspace-step" onClick={publish}><CheckCircle2 size={17}/><span><b>Опубликовать</b><small>Сделать проект доступным</small></span><ChevronRight size={16}/></button></div></div>}
    {view==='pages'&&<div className="card workspace-card"><div className="card-head"><div><h2>Страницы</h2><span>Структура сайта</span></div><button className="primary" onClick={async()=>{await api.createPage(current.id,{title:'Новая страница',slug:'new-page'});await onRefresh()}}><Plus size={15}/> Новая страница</button></div>{pages.map(p=><div className="page-row" key={p.id}><div className="page-icon"><Globe2 size={16}/></div><div><b>{p.title}</b><span>/{p.slug}</span></div><span className={p.published?'status success':'status draft'}><i/>{p.published?'Опубликована':'Черновик'}</span><button className="filter" onClick={()=>setView('editor')}>Редактировать</button></div>)}</div>}
    {view==='editor'&&<div className="editor-layout"><aside className="card editor-sidebar"><div className="eyebrow">Редактор</div><h3>Главная</h3><p>Блоки страницы</p><div className="editor-block active"><Palette size={15}/><span>Hero / первый экран</span></div><div className="editor-block"><Layers3 size={15}/><span>Услуги / каталог</span></div><div className="editor-block"><Users size={15}/><span>Контакты / CTA</span></div></aside><section className="card editor-canvas"><div className="editor-toolbar"><b>Главная</b><span>Редактирование</span><button className="primary" onClick={saveEditor} disabled={saving}>{saving?'Сохраняем…':'Сохранить'}</button></div><div className="site-canvas"><div className="canvas-hero"><input value={headline} onChange={e=>setHeadline(e.target.value)}/><p>Удобный цифровой опыт для ваших клиентов.</p><button>Оставить заявку</button></div><div className="canvas-section"><h3>Услуги</h3><div className="canvas-cards"><div>Основная услуга</div><div>Популярная услуга</div><div>Премиум услуга</div></div></div><div className="canvas-section"><h3>Контакты</h3><p>Свяжитесь с нами удобным способом.</p></div></div></section></div>}
    {view==='preview'&&<div className="card preview-shell"><div className="preview-top"><b>{current.name}</b><span>{domain||'preview.nexora.site'}</span></div><div className="public-preview"><div><small>ПРЕДПРОСМОТР</small><h1>{headline}</h1><p>Удобный цифровой опыт для ваших клиентов.</p><button>Оставить заявку</button></div><div className="preview-services"><span>Услуги</span><b>Основная услуга</b><b>Популярная услуга</b><b>Премиум услуга</b></div></div></div>}
    {view==='settings'&&<div className="card workspace-card"><div className="eyebrow">Настройки проекта</div><h2>Основные параметры</h2><label className="workspace-label">Название проекта<input value={name} onChange={e=>setName(e.target.value)}/></label><label className="workspace-label">Домен<input placeholder="client.ru" value={domain} onChange={e=>setDomain(e.target.value)}/></label><div className="setting-actions"><button className="primary" onClick={saveSettings} disabled={saving}>{saving?'Сохраняем…':'Сохранить'}</button></div></div>}
  </div>
}

function CreateProject({onClose,onCreate}){return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal card" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">Новый проект</span><h2>Что создаём?</h2></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div><div className="create-options"><button onClick={() => onCreate("site")}><div><Globe2 size={20}/></div><b>Сайт</b><span>Запустить сайт из шаблона</span><ChevronRight size={17}/></button><button onClick={() => onCreate("miniapp")}><div><Smartphone size={20}/></div><b>Telegram Mini App</b><span>Каталог, заявки и бронирования</span><ChevronRight size={17}/></button><button onClick={() => onCreate("site_miniapp")}><div><Layers3 size={20}/></div><b>Сайт + Mini App</b><span>Полный клиентский проект</span><ChevronRight size={17}/></button></div></div></div>}
 
createRoot(document.getElementById('root')).render(<App />)
