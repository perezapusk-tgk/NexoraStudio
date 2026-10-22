import React from 'react'
import { createRoot } from 'react-dom/client'
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
import { getLanguage, setLanguage, getCurrency, setCurrency, installLanguageObserver } from './i18n'

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

function PublicActionModal({mode,onClose,onSuccess,slug,serviceName=''}){
  const [form,setForm]=useState({name:'',phone:'',email:'',message:'',starts_at:'',service_name:serviceName});
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const submit=async(e)=>{e.preventDefault();setBusy(true);setError('');try{const payload=mode==='booking'?{...form,service_name:form.service_name||serviceName}:{...form};const r=mode==='booking'?await api.publicBooking(slug,payload):await api.publicLead(slug,payload);onSuccess(r[mode==='booking'?'booking':'lead']);}catch(err){setError(err.message||'Не удалось отправить форму.')}finally{setBusy(false)}};
  return <div className="public-modal-backdrop" onMouseDown={onClose}><form className="public-modal card" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><button type="button" className="public-close" onClick={onClose}><X size={18}/></button><div className="eyebrow">{mode==='booking'?'Онлайн-запись':'Новая заявка'}</div><h2>{mode==='booking'?'Записаться':'Оставить заявку'}</h2><p>{mode==='booking'?'Выберите удобное время — заявка сразу появится в бронированиях.':'Оставьте контакты — заявка сразу появится в разделе «Заявки».'}</p>{serviceName&&<label>Услуга<input value={form.service_name} onChange={e=>setForm(v=>({...v,service_name:e.target.value}))}/></label>}<label>Имя<input required value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Телефон<input required={mode==='booking'} value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label>{mode==='booking'?<label>Дата и время<input required type="datetime-local" value={form.starts_at} onChange={e=>setForm(v=>({...v,starts_at:e.target.value}))}/></label>:<label>Сообщение<textarea rows="4" value={form.message} onChange={e=>setForm(v=>({...v,message:e.target.value}))}/></label>}{error&&<div className="form-error">{error}</div>}<button className="primary" disabled={busy}>{busy?'Отправляем…':mode==='booking'?'Подтвердить запись':'Отправить заявку'}</button></form></div>
}

function PublicSite({data,slug}){
  const project=data.project,pages=data.pages||[],page=pages[0],blocks=page?.content?.blocks||[],catalog=(data.catalog||[]).filter(x=>x.active!==false),theme={accent:'#111827',background:'#ffffff',text:'#111827',font:'Inter',radius:'14px',...(page?.content?.theme||{})};
  const [modal,setModal]=useState(null),[sent,setSent]=useState(null),[cart,setCart]=useState([]),[openCart,setOpenCart]=useState(false),[form,setForm]=useState({name:'',phone:'',email:''}),[sending,setSending]=useState(false);
  useEffect(()=>{api.publicEvent(slug,{event_type:'page_view',path:window.location.pathname}).catch(()=>{})},[slug]);
  const add=item=>setCart(v=>{const found=v.find(x=>x.id===item.id);return found?v.map(x=>x.id===item.id?{...x,quantity:x.quantity+1}:x):[...v,{...item,quantity:1}]});
  const change=(id,delta)=>setCart(v=>v.map(x=>x.id===id?{...x,quantity:Math.max(0,x.quantity+delta)}:x).filter(x=>x.quantity>0));
  const total=cart.reduce((s,x)=>s+Number(x.price||0)*x.quantity,0);
  const action=(b,serviceName='')=>{if(b?.action==='booking')setModal({mode:'booking',serviceName});else if(b?.action==='link'&&b.link)window.open(b.link,'_blank');else setModal({mode:'lead',serviceName})};
  const checkout=async e=>{e.preventDefault();setSending(true);try{const r=await api.publicCheckout(slug,{...form,items:cart.map(x=>({catalog_id:x.id,quantity:x.quantity})),currency:cart[0]?.currency||'EUR',payment_provider:'stripe'});if(r.checkout_url){window.location.href=r.checkout_url;return}setSent(r.order);setCart([]);setForm({name:'',phone:'',email:''})}catch(err){alert(err.message||'Не удалось оформить заказ.')}finally{setSending(false)}};
  const done=v=>{setSent(v);setModal(null)};
  return <div className="public-app"><header className="public-nav"><b>{project.name}</b><span>Сайт</span>{cart.length>0&&<button className="filter" onClick={()=>setOpenCart(true)}>Корзина · {cart.reduce((s,x)=>s+x.quantity,0)}</button>}</header><main className="public-site" style={{'--public-accent':theme.accent,'--public-bg':theme.background,'--public-text':theme.text,'--public-radius':theme.radius,'--public-font':theme.font}}>
    {blocks.map((b,i)=>b.type==='hero'?<section className="public-hero" key={i}><small>NEXORA</small><h1>{b.headline}</h1><p>{b.subheadline}</p><button onClick={()=>action(b)}>{b.cta||'Оставить заявку'}</button></section>:b.type==='services'?<section className="public-block" key={i}><div className="public-kicker">{b.title}</div><div className="public-cards" style={{gridTemplateColumns:`repeat(${b.columns||3},minmax(0,1fr))`}}>{(b.items||[]).map((x,j)=><article key={j}><b>{x}</b><span>Подробности и запись доступны онлайн.</span><button className="text-action" onClick={()=>action(b,x)}>{b.action==='link'?'Подробнее →':b.action==='booking'?'Записаться →':'Оставить заявку →'}</button></article>)}</div></section>:b.type==='gallery'?<section className="public-block" key={i}><div className="public-kicker">{b.title}</div><div className="public-cards" style={{gridTemplateColumns:`repeat(${b.columns||3},minmax(0,1fr))`}}>{(b.items||[]).map((x,j)=><article key={j}>{(b.images||[])[j]&&<img src={b.images[j]} alt="" loading="lazy"/>}<b>{x}</b></article>)}</div></section>:b.type==='testimonials'?<section className="public-block" key={i}><div className="public-kicker">{b.title}</div><div className="public-cards" style={{gridTemplateColumns:`repeat(${b.columns||2},minmax(0,1fr))`}}>{(b.items||[]).map((x,j)=><article key={j}><b>{x}</b></article>)}</div></section>:b.type==='faq'?<section className="public-block" key={i}><div className="public-kicker">{b.title}</div><div className="preview-faq">{(b.items||[]).map((x,j)=>{const [q,...rest]=String(x).split(' — ');return <div className="preview-faq-row" key={j}><details open={j===0&&b.openFirst}><summary>{q}</summary><p>{rest.join(' — ')||'Ответ будет добавлен.'}</p></details></div>})}</div></section>:b.type==='cta'?<section className="public-block public-cta" key={i}><div className="public-kicker">{b.title}</div><p>{b.text}</p><button onClick={()=>action(b)}>{b.button||'Оставить заявку'}</button></section>:<section className="public-block" key={i}><div className="public-kicker">{b.title}</div><p>{b.text}</p></section>)}
    {catalog.length>0&&<section className="public-block"><div className="public-kicker">Каталог</div><div className="public-cards">{catalog.map(x=><article key={x.id}><b>{x.name}</b><span>{x.description||'Услуга или товар'}</span><strong>{x.price!=null?new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.price)):'По запросу'}</strong><button className="text-action" onClick={()=>add(x)}>В корзину →</button><button className="text-action" onClick={()=>setModal({mode:'booking',serviceName:x.name})}>Записаться →</button></article>)}</div></section>}
  </main>
  {cart.length>0&&<div className="public-cart card"><div><b>Корзина</b><span>{cart.reduce((s,x)=>s+x.quantity,0)} позиции · {new Intl.NumberFormat('ru-RU',{style:'currency',currency:cart[0]?.currency||'EUR'}).format(total)}</span></div><button className="primary" onClick={()=>setOpenCart(true)}>Оформить заказ</button></div>}
  {modal&&<PublicActionModal mode={modal.mode} serviceName={modal.serviceName} slug={slug} onClose={()=>setModal(null)} onSuccess={done}/>} 
  {sent&&!openCart&&<div className="public-modal-backdrop" onMouseDown={()=>setSent(null)}><div className="public-modal card" onMouseDown={e=>e.stopPropagation()}><div className="public-success"><CheckCircle2 size={30}/><h2>{sent.number?'Заказ оформлен':'Заявка отправлена'}</h2><p>{sent.number?<span>Номер заказа: <b>{sent.number}</b></span>:<span>Спасибо! Мы получили ваши данные и скоро свяжемся с вами.</span>}</p><button type="button" onClick={()=>setSent(null)}>Готово</button></div></div></div>}
  {openCart&&<div className="public-modal-backdrop" onMouseDown={()=>setOpenCart(false)}><form className="public-modal card" onSubmit={checkout} onMouseDown={e=>e.stopPropagation()}><button type="button" className="public-close" onClick={()=>setOpenCart(false)}><X size={18}/></button>{sent?<div className="public-success"><CheckCircle2 size={30}/><h2>Заказ оформлен</h2><p>Номер заказа: <b>{sent.number}</b></p><button type="button" onClick={()=>{setSent(null);setOpenCart(false)}}>Готово</button></div>:<><div className="eyebrow">Оформление заказа</div><h2>Ваш заказ</h2><div className="checkout-lines">{cart.map(x=><div key={x.id}><span>{x.name} × {x.quantity}</span><b>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.price||0)*x.quantity)}</b><button type="button" onClick={()=>change(x.id,-1)}>−</button><button type="button" onClick={()=>change(x.id,1)}>+</button></div>)}</div><strong className="checkout-total">Итого: {new Intl.NumberFormat('ru-RU',{style:'currency',currency:cart[0]?.currency||'EUR'}).format(total)}</strong><label>Имя<input required value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Телефон<input value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label><button className="primary" disabled={sending||!cart.length}>{sending?'Оформляем…':'Подтвердить заказ'}</button></>}</form></div>}
  </div>
}

