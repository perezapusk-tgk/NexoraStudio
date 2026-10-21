import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LayoutDashboard,FolderKanban,Inbox,Users,CalendarDays,Globe,Smartphone,BarChart3,Plug,Zap,Settings,Plus,Search,Bell,ArrowUpRight,MoreHorizontal} from 'lucide-react';
import './styles.css';

const nav=[
['Обзор',LayoutDashboard],['Проекты',FolderKanban],['Заявки',Inbox],['Клиенты',Users],['Бронирования',CalendarDays],
['Сайты',Globe],['Mini Apps',Smartphone],['Аналитика',BarChart3],['Интеграции',Plug]
];
const projects=[
 {name:'Barber House',type:'Сайт + Mini App',status:'Опубликован',leads:18,revenue:'€1 240',letter:'B'},
 {name:'Nordic Beauty',type:'Сайт',status:'В разработке',leads:7,revenue:'€860',letter:'N'},
 {name:'Urban Fitness',type:'Mini App + каталог',status:'Опубликован',leads:12,revenue:'€2 140',letter:'U'}
];
function App(){
 const [active,setActive]=useState('Обзор');
 return <div className="app">
  <aside className="sidebar">
   <div className="brand"><div className="logo">N</div><div><b>Nexora</b><span>Studio OS</span></div></div>
   <button className="create"><Plus size={18}/> Создать проект</button>
   <nav>{nav.map(([label,Icon])=><button className={active===label?'active':''} onClick={()=>setActive(label)} key={label}><Icon size={18}/><span>{label}</span></button>)}</nav>
   <div className="sideBottom"><button><Zap size={17}/> Шаблоны</button><button><Settings size={17}/> Настройки</button><div className="profile"><div className="avatar">P</div><div><b>Моя студия</b><span>Studio plan</span></div><MoreHorizontal size={18}/></div></div>
  </aside>
  <main>
   <header><div className="mobileBrand"><div className="logo">N</div><b>Nexora</b></div><div className="search"><Search size={17}/><input placeholder="Поиск проектов, клиентов..."/></div><div className="headActions"><button><Bell size={18}/><i></i></button><button className="user">P</button></div></header>
   <section className="content">
    <div className="welcome"><div><p className="eyebrow">СРЕДА, 21 ОКТЯБРЯ</p><h1>Добрый день 👋</h1><p>Вот что происходит в вашей студии сегодня.</p></div><button className="primary"><Plus size={17}/> Новый проект</button></div>
    <div className="metrics">
     {[['Активные проекты','24','+12%'],['Новые заявки','37','+18%'],['Бронирования','18','+9%'],['Продажи','€4 820','+24%']].map(x=><div className="metric" key={x[0]}><div><span>{x[0]}</span><strong>{x[1]}</strong></div><em>{x[2]}</em><ArrowUpRight size={18}/></div>)}
    </div>
    <div className="grid">
      <section className="card projects"><div className="cardHead"><div><h2>Последние проекты</h2><p>Ваши клиентские проекты</p></div><button className="link">Все проекты <ArrowUpRight size={15}/></button></div>
      {projects.map(p=><div className="project" key={p.name}><div className="projectIcon">{p.letter}</div><div className="projectInfo"><b>{p.name}</b><span>{p.type}</span></div><span className={'status '+(p.status==='Опубликован'?'live':'draft')}>{p.status}</span><div className="projectStats"><b>{p.leads}</b><span>заявок</span></div><div className="projectStats"><b>{p.revenue}</b><span>продажи</span></div><button className="dots"><MoreHorizontal size={18}/></button></div>)}</section>
      <section className="card activity"><div className="cardHead"><div><h2>Активность</h2><p>Последние события</p></div></div>
       {[['Новая заявка','Barber House','2 мин назад'],['Новое бронирование','Urban Fitness','18 мин назад'],['Проект опубликован','Nordic Beauty','1 ч назад'],['Новый клиент','Barber House','2 ч назад']].map((a,i)=><div className="event" key={i}><div className="eventDot"></div><div><b>{a[0]}</b><span>{a[1]}</span></div><time>{a[2]}</time></div>)}
      </section>
    </div>
    <section className="quick"><div><b>Быстрый старт</b><span>Запустите следующий проект за несколько минут</span></div><div className="quickBtns"><button><Globe/>Создать сайт</button><button><Smartphone/>Создать Mini App</button><button><Zap/>Выбрать шаблон</button></div></section>
   </section>
  </main>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);