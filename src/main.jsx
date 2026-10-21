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

  useEffect(() => {
    let alive = true
    api.projects().then(items => {
      if (!alive) return
      const list = Array.isArray(items) ? items : (items.projects || [])
      if (list.length) setProjectData(list.map(p => ({
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
      const mapped = { name: created.name, type: projectType === 'miniapp' ? 'Mini App' : projectType === 'site' ? 'Сайт' : 'Сайт + Mini App', status: 'Черновик', color: 'dark', leads: 0, bookings: 0, revenue: '€0', updated: 'только что' }
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
    setActive(item)
    setMobileOpen(false)
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
          {active === 'Обзор' && <Dashboard projects={filteredProjects} onCreate={() => setShowCreate(true)} onNavigate={go}/>}
          {active === 'Проекты' && <Projects projects={filteredProjects} onCreate={() => setShowCreate(true)} />}
          {active === 'Заявки' && <InboxPage leads={crm.leads} />}
          {active === 'Клиенты' && <Clients clients={crm.clients} />}
          {active === 'Бронирования' && <Bookings bookings={crm.bookings} />}
          {active === 'Сайты' && <Sites onCreate={() => setShowCreate(true)} />}
          {active === 'Mini Apps' && <MiniApps />}
          {active === 'Аналитика' && <Analytics metrics={crm.analytics} />}
          {active === 'Интеграции' && <Integrations />}
          {active === 'Шаблоны' && <Templates onCreate={() => setShowCreate(true)} />}
          {active === 'Настройки' && <SettingsPage />}
        </div>
      </main>

      {showCreate && <CreateProject onClose={() => setShowCreate(false)} onCreate={createProject} />}
    </div>
  )
}

function Header({ eyebrow, title, description, action }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

function Dashboard({ projects, onCreate, onNavigate }) {
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
        <ProjectTable projects={projects.slice(0, 4)}/>
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

function ProjectTable({projects}) {
  return <div className="table">{projects.map((p,i)=><div className="project-row" key={p.name}><div className={`project-logo ${p.color}`}>{p.name.slice(0,1)}</div><div className="project-name"><b>{p.name}</b><span>{p.type}</span></div><span className={`status ${p.status === 'Опубликован' ? 'success' : p.status === 'В работе' ? 'working' : 'draft'}`}><i/>{p.status}</span><div className="project-stat"><b>{p.leads}</b><span>заявок</span></div><div className="project-stat"><b>{p.revenue}</b><span>выручка</span></div><span className="updated">{p.updated}</span><button className="row-more"><MoreHorizontal size={17}/></button></div>)}</div>
}

function Activity() {
  return <section className="card activity"><div className="card-head"><div><h2>Активность</h2><span>Последние события</span></div><button className="icon-btn"><MoreHorizontal size={17}/></button></div><div className="activity-list">{activities.map(([title,sub,time,type])=><div className="activity-item" key={title+time}><div className={`activity-icon ${type}`}>{type === 'lead' ? <Inbox size={15}/> : type === 'booking' ? <CalendarDays size={15}/> : type === 'site' ? <Globe2 size={15}/> : <CreditCard size={15}/>}</div><div><b>{title}</b><span>{sub}</span></div><time>{time}</time></div>)}</div></section>
}

function Quick({icon:Icon,title,text,onClick}) { return <button className="quick-card card" onClick={onClick}><div className="quick-icon"><Icon size={19}/></div><div><b>{title}</b><span>{text}</span></div><ChevronRight size={17}/></button> }

function Projects({projects,onCreate}) { return <><Header eyebrow="Рабочая область" title="Проекты" description="Все сайты, Mini Apps и клиентские пространства студии." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Новый проект</button>}/><div className="filterbar"><button className="filter active">Все <b>24</b></button><button className="filter">Опубликованные <b>18</b></button><button className="filter">В работе <b>4</b></button><button className="filter">Черновики <b>2</b></button><button className="filter"><Filter size={15}/> Фильтры</button></div><section className="card projects-full"><ProjectTable projects={projects}/></section></> }

function InboxPage({leads=[]}){const fallback=[['Марина Соколова','Хочу записаться на стрижку','Barber House','только что'],['Иван Петров','Есть ли свободное окно в субботу?','Urban Fitness','12 мин назад'],['Анна Лебедева','Интересует абонемент','Urban Fitness','38 мин назад'],['Михаил Орлов','Нужен сайт для кофейни','Nexora Studio','1 ч назад']]; const rows = leads.length ? leads.map(l => [l.name, l.message, l.project_name || 'Проект', l.status]) : fallback; return <><Header eyebrow="CRM" title="Заявки" description="Единый вход для обращений со всех сайтов и Mini Apps." action={<button className="primary"><Plus size={17}/> Новая заявка</button>}/><div className="inbox-layout"><section className="card"><div className="card-head"><div><h2>Входящие</h2><span>7 новых обращений</span></div><button className="filter"><Filter size={15}/> Фильтр</button></div>{rows.map((l,i)=><div className="lead-row" key={l[0]}><div className="lead-avatar">{l[0].split(' ').map(x=>x[0]).join('')}</div><div className="lead-main"><b>{l[0]}</b><span>{l[1]}</span></div><div className="lead-project">{l[2]}</div><time>{l[3]}</time><button className="row-more"><MoreHorizontal size={17}/></button></div>)}</section><div className="card pipeline"><h2>Воронка</h2><span>Текущий месяц</span><div className="funnel"><div><b>37</b><span>Новые</span></div><div><b>24</b><span>В работе</span></div><div><b>16</b><span>Успешно</span></div><div><b>€4 820</b><span>Выручка</span></div></div></div></div></>}

function Clients({clients=[]}){const rows=clients.length?clients:['Barber House','Nordic Beauty','Urban Fitness','Mokka Coffee','North Studio','Luna Dental'];return <><Header eyebrow="CRM" title="Клиенты" description="Управляйте клиентами и связанными проектами из одного места." action={<button className="primary"><Plus size={17}/> Добавить клиента</button>}/><div className="client-grid">{rows.map((x,i)=><div className="card client-card" key={x}><div className={`client-logo c${i}`}>{x.slice(0,1)}</div><div><h3>{typeof x === 'string' ? x : x.name}</h3><span>{i%2?'2 проекта':'3 проекта'} · {i+2} контакта</span></div><button className="row-more"><MoreHorizontal size={17}/></button><div className="client-bottom"><span>Последняя активность</span><b>{i+1} дн. назад</b></div></div>)}</div></>}

function Bookings({bookings=[]}){return <><Header eyebrow="Операции" title="Бронирования" description="Записи клиентов из всех подключённых проектов." action={<button className="primary"><Plus size={17}/> Создать запись</button>}/><div className="metrics compact"><Metric title="Сегодня" value="8" change="+2" icon={CalendarDays}/><Metric title="На неделе" value="31" change="+11%" icon={Clock3}/><Metric title="Подтверждено" value="26" change="+8%" icon={CheckCircle2}/><Metric title="Конверсия" value="74%" change="+6%" icon={BarChart3}/></div><section className="card calendar-card"><div className="card-head"><div><h2>Расписание</h2><span>Понедельник, 21 октября</span></div><div className="calendar-actions"><button className="filter">Сегодня</button><button className="filter">Неделя</button></div></div>{['09:00','10:00','11:00','12:00','13:00','14:00'].map((t,i)=><div className="slot" key={t}><time>{t}</time><div>{i===1&&<Booking name="Александр К." project="Barber House"/>}{i===2&&<Booking name="Елена М." project="Nordic Beauty"/>}{i===4&&<Booking name="Дмитрий П." project="Urban Fitness"/>}</div></div>)}</section></>}

function Booking({name,project}){return <div className="booking"><b>{name}</b><span>{project}</span><em>Подтверждено</em></div>}

function Sites({onCreate}){return <><Header eyebrow="Публикация" title="Сайты" description="Публичные сайты клиентов и их домены." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Создать сайт</button>}/><div className="site-grid">{projects.filter(p=>p.type.includes('Сайт')).map((p,i)=><div className="card site-card" key={p.name}><div className={`site-preview p${i}`}><div className="preview-bar"><span/><span/><span/></div><div className="preview-content"><strong>{p.name}</strong><small>Современный сайт бизнеса</small></div></div><div className="site-info"><div><h3>{p.name}</h3><span>{p.name.toLowerCase().replaceAll(' ','')}.nexora.site</span></div><span className="status success"><i/> Опубликован</span></div><div className="site-actions"><button className="filter"><ExternalLink size={14}/> Открыть</button><button className="filter">Редактор</button></div></div>)}</div></>}

function MiniApps(){return <><Header eyebrow="Telegram" title="Mini Apps" description="Мини-приложения для клиентов внутри Telegram." action={<button className="primary"><Plus size={17}/> Создать Mini App</button>}/><div className="mini-hero card"><div className="mini-copy"><span className="pill"><Bot size={14}/> Telegram Web App</span><h2>Каталог, заявки и бронирования — прямо в Telegram</h2><p>Подключайте Mini App к проекту, настраивайте каталог и получайте заявки без перехода на внешний сайт.</p><div className="mini-buttons"><button className="primary"><Send size={16}/> Подключить Telegram</button><button className="filter">Как это работает</button></div></div><div className="phone"><div className="phone-top">Telegram <span>•••</span></div><div className="phone-body"><div className="tg-logo">N</div><b>Barber House</b><span>Онлайн-запись</span><button>Записаться</button><div className="phone-card">Услуги <b>12</b></div><div className="phone-card">Свободные окна <b>8</b></div></div></div></div><div className="mini-list">{['Barber House','Urban Fitness','Nordic Beauty'].map((x,i)=><div className="card mini-row" key={x}><div className="mini-icon"><Smartphone size={18}/></div><div><b>{x}</b><span>@{x.toLowerCase().replaceAll(' ','_')}_bot · Mini App</span></div><span className="status success"><i/> Активен</span><button className="filter">Открыть</button></div>)}</div></>}

function Analytics({metrics}){const m=metrics||{visits:28460,leads:1284,bookings:624,revenue:18420};return <><Header eyebrow="Отчёты" title="Аналитика" description="Показатели студии и клиентских проектов в одном отчёте." action={<button className="filter">Последние 30 дней ▾</button>}/><div className="metrics"><Metric title="Посещения" value={Number(m.visits || 0).toLocaleString("ru-RU")} change="+21%" icon={Globe2}/><Metric title="Заявки" value={Number(m.leads || 0).toLocaleString("ru-RU")} change="+18%" icon={Inbox}/><Metric title="Бронирования" value={Number(m.bookings || 0).toLocaleString("ru-RU")} change="+14%" icon={CalendarDays}/><Metric title="Выручка" value={`€${Number(m.revenue || 0).toLocaleString("ru-RU")}`} change="+27%" icon={CircleDollarSign}/></div><section className="card chart-card"><div className="card-head"><div><h2>Рост показателей</h2><span>Суммарная динамика клиентских проектов</span></div></div><div className="chart"><div className="chart-y"><span>€20k</span><span>€15k</span><span>€10k</span><span>€5k</span><span>€0</span></div><div className="bars">{[32,46,38,57,52,68,64,82,74,91,86,100].map((h,i)=><div className="bar-col" key={i}><div style={{height:h+'%'}}/><span>{['Ян','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'][i]}</span></div>)}</div></div></section></>}

function Integrations(){const items=[['Telegram','Заявки, уведомления и Mini Apps','Подключено',Send],['Payments','Оплата и статусы заказов','Подключить',CreditCard],['Analytics','События и конверсии','Подключено',BarChart3],['Domains','Домены и SSL','Подключено',Globe2],['CRM','Синхронизация клиентов','Подключить',Users],['Webhooks','Внешние автоматизации','Подключить',Zap]];return <><Header eyebrow="Экосистема" title="Интеграции" description="Подключайте сервисы, которые расширяют возможности Nexora."/><div className="integration-grid">{items.map(([name,desc,status,Icon])=><div className="card integration" key={name}><div className="integration-icon"><Icon size={20}/></div><div><h3>{name}</h3><span>{desc}</span></div><button className={status==='Подключено'?'connected':'filter'}>{status}</button></div>)}</div></>}

function Templates({onCreate}){const templates=[['Barber','Барбершоп','dark'],['Beauty','Салон красоты','blue'],['Fitness','Фитнес-студия','purple'],['Restaurant','Ресторан','orange'],['Coffee','Кофейня','green'],['Dental','Стоматология','pink']];return <><Header eyebrow="Библиотека" title="Шаблоны" description="Готовые стартовые проекты для быстрого запуска клиентов."/><div className="template-grid">{templates.map(([name,desc,color])=><div className="card template" key={name}><div className={`template-preview ${color}`}><span>{name}</span><div className="template-lines"><i/><i/><i/></div></div><div className="template-info"><div><h3>{name}</h3><span>{desc}</span></div><button className="filter" onClick={onCreate}>Использовать</button></div></div>)}</div></>}

function SettingsPage(){return <><Header eyebrow="Рабочее пространство" title="Настройки" description="Брендинг, участники, уведомления и параметры студии."/><div className="settings-layout"><div className="settings-nav card">{['Профиль студии','Брендинг','Участники','Уведомления','Интеграции','Безопасность','Тариф и оплата'].map((x,i)=><button className={i===0?'selected':''} key={x}>{x}</button>)}</div><section className="card settings-form"><div className="setting-block"><h2>Профиль студии</h2><span>Основная информация рабочего пространства.</span><label>Название студии<input value="Nexora Studio" readOnly/></label><label>Рабочий email<input value="studio@nexora.local" readOnly/></label><label>Часовой пояс<select defaultValue="Europe/Helsinki"><option>Europe/Helsinki</option><option>Europe/Moscow</option><option>Europe/Berlin</option></select></label></div><div className="setting-block"><h2>Внешний вид</h2><span>Настройте стиль панели и клиентских проектов.</span><div className="theme-options"><button className="theme active"><span/>Светлая</button><button className="theme"><span/>Тёмная</button><button className="theme"><span/>Системная</button></div></div><div className="setting-actions"><button className="filter">Отменить</button><button className="primary">Сохранить изменения</button></div></section></div></>}

function CreateProject({onClose,onCreate}){return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal card" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">Новый проект</span><h2>Что создаём?</h2></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div><div className="create-options"><button onClick={() => onCreate("site")}><div><Globe2 size={20}/></div><b>Сайт</b><span>Запустить сайт из шаблона</span><ChevronRight size={17}/></button><button onClick={() => onCreate("miniapp")}><div><Smartphone size={20}/></div><b>Telegram Mini App</b><span>Каталог, заявки и бронирования</span><ChevronRight size={17}/></button><button onClick={() => onCreate("site_miniapp")}><div><Layers3 size={20}/></div><b>Сайт + Mini App</b><span>Полный клиентский проект</span><ChevronRight size={17}/></button></div></div></div>}
 
createRoot(document.getElementById('root')).render(<App />)