function PublicMiniApp({data,slug}){
  const project=data.project,pages=data.pages||[],page=pages[0],blocks=page?.content?.blocks||[],catalog=(data.catalog||[]).filter(x=>x.active!==false);
  const theme={accent:'#17191d',background:'#f5f6f8',text:'#17191d',...(page?.content?.theme||{})};
  const hero=blocks.find(b=>b.type==='hero'), services=blocks.find(b=>b.type==='services');
  const [modal,setModal]=useState(null),[open,setOpen]=useState(false),[sent,setSent]=useState(null),[cart,setCart]=useState([]),[form,setForm]=useState({name:'',phone:'',email:''}),[sending,setSending]=useState(false);
  useEffect(()=>{api.publicEvent(slug,{event_type:'page_view',path:window.location.pathname,metadata:{surface:'miniapp'}}).catch(()=>{})},[slug]);
  const add=item=>setCart(v=>{const found=v.find(x=>x.id===item.id);return found?v.map(x=>x.id===item.id?{...x,quantity:x.quantity+1}:x):[...v,{...item,quantity:1}]});
  const change=(id,d)=>setCart(v=>v.map(x=>x.id===id?{...x,quantity:Math.max(0,x.quantity+d)}:x).filter(x=>x.quantity>0));
  const total=cart.reduce((s,x)=>s+Number(x.price||0)*x.quantity,0);
  const checkout=async e=>{e.preventDefault();setSending(true);try{const r=await api.publicCheckout(slug,{...form,items:cart.map(x=>({catalog_id:x.id,quantity:x.quantity})),currency:cart[0]?.currency||'EUR',payment_provider:'stripe'});if(r.checkout_url){window.location.href=r.checkout_url;return}setSent(r.order);setCart([]);setForm({name:'',phone:'',email:''})}catch(err){alert(err.message||'Не удалось оформить заказ.')}finally{setSending(false)}};
  return <div className="mini-public" style={{background:theme.background,color:theme.text,'--mini-accent':theme.accent}}>
    <div className="mini-public-top"><div><b>{project.name}</b><span>Telegram Mini App</span></div>{cart.length>0&&<button className="filter" onClick={()=>setOpen(true)}>Корзина · {cart.reduce((s,x)=>s+x.quantity,0)}</button>}</div>
    <section className="mini-public-hero" style={{background:theme.accent}}>
      <small>ОНЛАЙН-СЕРВИС</small><h1>{hero?.headline||project.name}</h1><p>{hero?.subheadline||'Каталог, заявки и запись — прямо внутри Telegram.'}</p><button onClick={()=>setModal({mode:hero?.action==='booking'?'booking':'lead'})}>{hero?.cta||'Оставить заявку'}</button>
    </section>
    {services&&<section className="mini-public-section"><div className="public-kicker">{services.title||'Услуги'}</div><div className="mini-public-services">{(services.items||[]).map((x,j)=><button className="mini-service-card" key={j} onClick={()=>setModal({mode:services.action==='booking'?'booking':'lead',serviceName:x})}><b>{x}</b><span>Подробнее и запись онлайн</span><strong>{services.action==='booking'?'Записаться':'Узнать больше'} →</strong></button>)}</div></section>}
    <section className="mini-public-section"><div className="public-kicker">Каталог</div>{catalog.length?catalog.map(x=><div className="mini-public-item" key={x.id}><div><b>{x.name}</b><span>{x.description||'Услуга или товар'}</span></div><strong>{x.price!=null?new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.price)):'По запросу'}</strong><button onClick={()=>setModal({mode:'booking',serviceName:x.name})}>Записаться</button><button onClick={()=>add(x)}>В корзину</button></div>):<div className="mini-public-empty">Каталог будет доступен после публикации позиций.</div>}</section>
    <div className="mini-public-bottom"><button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>Главная</button><button onClick={()=>document.querySelector('.mini-public-section')?.scrollIntoView({behavior:'smooth'})}>Каталог</button><button onClick={()=>setModal({mode:'lead'})}>Заявка</button></div>
    {cart.length>0&&<div className="public-cart card"><div><b>Корзина</b><span>{cart.reduce((s,x)=>s+x.quantity,0)} позиции · {new Intl.NumberFormat('ru-RU',{style:'currency',currency:cart[0]?.currency||'EUR'}).format(total)}</span></div><button className="primary" onClick={()=>setOpen(true)}>Оформить</button></div>}
    {modal&&<PublicActionModal mode={modal.mode} serviceName={modal.serviceName} slug={slug} onClose={()=>setModal(null)} onSuccess={v=>{setSent(v);setModal(null)}}/>}
    {sent&&<div className="public-modal-backdrop" onMouseDown={()=>setSent(null)}><div className="public-modal card" onMouseDown={e=>e.stopPropagation()}><div className="public-success"><CheckCircle2 size={30}/><h2>{sent.number?'Заказ принят':'Заявка отправлена'}</h2><p>{sent.number?'Номер заказа: ':''}<b>{sent.number||'Готово'}</b></p><button onClick={()=>setSent(null)}>Готово</button></div></div></div>}
    {open&&<div className="public-modal-backdrop" onMouseDown={()=>setOpen(false)}><form className="public-modal card" onSubmit={checkout} onMouseDown={e=>e.stopPropagation()}><button type="button" className="public-close" onClick={()=>setOpen(false)}><X size={18}/></button><div className="eyebrow">Заказ</div><h2>Оформление</h2><div className="checkout-lines">{cart.map(x=><div key={x.id}><span>{x.name} × {x.quantity}</span><b>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.price||0)*x.quantity)}</b><button type="button" onClick={()=>change(x.id,-1)}>−</button><button type="button" onClick={()=>change(x.id,1)}>+</button></div>)}</div><strong className="checkout-total">Итого: {new Intl.NumberFormat('ru-RU',{style:'currency',currency:cart[0]?.currency||'EUR'}).format(total)}</strong><label>Имя<input required value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Телефон<input value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label><button className="primary" disabled={sending||!cart.length}>{sending?'Оформляем…':'Подтвердить заказ'}</button></form></div>}
  </div>
}

function InviteAcceptScreen({token,onAuthenticated}){
  const [form,setForm]=useState({name:'',password:'',confirm:''})
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  const submit=async(e)=>{e.preventDefault();if(form.password!==form.confirm){setError('Пароли не совпадают');return}setBusy(true);setError('');try{const r=await api.acceptInvite({token,name:form.name,password:form.password});onAuthenticated(r)}catch(err){try{setError(JSON.parse(err.message)?.error||'Приглашение недействительно')}catch{setError('Приглашение недействительно')}}finally{setBusy(false)}}
  return <div className="auth-shell"><div className="auth-card card"><div className="brand auth-brand"><div className="brand-mark">N</div><div><strong>Nexora</strong><span>Studio OS</span></div></div><div className="eyebrow">Приглашение в команду</div><h1>Присоединиться к студии</h1><p>Создайте пароль для первого входа. После принятия приглашения вы сразу попадёте в рабочее пространство.</p><form onSubmit={submit}><label>Ваше имя<input required value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} placeholder="Ваше имя"/></label><label>Пароль<input required minLength="8" type="password" value={form.password} onChange={e=>setForm(v=>({...v,password:e.target.value}))} placeholder="Минимум 8 символов"/></label><label>Повторите пароль<input required minLength="8" type="password" value={form.confirm} onChange={e=>setForm(v=>({...v,confirm:e.target.value}))} placeholder="Повторите пароль"/></label>{error&&<div className="form-error">{error}</div>}<button className="primary auth-submit" disabled={busy}>{busy?'Создаём доступ…':'Принять приглашение'}</button></form></div></div>
}

function AuthScreen({onAuthenticated}){
  const [mode,setMode]=useState('login')
  const [form,setForm]=useState({name:'',studioName:'',email:'',password:''})
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const submit=async(e)=>{
    e.preventDefault();setBusy(true);setError('')
    try{
      const result=mode==='login'?await api.authLogin({email:form.email,password:form.password}):await api.authRegister(form)
      onAuthenticated(result)
    }catch(err){
      try{setError(JSON.parse(err.message)?.error||'Не удалось выполнить операцию')}catch{setError('Не удалось выполнить операцию')}
    }finally{setBusy(false)}
  }
  return <div className="auth-shell"><div className="auth-card card"><div className="brand auth-brand"><div className="brand-mark">N</div><div><strong>Nexora</strong><span>Studio OS</span></div></div><div className="eyebrow">{mode==='login'?'Вход в рабочее пространство':'Создание студии'}</div><h1>{mode==='login'?'С возвращением':'Запустите свою студию'}</h1><p>{mode==='login'?'Войдите, чтобы управлять клиентскими проектами, сайтами и Mini Apps.':'Создайте отдельное рабочее пространство. Данные студии изолированы от других аккаунтов.'}</p><form onSubmit={submit}>{mode==='register'&&<><label>Ваше имя<input required value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} placeholder="Алексей"/></label><label>Название студии<input required value={form.studioName} onChange={e=>setForm(v=>({...v,studioName:e.target.value}))} placeholder="Nexora Studio"/></label></>}<label>Email<input required type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))} placeholder="you@studio.ru"/></label><label>Пароль<input required minLength="8" type="password" value={form.password} onChange={e=>setForm(v=>({...v,password:e.target.value}))} placeholder="Минимум 8 символов"/></label>{error&&<div className="form-error">{error}</div>}<button className="primary auth-submit" disabled={busy}>{busy?'Подождите…':mode==='login'?'Войти':'Создать студию'}</button></form><button className="auth-switch" onClick={()=>{setMode(v=>v==='login'?'register':'login');setError('')}}>{mode==='login'?'Нет аккаунта? Создать студию':'Уже есть аккаунт? Войти'}</button></div></div>
}

class AppErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(error){return {error}}
  componentDidCatch(error,info){console.error('Nexora render error',error,info)}
  render(){
    if(this.state.error) return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:32,fontFamily:'Inter,system-ui',background:'#f6f7fb',color:'#111827'}}><div style={{maxWidth:720,background:'#fff',padding:28,borderRadius:18,boxShadow:'0 10px 40px rgba(0,0,0,.08)'}}><h1 style={{marginTop:0}}>Nexora Studio</h1><p>Интерфейс не смог загрузиться. Ошибка уже зафиксирована.</p><pre style={{whiteSpace:'pre-wrap',color:'#b42318'}}>{String(this.state.error?.message||this.state.error)}</pre><button onClick={()=>location.reload()} style={{padding:'10px 16px',borderRadius:10,border:0,cursor:'pointer'}}>Обновить</button></div></div>
    return this.props.children
  }
}

function Root(){
  useEffect(()=>installLanguageObserver(),[]);
  const path=window.location.pathname.split('/').filter(Boolean)
  const invite=new URLSearchParams(window.location.search).get('invite')
  if(invite) return <InviteAcceptScreen token={invite} onAuthenticated={()=>{window.history.replaceState({},'',window.location.pathname);window.location.reload()}}/>
  if(path[0]==='published'&&path[1]) return <PublicApp mode="site" slug={path[1]}/>
  if(path[0]==='miniapp'&&path[1]) return <PublicApp mode="miniapp" slug={path[1]}/>
  return <App/>
}

function App() {
  const [auth,setAuth]=useState(null)
  const [authLoading,setAuthLoading]=useState(true)
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
    const timer = setTimeout(() => { if(alive) setAuthLoading(false) }, 6500)
    api.authMe().then(session=>{ if(alive) setAuth(session) }).catch(()=>{ if(alive) setAuth(null) }).finally(()=>{ if(alive) setAuthLoading(false) })
    return () => { alive = false; clearTimeout(timer) }
  }, [])

  useEffect(() => {
    if(!auth) return
    const params=new URLSearchParams(window.location.search)
    if(params.get('billing')!=='success') return
    const provider=params.get('provider')
    const paymentId=params.get('session_id') || params.get('payment_id')
    if(!provider || !paymentId) return
    api.billingConfirm(provider,paymentId).then(()=>{
      window.history.replaceState({},'',window.location.pathname)
      window.alert('Оплата подтверждена. Тариф активирован на 30 дней.')
    }).catch(err=>{
      let m=err.message||'Оплата ещё не подтверждена'
      try{m=JSON.parse(err.message).error||m}catch{}
      window.history.replaceState({},'',window.location.pathname)
      window.alert(m)
    })
  },[auth])

  useEffect(() => {
    if(!auth) return
    let alive = true
    api.projects().then(items => {
      if (!alive) return
      const list = Array.isArray(items) ? items : (items.projects || [])
      setProjectData(list.map(p => ({
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
  }, [auth])

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

  if(authLoading) return <div className="auth-loading">Загрузка Nexora…</div>
  if(!auth) return <AuthScreen onAuthenticated={setAuth}/>

  const studioName=auth.studio?.name||'Nexora Studio'
  const userName=auth.user?.name||'Пользователь'
  const initials=userName.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()

  return (
    <div className="app">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark">N</div><div><strong>Nexora</strong><span>Studio OS</span></div></div>
        <div className="workspace"><div className="workspace-avatar">{initials||"NS"}</div><div><b>{studioName}</b><span>Рабочее пространство</span></div><ChevronRight size={15}/></div>
        <nav>
          <div className="nav-label">Рабочая область</div>
          {nav.slice(0, 5).map(([label, Icon]) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => go(label)}><Icon size={18}/><span>{label}</span>{label === 'Заявки' && <em>7</em>}</button>)}
          <div className="nav-label">Создание</div>
          {nav.slice(5, 13).map(([label, Icon]) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => go(label)}><Icon size={18}/><span>{label}</span></button>)}
          <div className="nav-label">Система</div>
          <button className={active === 'Настройки' ? 'nav-item active' : 'nav-item'} onClick={() => go('Настройки')}><Settings size={18}/><span>Настройки</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="plan"><div className="plan-icon"><Sparkles size={16}/></div><div><b>{auth.studio?.plan||"Starter"} Studio</b><span>Рабочее пространство</span></div></div>
          <button className="user user-logout" onClick={async()=>{await api.authLogout();setAuth(null)}}><div className="user-avatar">{initials||"NS"}</div><div><b>{userName}</b><span>{auth.user?.role||"owner"}</span></div><LogOut size={17}/></button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(v => !v)}><Menu size={21}/></button>
          <div className="crumb"><span>{studioName}</span><ChevronRight size={15}/><b>{active}</b></div>
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
          {active === 'Клиенты' && selectedClient && <ClientWorkspace data={clientData} projects={projectData} onRefresh={async () => { if (selectedClient?.id) setClientData(await api.client(selectedClient.id)); const [cl,ord,inv]=await Promise.all([api.clients(),api.orders(),api.invoices()]); setCrm(v=>({...v,clients:cl.clients||[],invoices:inv.invoices||[]})); setOrders(ord.orders||[]) }} onBack={() => { setSelectedClient(null); setClientData(null) }} />}
          {active === 'Бронирования' && <Bookings bookings={crm.bookings} projects={projectData} />}
          {active === 'Платежи' && <Payments payments={crm.payments} />}
          {active === 'Счета' && <Invoices invoices={crm.invoices} projects={projectData} />}
          {active === 'Заказы' && <Orders orders={orders} projects={projectData} />}
          {active === 'Сайты' && <Sites onCreate={() => setShowCreate(true)} />}
          {active === 'Mini Apps' && <MiniApps projects={projectData} onCreate={() => setShowCreate(true)} onOpenProject={openProject} />}
          {active === 'Аналитика' && <Analytics metrics={crm.analytics} />}
          {active === 'Интеграции' && <Integrations />}
          {active === 'Шаблоны' && <Templates onCreate={createProject} />}
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
    <Header eyebrow="Среда студии" title="Доброе утро 👋" description="Вот что происходит с вашими клиентскими проектами сегодня." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Новый проект</button>}/>
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

function Clients({clients=[],onOpenClient}){const rows=clients.length?clients:['Barber House','Nordic Beauty','Urban Fitness','Mokka Coffee','North Studio','Luna Dental'];return <><Header eyebrow="CRM" title="Клиенты" description="Единая база клиентов, история покупок, записей и оплат." action={<button className="primary"><Plus size={17}/> Добавить клиента</button>}/><div className="client-grid">{rows.map((x,i)=>{const name=typeof x==='string'?x:x.name;const activity=x.last_activity?Math.max(0,Math.floor((Date.now()-new Date(x.last_activity).getTime())/86400000)):null;return <button className="card client-card client-card-button" key={x.id||x.name||x} onClick={()=>typeof x==='string'?null:onOpenClient?.(x)}><div className={`client-logo c${i}`}>{name.slice(0,1)}</div><div><h3>{name}</h3><span>{x.project_count??0} {Number(x.project_count)===1?'проект':'проекта'} · {x.contact_count??0} взаимодействий</span></div><span className="row-more"><MoreHorizontal size={17}/></span><div className="client-bottom"><span>Последняя активность</span><b>{activity===null?'нет активности':activity===0?'сегодня':activity===1?'вчера':activity+' дн. назад'}</b></div></button>})}</div></>}

function ClientWorkspace({data,projects=[],onBack,onRefresh}){
  const c=data?.client||{},leads=data?.leads||[],bookings=data?.bookings||[],payments=data?.payments||[],invoices=data?.invoices||[],orders=data?.orders||[]
  const [editing,setEditing]=useState(false),[saving,setSaving]=useState(false),[invoiceOpen,setInvoiceOpen]=useState(false),[invoice,setInvoice]=useState({project_id:'',amount:'',description:'',due_date:''}),[notice,setNotice]=useState('')
  const [form,setForm]=useState({name:c.name||'',email:c.email||'',phone:c.phone||''})
  useEffect(()=>setForm({name:c.name||'',email:c.email||'',phone:c.phone||''}),[c.id,c.name,c.email,c.phone])
  const paid=payments.filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.amount||0),0)
  const orderRevenue=orders.filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.total||0),0)
  const totalPaid=Math.max(paid,orderRevenue)
  const timeline=[...leads.map(x=>({kind:'Заявка',text:x.message||'Новое обращение',date:x.created_at,status:x.status})),...bookings.map(x=>({kind:'Бронирование',text:(x.service_name||'Запись')+(x.status?' · '+({pending:'новая',confirmed:'подтверждено',completed:'завершено',cancelled:'отменено'}[x.status]||x.status):''),date:x.starts_at,status:x.status})),...orders.map(x=>({kind:'Заказ',text:x.number+' · '+Number(x.total||0)+' '+(x.currency||'EUR'),date:x.created_at,status:x.status})),...payments.map(x=>({kind:'Платёж',text:(x.description||'Оплата')+' · '+Number(x.amount||0)+' '+(x.currency||'EUR'),date:x.created_at,status:x.status})),...invoices.map(x=>({kind:'Счёт',text:x.number+' · '+Number(x.amount||0)+' '+(x.currency||'EUR'),date:x.created_at,status:x.status}))].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))
  const saveClient=async()=>{setSaving(true);try{const r=await api.updateClient(c.id,form);setNotice('Данные клиента сохранены');setEditing(false);onRefresh?.(r.client)}catch(e){window.alert(e.message||'Не удалось сохранить клиента')}finally{setSaving(false)}}
  const createInvoice=async()=>{if(!invoice.project_id||!invoice.amount)return;setSaving(true);try{const r=await api.createInvoice({...invoice,client_id:c.id});setNotice('Счёт '+(r.invoice?.number||'')+' создан');setInvoiceOpen(false);setInvoice({project_id:'',amount:'',description:'',due_date:''});onRefresh?.()}catch(e){window.alert(e.message||'Не удалось создать счёт')}finally{setSaving(false)}}
  return <div className="client-workspace"><div className="workspace-head"><button className="filter" onClick={onBack}>← Клиенты</button><div className="workspace-title"><div className="client-logo c0">{String(c.name||'?').slice(0,1)}</div><div><h1>{c.name||'Клиент'}</h1><span>{c.email||'Без email'} · {c.phone||'Без телефона'}</span></div></div><div className="workspace-actions"><button className="filter" onClick={()=>setEditing(true)}>Изменить</button><button className="primary" onClick={()=>setInvoiceOpen(true)}><Receipt size={15}/> Новый счёт</button></div></div>{notice&&<div className="status success client-notice"><i/>{notice}</div>}<div className="metrics compact"><Metric title="Заявки" value={leads.length} change="обращения" icon={Inbox}/><Metric title="Записи" value={bookings.length} change="бронирования" icon={CalendarDays}/><Metric title="Заказы" value={orders.length} change="покупки" icon={ShoppingCart}/><Metric title="Оплачено" value={new Intl.NumberFormat('ru-RU',{style:'currency',currency:'EUR'}).format(totalPaid)} change="выручка клиента" icon={CircleDollarSign}/></div><div className="client-detail-grid"><section className="card workspace-card"><div className="card-head"><div><h2>Заказы клиента</h2><span>История покупок и статусы оплаты</span></div></div>{orders.length?orders.map(x=><div className="client-op" key={x.id}><span>{x.number}</span><b>{x.project_name||'Проект'} · {(x.items||[]).map(i=>i.name+' × '+i.quantity).join(', ')}</b><strong>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.total||0))}</strong><em className={x.status==='paid'?'success':''}>{x.status==='paid'?'Оплачен':x.status==='pending'?'Ожидает':x.status==='refunded'?'Возврат':'Отменён'}</em></div>):<div className="empty-editor"><ShoppingCart size={22}/><b>Заказов пока нет</b><span>Покупки клиента появятся здесь.</span></div>}<div className="client-subsection"><h3>Счета</h3>{invoices.length?invoices.slice(0,6).map(x=><div className="client-op" key={x.id}><span>{x.number}</span><b>{x.description||'Счёт'}</b><strong>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.amount||0))}</strong><em>{({draft:'Черновик',sent:'Отправлен',paid:'Оплачен',overdue:'Просрочен',cancelled:'Отменён'}[x.status]||x.status)}</em></div>):<span className="muted">Счетов пока нет.</span>}</div></section><section className="card workspace-card"><div className="card-head"><div><h2>История клиента</h2><span>Заявки, записи, заказы, оплаты и счета в одной ленте</span></div></div>{timeline.length?timeline.slice(0,20).map((x,i)=><div className="client-activity" key={i}><div className="activity-icon"><CheckCircle2 size={15}/></div><div><b>{x.kind}</b><span>{x.text}</span></div><time>{x.date?new Date(x.date).toLocaleString('ru-RU'):''}</time></div>):<div className="empty-editor"><Clock3 size={22}/><b>Истории пока нет</b><span>Новые взаимодействия появятся автоматически.</span></div>}</section></div>{editing&&<div className="public-modal-backdrop" onMouseDown={()=>setEditing(false)}><section className="card booking-editor" onMouseDown={e=>e.stopPropagation()}><button className="public-close" onClick={()=>setEditing(false)}><X size={18}/></button><div className="eyebrow">CRM</div><h2>Данные клиента</h2><div className="booking-form-grid"><label>Имя<input value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Телефон<input value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label></div><div className="setting-actions"><button className="filter" onClick={()=>setEditing(false)}>Отмена</button><button className="primary" disabled={saving} onClick={saveClient}>{saving?'Сохраняем…':'Сохранить'}</button></div></section></div>}{invoiceOpen&&<div className="public-modal-backdrop" onMouseDown={()=>setInvoiceOpen(false)}><section className="card booking-editor" onMouseDown={e=>e.stopPropagation()}><button className="public-close" onClick={()=>setInvoiceOpen(false)}><X size={18}/></button><div className="eyebrow">Финансы</div><h2>Новый счёт для клиента</h2><div className="booking-form-grid"><label>Проект<select value={invoice.project_id} onChange={e=>setInvoice(v=>({...v,project_id:e.target.value}))}><option value="">Выберите проект</option>{(data?.orders||[]).map(x=><option key={x.project_id} value={x.project_id}>{x.project_name||'Проект'}</option>)}</select></label><label>Сумма<input type="number" min="0.01" step="0.01" value={invoice.amount} onChange={e=>setInvoice(v=>({...v,amount:e.target.value}))}/></label><label>Описание<input value={invoice.description} onChange={e=>setInvoice(v=>({...v,description:e.target.value}))} placeholder="Например, услуги за месяц"/></label><label>Срок оплаты<input type="date" value={invoice.due_date} onChange={e=>setInvoice(v=>({...v,due_date:e.target.value}))}/></label></div><div className="setting-actions"><button className="filter" onClick={()=>setInvoiceOpen(false)}>Отмена</button><button className="primary" disabled={saving||!invoice.project_id||!invoice.amount} onClick={createInvoice}>{saving?'Создаём…':'Создать счёт'}</button></div></section></div>}</div>}
function Bookings({bookings=[],projects=[]}){
  const fallback=[{id:'demo-1',customer_name:'Александр К.',starts_at:'2026-10-21T10:00:00',ends_at:'2026-10-21T11:00:00',status:'confirmed',project_name:'Barber House',service_name:'Стрижка'},{id:'demo-2',customer_name:'Елена М.',starts_at:'2026-10-21T11:30:00',ends_at:'2026-10-21T12:30:00',status:'pending',project_name:'Nordic Beauty',service_name:'Уход'},{id:'demo-3',customer_name:'Дмитрий П.',starts_at:'2026-10-21T13:00:00',ends_at:'2026-10-21T14:00:00',status:'completed',project_name:'Urban Fitness',service_name:'Тренировка'}];
  const [items,setItems]=useState(bookings.length?bookings:fallback),[filter,setFilter]=useState('all'),[view,setView]=useState('day'),[date,setDate]=useState(new Date()),[editing,setEditing]=useState(null),[creating,setCreating]=useState(false),[saving,setSaving]=useState(false);
  const [newBooking,setNewBooking]=useState({project_id:'',customer_name:'',customer_phone:'',service_name:'',starts_at:'',ends_at:'',status:'confirmed'});
  const create=async()=>{if(!newBooking.project_id||!newBooking.customer_name||!newBooking.starts_at||!newBooking.ends_at){window.alert('Заполните проект, клиента и время');return}setSaving(true);try{const r=await api.createBooking(newBooking);setItems(v=>[...v,r.booking].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)));setCreating(false);setNewBooking(v=>({...v,customer_name:'',customer_phone:'',service_name:''}));setDate(new Date(r.booking.starts_at))}catch(err){let msg=err.message||'Не удалось создать запись';try{const j=JSON.parse(err.message);msg=j.error||msg}catch{}window.alert(msg)}finally{setSaving(false)}};
  useEffect(()=>setItems(bookings.length?bookings:fallback),[bookings]);
  const dayKey=d=>{const x=new Date(d);return x.toISOString().slice(0,10)}
  const monday=d=>{const x=new Date(d);const n=(x.getDay()+6)%7;x.setDate(x.getDate()-n);x.setHours(0,0,0,0);return x}
  const days=view==='day'?[new Date(date)]:Array.from({length:7},(_,i)=>{const x=monday(date);x.setDate(x.getDate()+i);return x})
  const filtered=filter==='all'?items:items.filter(x=>x.status===filter)
  const visible=filtered.filter(x=>days.some(d=>dayKey(d)===dayKey(x.starts_at)))
  const labels={pending:'Новая',confirmed:'Подтверждено',completed:'Завершено',cancelled:'Отменено'}
  const move=(delta)=>{const x=new Date(date);x.setDate(x.getDate()+delta*(view==='day'?1:7));setDate(x)}
  const fmtDay=d=>d.toLocaleDateString('ru-RU',{weekday:'short',day:'2-digit',month:'short'})
  const setStatus=async(id,status)=>{try{await api.updateBooking(id,{status});setItems(v=>v.map(x=>x.id===id?{...x,status}:x))}catch{window.alert('Не удалось изменить статус бронирования')}}
  const pay=async(x)=>{const raw=window.prompt('Сумма оплаты (€):',String(x.amount||0));if(raw===null)return;const amount=Number(raw.replace(',','.'));if(!Number.isFinite(amount)||amount<=0){window.alert('Введите корректную сумму');return}try{await api.bookingPayment(x.id,{amount,currency:'EUR'});setItems(v=>v.map(o=>o.id===x.id?{...o,status:'completed'}:o));window.alert('Оплата проведена, запись завершена')}catch(err){window.alert(err.message||'Не удалось провести оплату')}}
  const save=async()=>{if(!editing?.id)return;setSaving(true);try{const payload={customer_name:editing.customer_name,customer_phone:editing.customer_phone,service_name:editing.service_name,starts_at:new Date(editing.starts_at).toISOString(),ends_at:new Date(editing.ends_at||new Date(new Date(editing.starts_at).getTime()+3600000)).toISOString()};const r=await api.updateBooking(editing.id,payload);setItems(v=>v.map(x=>x.id===editing.id?{...x,...r.booking}:x));setEditing(null)}catch(err){window.alert(err.message||'Не удалось сохранить запись')}finally{setSaving(false)}}
  const createModal=creating&&<div className="public-modal-backdrop" onMouseDown={()=>setCreating(false)}><section className="card booking-editor" onMouseDown={e=>e.stopPropagation()}><button className="public-close" onClick={()=>setCreating(false)}><X size={18}/></button><div className="eyebrow">Новая запись</div><h2>Добавить бронирование</h2><div className="booking-form-grid"><label>Проект<select value={newBooking.project_id} onChange={e=>setNewBooking(v=>({...v,project_id:e.target.value}))}><option value="">Выберите проект</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Клиент<input placeholder="Имя клиента" value={newBooking.customer_name} onChange={e=>setNewBooking(v=>({...v,customer_name:e.target.value}))}/></label><label>Телефон<input value={newBooking.customer_phone} onChange={e=>setNewBooking(v=>({...v,customer_phone:e.target.value}))}/></label><label>Услуга<input value={newBooking.service_name} onChange={e=>setNewBooking(v=>({...v,service_name:e.target.value}))}/></label><label>Начало<input type="datetime-local" value={newBooking.starts_at} onChange={e=>setNewBooking(v=>({...v,starts_at:e.target.value}))}/></label><label>Окончание<input type="datetime-local" value={newBooking.ends_at} onChange={e=>setNewBooking(v=>({...v,ends_at:e.target.value}))}/></label></div><div className="setting-actions"><button className="filter" onClick={()=>setCreating(false)}>Отмена</button><button className="primary" disabled={saving} onClick={create}>{saving?'Создаём…':'Создать запись'}</button></div></section></div>;
  const editor=editing&&<div className="public-modal-backdrop" onMouseDown={()=>setEditing(null)}><section className="card booking-editor" onMouseDown={e=>e.stopPropagation()}><button className="public-close" onClick={()=>setEditing(null)}><X size={18}/></button><div className="eyebrow">Запись клиента</div><h2>Редактировать бронирование</h2><div className="booking-form-grid"><label>Клиент<input value={editing.customer_name||''} onChange={e=>setEditing(v=>({...v,customer_name:e.target.value}))}/></label><label>Телефон<input value={editing.customer_phone||''} onChange={e=>setEditing(v=>({...v,customer_phone:e.target.value}))}/></label><label>Услуга<input value={editing.service_name||''} onChange={e=>setEditing(v=>({...v,service_name:e.target.value}))}/></label><label>Начало<input type="datetime-local" value={new Date(editing.starts_at).toISOString().slice(0,16)} onChange={e=>setEditing(v=>({...v,starts_at:new Date(e.target.value).toISOString()}))}/></label><label>Окончание<input type="datetime-local" value={new Date(editing.ends_at||new Date(new Date(editing.starts_at).getTime()+3600000)).toISOString().slice(0,16)} onChange={e=>setEditing(v=>({...v,ends_at:new Date(e.target.value).toISOString()}))}/></label></div><div className="setting-actions"><button className="filter" onClick={()=>setEditing(null)}>Отмена</button><button className="primary" disabled={saving} onClick={save}>{saving?'Сохраняем…':'Сохранить запись'}</button></div></section></div>;
  return <><Header eyebrow="Операции" title="Бронирования" description="Единый календарь записей клиентов из всех проектов." action={<button className="primary" onClick={()=>setCreating(true)}><Plus size={17}/> Новая запись</button>}/><div className="metrics compact"><Metric title="Все" value={String(items.length)} change="записи" icon={CalendarDays}/><Metric title="Новые" value={String(items.filter(x=>x.status==='pending').length)} change="ожидают подтверждения" icon={Clock3}/><Metric title="Подтверждено" value={String(items.filter(x=>x.status==='confirmed').length)} change="готовы к визиту" icon={CheckCircle2}/><Metric title="Завершено" value={String(items.filter(x=>x.status==='completed').length)} change="выполненные" icon={BarChart3}/></div><section className="card calendar-card"><div className="calendar-toolbar"><div><h2>Календарь</h2><span>{view==='day'?fmtDay(date):'Неделя · '+fmtDay(days[0])+' — '+fmtDay(days[6])}</span></div><div className="calendar-toolbar-actions"><button className="filter" onClick={()=>setDate(new Date())}>Сегодня</button><button className="filter" onClick={()=>move(-1)}>←</button><button className="filter" onClick={()=>move(1)}>→</button><button className={view==='day'?'filter active':'filter'} onClick={()=>setView('day')}>День</button><button className={view==='week'?'filter active':'filter'} onClick={()=>setView('week')}>Неделя</button></div></div><div className="calendar-filters">{[['all','Все'],['pending','Новые'],['confirmed','Подтверждены'],['completed','Завершены'],['cancelled','Отменены']].map(([id,label])=><button key={id} className={filter===id?'filter active':'filter'} onClick={()=>setFilter(id)}>{label}</button>)}</div>{view==='week'&&<div className="calendar-week-head">{days.map(d=><div key={dayKey(d)} className={dayKey(d)===dayKey(new Date())?'today':''}>{fmtDay(d)}</div>)}</div>}<div className={view==='week'?'calendar-week-grid':'calendar-day-grid'}>{visible.length===0?<div className="empty-editor"><CalendarDays size={24}/><b>Записей нет</b><span>На выбранную дату записей пока нет.</span></div>:visible.sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)).map((b,i)=><div className="slot booking-slot" key={b.id||i}><div className="slot-time"><b>{new Date(b.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</b><span>{new Date(b.ends_at||new Date(new Date(b.starts_at).getTime()+3600000)).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span></div><div className="booking-wrap"><Booking name={b.customer_name||'Клиент'} project={b.project_name||'Проект'} service={b.service_name} status={b.status}/><div className="booking-actions"><button className="filter" onClick={()=>setEditing({...b})}>Изменить</button><button className="filter" disabled={b.status==='completed'||b.status==='cancelled'} onClick={()=>pay(b)}>Оплатить</button><select className="booking-status" value={b.status||'pending'} onChange={e=>setStatus(b.id,e.target.value)}><option value="pending">Новая</option><option value="confirmed">Подтверждено</option><option value="completed">Завершено</option><option value="cancelled">Отменено</option></select></div></div></div>)}</div></section>{editor}{createModal}</>
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

function Orders({orders=[],projects=[]}){
  const fallback=[]
  const rows=orders.length?orders:fallback
  const [filter,setFilter]=useState('all'),[items,setItems]=useState(rows),[selected,setSelected]=useState(null),[detail,setDetail]=useState(null)
  useEffect(()=>setItems(orders.length?orders:fallback),[orders])
  const visible=filter==='all'?items:items.filter(x=>x.status===filter)
  const labels={pending:'Новый',paid:'Оплачен',cancelled:'Отменён',refunded:'Возврат'}
  const setStatus=async(id,status)=>{try{await api.updateOrder(id,status);setItems(v=>v.map(x=>x.id===id?{...x,status}:x));if(detail?.order?.id===id)setDetail(v=>({...v,order:{...v.order,status}}))}catch{window.alert('Не удалось изменить статус заказа')}}
  const openOrder=async(order)=>{setSelected(order);try{setDetail(await api.order(order.id))}catch{setDetail({order,payments:[],timeline:[]})}}
  const markPaid=async(order)=>{try{const r=await api.createPayment({project_id:order.project_id,client_id:order.client_id||null,order_id:order.id,amount:Number(order.total||0),currency:order.currency||'EUR',status:'paid',description:'Заказ '+order.number});setItems(v=>v.map(x=>x.id===order.id?{...x,status:'paid'}:x));setDetail(v=>v?{...v,order:{...v.order,status:'paid'},payments:[r.payment,...(v.payments||[])]}:v)}catch(err){window.alert(err.message||'Не удалось зарегистрировать оплату')}}
  const createInvoice=async(order)=>{try{const r=await api.createInvoiceFromOrder(order.id);setDetail(v=>v?{...v,invoice:r.invoice}:v);window.alert('Счёт '+r.invoice.number+' создан')}catch(err){window.alert(err.message||'Не удалось создать счёт')}}
  const total=items.filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.total||0),0)
  return <><Header eyebrow="Продажи" title="Заказы" description="Заказы из каталогов сайтов и Mini Apps."/><div className="metrics compact"><Metric title="Заказы" value={items.length} change="всего" icon={ShoppingCart}/><Metric title="Оплачено" value={new Intl.NumberFormat('ru-RU',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(total)} change="выручка заказов" icon={CircleDollarSign}/><Metric title="Новые" value={items.filter(x=>x.status==='pending').length} change="ожидают оплаты" icon={Clock3}/><Metric title="Средний чек" value={items.length?new Intl.NumberFormat('ru-RU',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(items.reduce((s,x)=>s+Number(x.total||0),0)/items.length):'€0'} change="по всем заказам" icon={Receipt}/></div><section className="card calendar-card"><div className="card-head"><div><h2>Реестр заказов</h2><span>Каталог → заказ → клиент → платёж</span></div><div className="calendar-actions">{[['all','Все'],['pending','Новые'],['paid','Оплачены'],['cancelled','Отменены'],['refunded','Возвраты']].map(([id,label])=><button key={id} className={filter===id?'filter active':'filter'} onClick={()=>setFilter(id)}>{label}</button>)}</div></div>{visible.length===0?<div className="empty-editor"><ShoppingCart size={24}/><b>Заказов пока нет</b><span>Заказы появятся после оформления покупки в сайте или Mini App.</span></div>:visible.map(x=><div className="slot invoice-row" key={x.id}><button className="order-open" onClick={()=>openOrder(x)}><div className="invoice-number"><b>{x.number}</b><span>{(x.items||[]).map(i=>i.name+' × '+i.quantity).join(', ')}</span></div><div className="invoice-project"><b>{x.project_name||'Проект'}</b><span>{x.client_name||'Без клиента'}</span></div></button><strong>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:x.currency||'EUR'}).format(Number(x.total||0))}</strong><select className="booking-status" value={x.status||'pending'} onChange={e=>setStatus(x.id,e.target.value)}>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>{x.status==='pending'&&<button className="filter active" onClick={()=>markPaid(x)}>Принять оплату</button>}</div>)}</section>{selected&&<div className="public-modal-backdrop" onMouseDown={()=>{setSelected(null);setDetail(null)}}><section className="card order-detail" onMouseDown={e=>e.stopPropagation()}><button className="public-close" onClick={()=>{setSelected(null);setDetail(null)}}><X size={18}/></button>{!detail?<div className="empty-editor"><span>Загружаем заказ…</span></div>:<><div className="eyebrow">Детали заказа</div><div className="order-detail-head"><div><h2>{detail.order.number}</h2><span>{detail.order.project_name||'Проект'} · {labels[detail.order.status]||detail.order.status}</span></div><strong>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:detail.order.currency||'EUR'}).format(Number(detail.order.total||0))}</strong></div><div className="order-detail-grid"><div><h3>Клиент</h3><p><b>{detail.client?.name||detail.order.client_name||'Без клиента'}</b><br/>{detail.client?.phone||'Телефон не указан'}<br/>{detail.client?.email||'Email не указан'}</p></div><div><h3>Состав</h3>{(detail.order.items||[]).map((it,i)=><div className="order-line" key={i}><span>{it.name} × {it.quantity}</span><b>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:detail.order.currency||'EUR'}).format(Number(it.price||0)*Number(it.quantity||1))}</b></div>)}</div></div>{detail.invoice&&<div className="order-invoice-note"><Receipt size={16}/><span>Счёт <b>{detail.invoice.number}</b> создан и отправлен</span></div>}<div className="order-timeline"><h3>История</h3>{(detail.timeline||[]).map((t,i)=><div className="client-activity" key={i}><div className="activity-icon"><CheckCircle2 size={15}/></div><div><b>{t.type==='payment'?'Платёж':'Заказ'}</b><span>{t.text}</span></div><time>{t.date?new Date(t.date).toLocaleString('ru-RU'):''}</time></div>)}</div><div className="order-detail-actions">{detail.order.status==='pending'&&<button className="primary" onClick={()=>markPaid(detail.order)}>Принять оплату</button>}<button className="filter" onClick={()=>createInvoice(detail.order)}><Receipt size={15}/> Создать счёт</button></div></>}</section></div>}</>
}

function Sites({onCreate}){return <><Header eyebrow="Публикация" title="Сайты" description="Публичные сайты клиентов и их домены." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Создать сайт</button>}/><div className="site-grid">{projects.filter(p=>p.type.includes('Сайт')).map((p,i)=><div className="card site-card" key={p.name}><div className={`site-preview p${i}`}><div className="preview-bar"><span/><span/><span/></div><div className="preview-content"><strong>{p.name}</strong><small>Современный сайт бизнеса</small></div></div><div className="site-info"><div><h3>{p.name}</h3><span>{p.name.toLowerCase().replaceAll(' ','')}.nexora.site</span></div><span className="status success"><i/> Опубликован</span></div><div className="site-actions"><button className="filter"><ExternalLink size={14}/> Открыть</button><button className="filter">Редактор</button></div></div>)}</div></>}

function MiniApps({projects=[],onCreate,onOpenProject}){const items=projects.filter(p=>String(p.type||'').includes('Mini App'));return <><Header eyebrow="Telegram" title="Mini Apps" description="Мини-приложения для клиентов внутри Telegram." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Создать Mini App</button>}/><div className="mini-hero card"><div className="mini-copy"><span className="pill"><Bot size={14}/> Telegram Web App</span><h2>Каталог, заявки и бронирования — прямо в Telegram</h2><p>Подключайте Mini App к проекту, настраивайте каталог и подключайте бота из настроек конкретного проекта.</p><div className="mini-buttons"><button className="primary" onClick={onCreate}><Send size={16}/> Создать Mini App</button><button className="filter" onClick={()=>items[0]&&onOpenProject?.(items[0])}>Открыть проект</button></div></div><div className="phone"><div className="phone-top">Telegram <span>•••</span></div><div className="phone-body"><div className="tg-logo">N</div><b>{items[0]?.name||'Ваш проект'}</b><span>Онлайн-запись</span><button>Записаться</button><div className="phone-card">Услуги <b>каталог</b></div><div className="phone-card">Бронирования <b>онлайн</b></div></div></div></div><div className="mini-list">{items.length?items.map((x,i)=><div className="card mini-row" key={x.id||x.name}><div className="mini-icon"><Smartphone size={18}/></div><div><b>{x.name}</b><span>{x.status==='Опубликован'?'Готов к публикации':'Черновик'} · Mini App</span></div><span className={x.status==='Опубликован'?'status success':'status draft'}><i/>{x.status==='Опубликован'?'Опубликован':'Черновик'}</span><button className="filter" onClick={()=>onOpenProject?.(x)}>Открыть</button></div>):<div className="card empty-editor"><Smartphone size={24}/><b>Mini Apps пока нет</b><span>Создайте проект типа «Telegram Mini App» или «Сайт + Mini App».</span></div>}</div></>}

function Analytics({metrics}){const m=metrics||{visits:0,leads:0,bookings:0,revenue:0,orders:0,paidOrders:0,averageOrder:0,paymentConversion:0,series:[]};const series=m.series||[];const max=Math.max(1,...series.map(x=>Number(x.revenue||0)));const visitToLead=m.visits?((m.leads/m.visits)*100).toFixed(1):'0.0';const leadToBooking=m.leads?((m.bookings/m.leads)*100).toFixed(1):'0.0';const money=v=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v||0));return <><Header eyebrow="Отчёты" title="Аналитика" description="Показатели студии и клиентских проектов в одном отчёте." action={<button className="filter">Последние 30 дней ▾</button>}/><div className="metrics"><Metric title="Посещения" value={Number(m.visits||0).toLocaleString('ru-RU')} change="за 30 дней" icon={Globe2}/><Metric title="Заявки" value={Number(m.leads||0).toLocaleString('ru-RU')} change="за 30 дней" icon={Inbox}/><Metric title="Бронирования" value={Number(m.bookings||0).toLocaleString('ru-RU')} change="за 30 дней" icon={CalendarDays}/><Metric title="Выручка" value={money(m.revenue)} change="оплаченные" icon={CircleDollarSign}/></div><div className="metrics compact"><Metric title="Заказы" value={Number(m.orders||0).toLocaleString('ru-RU')} change="создано за 30 дней" icon={ShoppingCart}/><Metric title="Оплачено заказов" value={Number(m.paidOrders||0).toLocaleString('ru-RU')} change="успешные оплаты" icon={CheckCircle2}/><Metric title="Средний чек" value={money(m.averageOrder)} change="по всем заказам" icon={Receipt}/><Metric title="Конверсия в оплату" value={Number(m.paymentConversion||0).toFixed(1)+'%'} change="заказ → оплата" icon={CreditCard}/></div><div className="analytics-grid"><section className="card chart-card"><div className="card-head"><div><h2>Динамика выручки</h2><span>Реальные платежи за последние 30 дней</span></div></div><div className="analytics-bars">{(series.length?series:[{day:'Нет данных',visits:0,leads:0,bookings:0,revenue:0}]).slice(-14).map((x,i)=><div className="analytics-bar" key={x.day+i}><div className="analytics-bar-stack"><i style={{height:(Number(x.revenue||0)/max*100)+'%'}}/></div><span>{x.day==='Нет данных'?'—':new Date(x.day).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})}</span></div>)}</div></section><section className="card funnel-card"><div className="card-head"><div><h2>Конверсия</h2><span>Путь клиента по воронке</span></div></div><div className="funnel-row"><b>Посещение → заявка</b><strong>{visitToLead}%</strong></div><div className="funnel-row"><b>Заявка → бронирование</b><strong>{leadToBooking}%</strong></div><div className="funnel-row"><b>Заказ → оплата</b><strong>{Number(m.paymentConversion||0).toFixed(1)}%</strong></div><div className="analytics-note">Финансовая конверсия считается по реальным заказам и платежам.</div></section></div></>}
function Integrations(){const items=[['Telegram','Заявки, уведомления и Mini Apps','Подключено',Send],['Payments','Оплата и статусы заказов','Подключить',CreditCard],['Analytics','События и конверсии','Подключено',BarChart3],['Domains','Домены и SSL','Подключено',Globe2],['CRM','Синхронизация клиентов','Подключить',Users],['Webhooks','Внешние автоматизации','Подключить',Zap]];return <><Header eyebrow="Экосистема" title="Интеграции" description="Подключайте сервисы, которые расширяют возможности Nexora."/><div className="integration-grid">{items.map(([name,desc,status,Icon])=><div className="card integration" key={name}><div className="integration-icon"><Icon size={20}/></div><div><h3>{name}</h3><span>{desc}</span></div><button className={status==='Подключено'?'connected':'filter'}>{status}</button></div>)}</div></>}

function Templates({onCreate}){const templates=[['barber','Барбершоп','Барбершоп','dark'],['beauty','Салон красоты','Салон красоты','blue'],['fitness','Фитнес','Фитнес-студия','purple'],['cafe','Кафе','Кафе / ресторан','orange'],['shop','Магазин','Интернет-магазин','green'],['services','Услуги','Бизнес и услуги','pink']];return <><Header eyebrow="Библиотека" title="Шаблоны" description="Готовые стартовые проекты с готовыми страницами, блоками и каталогом."/><div className="template-grid">{templates.map(([id,name,desc,color])=><div className="card template" key={id}><div className={`template-preview ${color}`}><span>{name}</span><div className="template-lines"><i/><i/><i/></div></div><div className="template-info"><div><h3>{name}</h3><span>{desc} · страницы + каталог</span></div><button className="filter" onClick={()=>onCreate('site',id)}>Использовать</button></div></div>)}</div></>}

function StripeConnectPanel(){
  const [status,setStatus]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const load=()=>api.stripeConnectStatus().then(setStatus).catch(e=>setError(e.message||'Не удалось получить статус Stripe'))
  useEffect(load,[])
  const connect=async()=>{setBusy(true);setError('');try{if(!status?.account_id){const a=await api.stripeConnectAccount();setStatus(a)}const r=await api.stripeConnectOnboard();if(r.url)window.location.href=r.url}catch(e){setError(e.message||'Не удалось открыть Stripe')}finally{setBusy(false)}}
  return <div className="card" style={{marginTop:18,padding:18}}><div className="section-head"><div><div className="eyebrow">Платежи клиентов</div><h3 style={{margin:'4px 0'}}>Stripe Connect</h3><p className="muted">Подключите Stripe для приёма платежей из сайтов и Telegram Mini Apps ваших клиентов.</p></div><span className={status?.status==='active'?'status success':'status'}>{status?.status==='active'?'Подключено':'Не подключено'}</span></div>{error&&<div className="form-error" style={{marginTop:12}}>{error}</div>}<div style={{display:'flex',gap:12,alignItems:'center',marginTop:16,flexWrap:'wrap'}}><span className="muted">{status?.account_id?'Аккаунт создан. Завершите проверку данных в Stripe.':'Аккаунт ещё не создан.'}</span><button className="primary" disabled={busy} onClick={connect}>{busy?'Открываем…':status?.account_id?'Продолжить подключение':'Подключить Stripe'}</button></div></div>
}
function SettingsPage(){
  const [tab,setTab]=useState('profile')
  const [language,setUiLanguage]=useState(getLanguage())
  const [billingCurrency,setBillingCurrency]=useState(getCurrency())
  const [team,setTeam]=useState([])
  const [invites,setInvites]=useState([])
  const [form,setForm]=useState({email:'',role:'member'})
  const [busy,setBusy]=useState(false)
  const [plans,setPlans]=useState([])
  const [usage,setUsage]=useState(null)
  const [billingAccount,setBillingAccount]=useState(null)
  const [font,setFont]=useState(localStorage.getItem('nexora_font')||'Inter')
  const [accent,setAccent]=useState(localStorage.getItem('nexora_accent')||'#111827')
  useEffect(()=>{document.documentElement.style.setProperty('--accent',accent);document.documentElement.style.setProperty('--font-family',font);localStorage.setItem('nexora_font',font);localStorage.setItem('nexora_accent',accent)},[font,accent])
  const labels={profile:'Профиль студии',branding:'Брендинг',team:'Команда',notifications:'Уведомления',integrations:'Интеграции',security:'Безопасность',billing:'Тариф и оплата'}
  const loadTeam=async()=>{try{const r=await api.team();setTeam(r.members||[]);setInvites(r.invitations||[])}catch{}}
  useEffect(()=>{if(tab==='team')loadTeam();if(tab==='billing'){api.billingPlans().then(r=>setPlans(r.plans||[])).catch(()=>{});api.studioUsage().then(setUsage).catch(()=>{});api.billingAccount().then(setBillingAccount).catch(()=>{})}},[tab])
  const changeLanguage=v=>{setUiLanguage(v);setLanguage(v)}
  const changeCurrency=async v=>{setBillingCurrency(v);setCurrency(v);try{await api.updateBillingSettings(v)}catch{}}
  const add=async()=>{if(!form.email)return;setBusy(true);try{await api.addTeamMember(form);setForm({email:'',role:'member'});await loadTeam();window.alert('Приглашение создано. Скопируйте ссылку из списка приглашений.')}catch(e){window.alert(e.message||'Не удалось создать приглашение')}finally{setBusy(false)}}
  const role=async(id,v)=>{try{await api.updateTeamRole(id,v);await loadTeam()}catch{window.alert('Не удалось изменить роль')}}
  const remove=async id=>{if(!window.confirm('Удалить участника?'))return;try{await api.removeTeamMember(id);await loadTeam()}catch{window.alert('Не удалось удалить участника')}}
  const revoke=async id=>{if(!window.confirm('Отозвать приглашение?'))return;try{await api.revokeTeamInvitation(id);await loadTeam()}catch{window.alert('Не удалось отозвать приглашение')}}
  const switchPlan=async plan=>{if(plan===(usage?.studio?.plan||'pro'))return;if(!window.confirm('Оформить тариф '+plan.toUpperCase()+' в '+billingCurrency+'?'))return;try{const r=await api.billingCheckout(plan);if(r.checkout_url)window.location.href=r.checkout_url;else window.alert(r.mode==='free'?'Бесплатный тариф активирован.':'Тариф активирован.')}catch(e){window.alert(e.message||'Не удалось создать оплату')}}
  const openBillingPortal=async()=>{try{const r=await api.billingPortal();if(r.url)window.location.href=r.url}catch(e){window.alert(e.message||'Не удалось открыть управление подпиской')}}
  const planPrice=eur=>billingCurrency==='USD'?Math.round(eur*1.09):Math.round(eur*105)
  return <><Header eyebrow="Рабочее пространство" title="Настройки" description="Управляйте студией, командой, безопасностью и доступами."/>
    <div className="settings-layout">
      <div className="settings-nav card">{Object.keys(labels).map(x=><button key={x} className={tab===x?'selected':''} onClick={()=>setTab(x)}>{labels[x]}</button>)}</div>
      <section className="card settings-form">
        {tab==='profile'&&<div className="setting-block"><h2>Профиль студии</h2><span>Основная информация рабочего пространства.</span><label>Название студии<input value="Nexora Studio" readOnly/></label><label>Рабочий email<input value="studio@nexora.local" readOnly/></label><div className="catalog-form-grid"><label>Язык интерфейса<select value={language} onChange={e=>changeLanguage(e.target.value)}><option value="ru">Русский</option><option value="en">Английский</option></select></label><label>Валюта оплаты<select value={billingCurrency} onChange={e=>changeCurrency(e.target.value)}><option value="RUB">Российский рубль (₽)</option><option value="USD">Доллар США ($)</option></select></label></div></div>}
        {tab==='team'&&<><div className="setting-block"><h2>Команда студии</h2><span>Управляйте ролями и доступами сотрудников.</span><div className="team-list">{team.map(m=><div className="team-row" key={m.id}><div className="user-avatar">{String(m.name||'?').slice(0,1)}</div><div className="team-person"><b>{m.name}</b><span>{m.email}</span></div>{m.role==='owner'?<span className="status success"><i/>Владелец</span>:<><select value={m.role} onChange={e=>role(m.id,e.target.value)}><option value="admin">Администратор</option><option value="member">Участник</option><option value="viewer">Наблюдатель</option></select><button className="filter" onClick={()=>remove(m.id)}>Удалить</button></>}</div>)}</div></div><div className="setting-block"><h2>Пригласить сотрудника</h2><div className="team-add-grid"><input type="email" placeholder="Email сотрудника" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/><select value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value}))}><option value="admin">Администратор</option><option value="member">Участник</option><option value="viewer">Наблюдатель</option></select><button className="primary" disabled={busy} onClick={add}>{busy?'Создаём…':'Создать приглашение'}</button></div></div><div className="setting-block"><h2>Ожидают приглашения</h2>{invites.length===0?<div className="empty-editor"><b>Нет активных приглашений</b></div>:<div className="team-list">{invites.map(inv=><div className="team-row" key={inv.id}><div className="team-person"><b>{inv.email}</b><span>Истекает {new Date(inv.expires_at).toLocaleDateString('ru-RU')}</span></div><span className="status draft"><i/>Ожидает</span><button className="filter" onClick={()=>revoke(inv.id)}>Отозвать</button></div>)}</div>}</div></>}
        {tab==='integrations'&&<div className="setting-block"><h2>Интеграции</h2><span>Подключайте сервисы, которые используются сайтами и Mini Apps.</span><StripeConnectPanel/></div>}
        {tab==='security'&&<div className="setting-block"><h2>Безопасность</h2><span>Защищённые сессии и роли доступа.</span><div className="security-cards"><div><ShieldCheck size={18}/><b>Сессии</b><span>Авторизация по токену на 30 дней.</span></div><div><ShieldCheck size={18}/><b>Пароли</b><span>Пароли защищены scrypt.</span></div></div></div>}
        {tab==='billing'&&<div className="setting-block"><h2>Тариф и оплата</h2><span>Простые цены без завышения.</span><div className="pricing-grid">{plans.map(p=><div className={p.id===(usage?.studio?.plan||'pro')?'pricing-card featured':'pricing-card'} key={p.id}><div className="pricing-head"><div><b>{p.name}</b><span>{p.projectLimit} проектов</span></div></div><div className="pricing-price">{p.price===0?'Бесплатно':billingCurrency==='USD'?'$ '+planPrice(p.price):'₽'+planPrice(p.price).toLocaleString('ru-RU')}<small>{p.price===0?'':' / мес'}</small></div><ul><li>До {p.clientLimit.toLocaleString('ru-RU')} клиентов</li><li>{p.teamLimit} участников</li><li>Сайт + Telegram Mini App</li></ul><button className={p.id===(usage?.studio?.plan||'pro')?'primary':'filter'} disabled={p.id===(usage?.studio?.plan||'pro')} onClick={()=>switchPlan(p.id)}>{p.id===(usage?.studio?.plan||'pro')?'Текущий тариф':'Выбрать тариф'}</button></div>)}</div><div className="pricing-note"><ShieldCheck size={17}/> USD → Stripe. RUB → платёжный провайдер будет подключён отдельно.</div><div className="setting-block compact-billing"><h3>Статус подписки</h3><span>{billingAccount?.status==='active'?'Активна':'Не активна'}</span>{billingAccount?.provider==='stripe'&&billingAccount?.status==='active'&&<button className="filter" onClick={openBillingPortal} style={{marginTop:12}}>Управление подпиской в Stripe</button>}</div></div>}
        {tab==='branding'&&<div className="setting-block"><h2>Брендинг</h2><span>Настройте внешний вид рабочей панели.</span><div className="catalog-form-grid"><label>Шрифт<select value={font} onChange={e=>setFont(e.target.value)}><option>Inter</option><option>system-ui</option><option>Arial</option><option>Georgia</option></select></label><label>Основной цвет<input type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label></div></div>}{tab==='notifications'&&<div className="setting-block"><h2>Уведомления</h2><span>Настройки уведомлений студии.</span><div className="security-cards"><div><b>Email</b><span>Уведомления о новых заявках и бронированиях.</span></div><div><b>Системные</b><span>Уведомления о платежах и состоянии подписки.</span></div></div></div>}
      </section>
    </div>
  </>
}
function CatalogManager({projectId}) {
  const [items,setItems]=useState([])
  const [clients,setClients]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [editing,setEditing]=useState(null)
  const [form,setForm]=useState({name:'',description:'',price:'',currency:'EUR',image_url:'',active:true})
  const [orderOpen,setOrderOpen]=useState(false)
  const [orderItems,setOrderItems]=useState([])
  const [orderClient,setOrderClient]=useState('')
  const [orderSaving,setOrderSaving]=useState(false)
  const load=async()=>{
    setLoading(true)
    try{
      const [catalog,crmClients]=await Promise.all([api.catalog(projectId),api.clients()])
      setItems(catalog.items||[])
      setClients(crmClients.clients||[])
    }finally{setLoading(false)}
  }
  useEffect(()=>{load()},[projectId])
  const reset=()=>{setEditing(null);setForm({name:'',description:'',price:'',currency:'EUR',image_url:'',active:true})}
  const save=async()=>{
    if(!form.name.trim()) return
    setSaving(true)
    try{
      if(editing) await api.updateCatalogItem(projectId,editing,form)
      else await api.createCatalogItem(projectId,form)
      reset(); await load()
    }finally{setSaving(false)}
  }
  const edit=(item)=>{setEditing(item.id);setForm({name:item.name||'',description:item.description||'',price:item.price??'',currency:item.currency||'EUR',image_url:item.image_url||'',active:item.active!==false})}
  const remove=async(id)=>{if(!window.confirm('Удалить позицию из каталога?'))return;await api.deleteCatalogItem(projectId,id);setItems(v=>v.filter(x=>x.id!==id));if(editing===id)reset()}
  const openOrder=(item)=>{
    setOrderItems([{...item,quantity:1}])
    setOrderClient('')
    setOrderOpen(true)
  }
  const changeQty=(id,delta)=>setOrderItems(v=>v.map(x=>x.id===id?{...x,quantity:Math.max(1,x.quantity+delta)}:x))
  const createOrder=async()=>{
    if(!orderItems.length) return
    setOrderSaving(true)
    try{
      const r=await api.createOrder({project_id:projectId,client_id:orderClient||null,currency:orderItems[0].currency||'EUR',items:orderItems.map(x=>({catalog_id:x.id,quantity:x.quantity}))})
      setOrderOpen(false)
      setOrderItems([])
      window.alert('Заказ '+r.order.number+' создан. Теперь его можно оплатить и выставить счёт в разделе «Заказы».')
    }catch(err){
      let message=err.message||'Не удалось создать заказ'
      try{const parsed=JSON.parse(err.message);message=parsed.error||message}catch{}
      window.alert(message)
    }finally{setOrderSaving(false)}
  }
  const orderTotal=orderItems.reduce((sum,x)=>sum+Number(x.price||0)*Number(x.quantity||1),0)
  return <div className="catalog-layout">
    <section className="card workspace-card">
      <div className="card-head"><div><h2>Каталог</h2><span>{items.length} позиций · данные доступны сайту и Mini App</span></div><button className="filter" onClick={reset}>Новая позиция</button></div>
      {loading?<div className="empty-editor"><span>Загружаем каталог…</span></div>:items.length===0?<div className="empty-editor"><Layers3 size={24}/><b>Каталог пока пуст</b><span>Добавьте первую услугу или товар справа.</span></div>:
      <div className="catalog-list">{items.map(item=><div className="catalog-row" key={item.id}><div className="catalog-thumb">{item.image_url?<img src={item.image_url} alt="" loading="lazy"/>:item.name.slice(0,1)}</div><div className="catalog-main"><b>{item.name}</b><span>{item.description||'Без описания'}</span></div><div className="catalog-price">{item.price!=null?new Intl.NumberFormat('ru-RU',{style:'currency',currency:item.currency||'EUR'}).format(Number(item.price)):'Цена по запросу'}</div><span className={item.active?'status success':'status draft'}><i/>{item.active?'Активна':'Скрыта'}</span><div className="catalog-actions"><button className="filter" onClick={()=>openOrder(item)}>Создать заказ</button><button className="filter" onClick={()=>edit(item)}>Изменить</button><button className="row-more" onClick={()=>remove(item.id)}><X size={16}/></button></div></div>)}</div>}
    </section>
    <section className="card workspace-card catalog-form">
      <div className="eyebrow">{editing?'Редактирование':'Новая позиция'}</div><h3>{editing?'Изменить позицию':'Добавить в каталог'}</h3>
      <label className="workspace-label">Название<input value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} placeholder="Например, Стрижка"/></label>
      <label className="workspace-label">Описание<textarea value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} placeholder="Короткое описание услуги или товара"/></label><label className="workspace-label">Изображение<input type="url" value={form.image_url} onChange={e=>setForm(v=>({...v,image_url:e.target.value}))} placeholder="https://..."/></label>
      <div className="catalog-form-grid"><label className="workspace-label">Цена<input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm(v=>({...v,price:e.target.value}))} placeholder="35"/></label><label className="workspace-label">Валюта<select value={form.currency} onChange={e=>setForm(v=>({...v,currency:e.target.value}))}><option>EUR</option><option>USD</option><option>RUB</option></select></label></div>
      <label className="catalog-check"><input type="checkbox" checked={form.active} onChange={e=>setForm(v=>({...v,active:e.target.checked}))}/> Показывать клиентам</label>
      <div className="setting-actions"><button className="filter" onClick={reset}>Очистить</button><button className="primary" onClick={save} disabled={saving}>{saving?'Сохраняем…':editing?'Сохранить':'Добавить'}</button></div>
    </section>
    {orderOpen&&<div className="public-modal-backdrop" onMouseDown={()=>setOrderOpen(false)}><section className="card order-creator" onMouseDown={e=>e.stopPropagation()}>
      <button className="public-close" onClick={()=>setOrderOpen(false)}><X size={18}/></button>
      <div className="eyebrow">Продажи</div><h2>Создать заказ</h2><p className="order-creator-note">Позиция из каталога попадёт в реестр заказов. После создания можно принять оплату и выписать счёт.</p>
      <div className="order-creator-lines">{orderItems.map(item=><div className="order-creator-line" key={item.id}><div><b>{item.name}</b><span>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:item.currency||'EUR'}).format(Number(item.price||0))} за шт.</span></div><div className="qty-control"><button type="button" onClick={()=>changeQty(item.id,-1)}>−</button><b>{item.quantity}</b><button type="button" onClick={()=>changeQty(item.id,1)}>+</button></div><strong>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:item.currency||'EUR'}).format(Number(item.price||0)*Number(item.quantity||1))}</strong></div>)}</div>
      <label className="workspace-label">Клиент<select value={orderClient} onChange={e=>setOrderClient(e.target.value)}><option value="">Без клиента</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?' · '+c.phone:''}</option>)}</select></label>
      {!clients.length&&<div className="order-creator-empty">В CRM пока нет клиентов. Заказ можно создать без клиента, а клиент будет привязан автоматически при покупке с сайта или Mini App.</div>}
      <div className="order-creator-total"><span>Итого</span><strong>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:orderItems[0]?.currency||'EUR'}).format(orderTotal)}</strong></div>
      <div className="setting-actions"><button className="filter" onClick={()=>setOrderOpen(false)}>Отмена</button><button className="primary" disabled={orderSaving||!orderItems.length} onClick={createOrder}>{orderSaving?'Создаём…':'Создать заказ'}</button></div>
    </section></div>}
  </div>
}

function ProjectWorkspace({project,data,view,setView,onBack,onRefresh}) {
  
  const current=data?.project||project, pages=data?.pages||[];
  const [saving,setSaving]=useState(false), [name,setName]=useState(''), [domain,setDomain]=useState('');
  const [device,setDevice]=useState('desktop');
  const [tg,setTg]=useState({enabled:false,configured:false,botUsername:'',buttonText:'Открыть Mini App',url:''});
  const [telegramBusy,setTelegramBusy]=useState(false);
  const [domainBusy,setDomainBusy]=useState(false), [domainInfo,setDomainInfo]=useState(null);
  const [analytics,setAnalytics]=useState(null), [openFaq,setOpenFaq]=useState({});
  const [pageId,setPageId]=useState(null), [blocks,setBlocks]=useState([]);
  const [theme,setTheme]=useState({accent:'#111827',background:'#ffffff',text:'#111827',font:'Inter',radius:'14px',button:'solid',maxWidth:'1180px'});
  const page=pages.find(p=>p.id===pageId)||pages[0];
  useEffect(()=>{
    setName(current.name||''); setDomain(current.domain||'');
    const mini=current.settings?.miniApp||{};
    setTg({enabled:mini.enabled===true || String(current.project_type||'').includes('miniapp'),configured:mini.configured===true,botUsername:mini.botUsername||'',buttonText:mini.buttonText||'Открыть Mini App',url:mini.url||''});
    const p=pages.find(x=>x.id===pageId)||pages[0];
    if(p){setPageId(p.id);setBlocks(p.content?.blocks||[]);setTheme(v=>({...v,...(p.content?.theme||{})}))}
  },[current.id,current.name,current.domain,pages.length,pageId,JSON.stringify(current.settings||{})]);

  useEffect(()=>{api.projectAnalytics(current.id).then(r=>setAnalytics(r.metrics||null)).catch(()=>setAnalytics(null))},[current.id]);

  const updateBlock=(index,patch)=>setBlocks(v=>v.map((b,i)=>i===index?{...b,...patch}:b));
  const addItem=(index)=>setBlocks(v=>v.map((b,i)=>i===index?{...b,items:[...(b.items||[]),'Новый элемент']}:b));
  const updateItem=(index,itemIndex,value)=>setBlocks(v=>v.map((b,i)=>i===index?{...b,items:(b.items||[]).map((x,j)=>j===itemIndex?value:x)}:b));
  const updateItemImage=(index,itemIndex,value)=>setBlocks(v=>v.map((b,i)=>i===index?{...b,images:(b.images||[]).map((x,j)=>j===itemIndex?value:x)}:b));
  const removeItem=(index,itemIndex)=>setBlocks(v=>v.map((b,i)=>i===index?{...b,items:(b.items||[]).filter((_,j)=>j!==itemIndex)}:b));
  const updateBlockStyle=(index,patch)=>setBlocks(v=>v.map((b,i)=>i===index?{...b,style:{...(b.style||{}),...patch}}:b));
  const blockStyle=(b)=>({background:b.style?.background||'transparent',color:b.style?.color||'inherit',textAlign:b.style?.align||'left',padding:b.style?.padding||'24px',borderRadius:b.style?.radius||theme.radius});
  const addBlock=(type)=>{
    const defaults={
      hero:{type:'hero',headline:'Ваш бизнес. Онлайн.',subheadline:'Понятный цифровой опыт для ваших клиентов.',cta:'Оставить заявку',action:'lead',link:''},
      services:{type:'services',title:'Услуги',items:['Основная услуга','Популярная услуга','Премиум услуга'],columns:3,action:'booking'},
      contacts:{type:'contacts',title:'Контакты',text:'Свяжитесь с нами удобным способом.'},
      gallery:{type:'gallery',title:'Галерея',items:['Фото 1','Фото 2','Фото 3'],images:['','',''],columns:3},
      testimonials:{type:'testimonials',title:'Отзывы',items:['«Отличный сервис и внимательное отношение.»','«Всё удобно: запись заняла меньше минуты.»'],columns:2},
      faq:{type:'faq',title:'Частые вопросы',items:['Как записаться? — Оставьте заявку на сайте.','Как оплатить? — Онлайн или при получении.'],openFirst:false},
      cta:{type:'cta',title:'Готовы начать?',text:'Оставьте заявку — мы свяжемся с вами.',button:'Оставить заявку',action:'lead',link:''}
    };
    setBlocks(v=>[...v,defaults[type]]);
  };
  const removeBlock=(index)=>setBlocks(v=>v.filter((_,i)=>i!==index));
  const moveBlock=(index,dir)=>setBlocks(v=>{const n=index+dir;if(n<0||n>=v.length)return v;const a=[...v];[a[index],a[n]]=[a[n],a[index]];return a});
  const saveEditor=async()=>{
    if(!page)return;
    setSaving(true);
    try{await api.updatePage(current.id,page.id,{content:{blocks,theme}});await onRefresh()}
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
      <aside className="card editor-sidebar">
        <div className="eyebrow">Редактор</div><h3>{page?.title||'Главная'}</h3><p>Собирайте страницу из готовых блоков.</p>
        {['hero','services','contacts','gallery','testimonials','faq','cta'].map(type=><button key={type} className="editor-add" onClick={()=>addBlock(type)}><Plus size={14}/>{type==='hero'?'Первый экран':type==='services'?'Услуги / каталог':type==='contacts'?'Контакты':type==='gallery'?'Галерея':type==='testimonials'?'Отзывы':type==='faq'?'FAQ':'CTA-блок'}</button>)}
        <div className="editor-hint">Блоки можно перемещать, удалять и сохранять.</div>
      </aside>
      <section className="card editor-canvas">
        <div className="editor-toolbar"><div><b>{page?.title||'Главная'}</b><span>{blocks.length} блоков</span></div><div className="editor-device"><button className={device==='desktop'?'selected':''} onClick={()=>setDevice('desktop')}>ПК</button><button className={device==='mobile'?'selected':''} onClick={()=>setDevice('mobile')}>Телефон</button><button className="primary" onClick={saveEditor} disabled={saving}>{saving?'Сохраняем…':'Сохранить'}</button></div></div>
        <div className="editor-theme card"><div className="eyebrow">Оформление</div><div className="theme-grid"><label>Акцент<input type="color" value={theme.accent} onChange={e=>setTheme(v=>({...v,accent:e.target.value}))}/></label><label>Фон<input type="color" value={theme.background} onChange={e=>setTheme(v=>({...v,background:e.target.value}))}/></label><label>Текст<input type="color" value={theme.text} onChange={e=>setTheme(v=>({...v,text:e.target.value}))}/></label><label>Шрифт<select value={theme.font} onChange={e=>setTheme(v=>({...v,font:e.target.value}))}><option>Inter</option><option>Arial</option><option>Georgia</option></select></label></div></div>
        <div className="editor-stack">{blocks.length===0&&<div className="empty-editor"><Palette size={24}/><b>Страница пока пустая</b><span>Добавьте первый блок слева.</span></div>}
          {blocks.map((b,i)=><div className="editable-block" key={i} style={blockStyle(b)}>
            <div className="block-controls"><span>{i+1}</span><b>{b.type}</b><button onClick={()=>moveBlock(i,-1)} disabled={i===0}>↑</button><button onClick={()=>moveBlock(i,1)} disabled={i===blocks.length-1}>↓</button><button onClick={()=>removeBlock(i)}>Удалить</button></div>
            <div className="block-form">
              <label>Заголовок<input value={b.headline||b.title||''} onChange={e=>updateBlock(i,{headline:b.type==='hero'?e.target.value:b.headline,title:b.type==='hero'?b.title:e.target.value})}/></label>
              {b.type==='hero'&&<label>Подзаголовок<textarea value={b.subheadline||''} onChange={e=>updateBlock(i,{subheadline:e.target.value})}/></label>}
              {b.type==='cta'&&<label>Текст<textarea value={b.text||''} onChange={e=>updateBlock(i,{text:e.target.value})}/></label>}
              {(b.type==='services'||b.type==='gallery'||b.type==='testimonials'||b.type==='faq')&&<div className="item-editor">{(b.items||[]).map((item,j)=><div className="item-editor-row" key={j}><input value={item} onChange={e=>updateItem(i,j,e.target.value)}/><button type="button" onClick={()=>removeItem(i,j)}>×</button></div>)}<button type="button" className="filter" onClick={()=>addItem(i)}>+ Добавить элемент</button></div>}
            </div>
          </div>)}
        </div>
      </section>
    </div>}
    {view==='preview'&&<div className="card preview-shell"><div className="preview-top"><b>{current.name}</b><span>{domain||'preview.nexora.site'}</span></div><div className={`public-preview ${device==='mobile'?'preview-mobile':''}`} style={{'--preview-accent':theme.accent,'--preview-bg':theme.background,'--preview-text':theme.text,'--preview-radius':theme.radius,'--preview-font':theme.font}}>{blocks.map((b,i)=><div key={i} className={b.type==='hero'?'preview-hero':'preview-section'}>{b.type==='hero'?<><small>ПРЕДПРОСМОТР</small><h1>{b.headline}</h1><p>{b.subheadline}</p><button onClick={()=>b.link?window.open(b.link,'_blank'):null}>{b.cta}</button></>:b.type==='services'?<><span>{b.title}</span><div className="preview-services" style={{gridTemplateColumns:`repeat(${b.columns||1},minmax(0,1fr))`}}>{(b.items||[]).map((x,j)=><div className="preview-card" key={j}>{b.type==='gallery'&&(b.images||[])[j]&&<img src={b.images[j]} alt=""/>}<b>{x}</b></div>)}</div></>:b.type==='cta'?<><h2>{b.title}</h2><p>{b.text}</p><button>{b.button}</button></>:<><h2>{b.title}</h2><div className="preview-services">{(b.items||[]).map(x=><b key={x}>{x}</b>)}</div></>}</div>)}{!blocks.length&&<div className="empty-editor"><b>Нет блоков</b><span>Добавьте блоки в редакторе.</span></div>}</div></div>}

    {view==='settings'&&<div className="workspace-settings">
      <div className="card workspace-card"><div className="eyebrow">Настройки проекта</div><h2>Основные параметры</h2><label className="workspace-label">Название проекта<input value={name} onChange={e=>setName(e.target.value)}/></label><label className="workspace-label">Домен<input placeholder="client.ru" value={domain} onChange={e=>{setDomain(e.target.value);setDomainInfo(null)}}/></label>
        <div className="domain-actions"><button className="filter" disabled={domainBusy||!domain.trim()} onClick={async()=>{setDomainBusy(true);try{setDomainInfo(await api.checkDomain(current.id,domain))}catch(e){setDomainInfo({error:e.message||'Не удалось проверить домен'})}finally{setDomainBusy(false)}}}>{domainBusy?'Проверяем…':'Проверить домен'}</button><button className="primary" disabled={domainBusy||!domain.trim()} onClick={async()=>{setDomainBusy(true);try{const r=await api.connectDomain(current.id,domain);setDomain(r.domain.domain||r.domain||domain);setDomainInfo({connected:true})}catch(e){setDomainInfo({error:e.message||'Не удалось подключить домен'})}finally{setDomainBusy(false)}}}>Подключить</button></div>
        {domainInfo&&<div className="domain-info">{domainInfo.error?<span className="status error"><i/>{domainInfo.error}</span>:domainInfo.dns?<><span className="status success"><i/>Домен свободен</span><small>Добавьте DNS: <b>{domainInfo.dns.type}</b> · {domainInfo.dns.host} → <b>{domainInfo.dns.value}</b></small></>:<span className="status success"><i/>Домен подключён</span>}</div>}
        <div className="setting-actions"><button className="primary" onClick={saveSettings} disabled={saving}>{saving?'Сохраняем…':'Сохранить'}</button></div></div>
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
 
createRoot(document.getElementById('root')).render(<AppErrorBoundary><Root /></AppErrorBoundary>)