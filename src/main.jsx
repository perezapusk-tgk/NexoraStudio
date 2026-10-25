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
  ['Заказы', ShoppingCart],
  ['Счета', Receipt],
  ['Сайты', Globe2],
  ['Mini Apps', Smartphone],
  ['Аналитика', BarChart3],
  ['Оплата', CreditCard],
  ['Шаблоны', Layers3],
  ['Настройки', Settings],
]

const projects = [
  { name: 'Barber House', type: 'Сайт + Mini App', status: 'Опубликован', color: 'dark', leads: 18, bookings: 12, revenue: '₽115 000', updated: 'сегодня' },
  { name: 'Nordic Beauty', type: 'Сайт', status: 'В работе', color: 'blue', leads: 11, bookings: 4, revenue: '₽57 500', updated: '2 ч назад' },
  { name: 'Urban Fitness', type: 'Mini App', status: 'Опубликован', color: 'purple', leads: 8, bookings: 7, revenue: '₽128 000', updated: 'вчера' },
  { name: 'Mokka Coffee', type: 'Сайт + каталог', status: 'Черновик', color: 'orange', leads: 0, bookings: 0, revenue: '₽0', updated: 'вчера' },
]

const activities = [
  ['Новая заявка', 'Barber House', '2 мин назад', 'lead'],
  ['Бронирование подтверждено', 'Urban Fitness', '18 мин назад', 'booking'],
  ['Сайт опубликован', 'Nordic Beauty', '2 ч назад', 'site'],
  ['Получен платёж', 'Barber House · ₽5 900', '3 ч назад', 'payment'],
]

class PublicErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={error:null,retry:0}}
  static getDerivedStateFromError(error){return {error}}
  retry=()=>this.setState(v=>({error:null,retry:v.retry+1}))
  render(){
    if(this.state.error) return <div className="public-error"><div className="public-error-icon"><Globe2 size={28}/></div><b>Не удалось открыть проект</b><span>Публичная страница столкнулась с временной ошибкой. Попробуйте повторить загрузку.</span><button className="primary" onClick={this.retry}>Повторить</button><button className="filter" onClick={()=>location.reload()}>Обновить страницу</button><a href="/">На главную Nexora</a></div>
    const child=this.props.children
    return <>{typeof child==='function'?child(this.state.retry):child}</>
  }
}
function PublicApp({mode,slug}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0)
  useEffect(()=>{let alive=true;setData(null);setError('');api.publicProject(slug).then(v=>{if(!alive)return;const safe={project:v?.project||{name:'Nexora'},pages:Array.isArray(v?.pages)?v.pages:[],catalog:Array.isArray(v?.catalog)?v.catalog:[]};setData(safe)}).catch(e=>alive&&setError(e?.message||'Проект не найден'));return()=>{alive=false}},[slug,retry])
  if(error) return <div className="public-error"><div className="public-error-icon"><Globe2 size={28}/></div><b>Не удалось открыть проект</b><span>Проект временно недоступен. Попробуйте повторить загрузку.</span><button className="primary" onClick={()=>setRetry(v=>v+1)}>Повторить</button><a href="/">На главную Nexora</a></div>
  if(!data) return <div className="public-loading"><div className="public-loading-card"><div className="brand-mark">N</div><b>Загрузка проекта…</b><span>Подготавливаем {mode==='miniapp'?'Mini App':'сайт'}</span></div></div>
  return mode==='miniapp'?<PublicMiniApp data={data} slug={slug}/>:<PublicSite data={data} slug={slug}/>
}

function PublicActionModal({mode,onClose,onSuccess,slug,serviceName=''}){
  const [form,setForm]=useState({name:'',phone:'',email:'',message:'',starts_at:'',service_name:serviceName});
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const submit=async(e)=>{e.preventDefault();setBusy(true);setError('');try{const payload=mode==='booking'?{...form,service_name:form.service_name||serviceName}:{...form};const r=mode==='booking'?await api.publicBooking(slug,payload):await api.publicLead(slug,payload);onSuccess(r[mode==='booking'?'booking':'lead']);}catch(err){setError('Не удалось отправить форму. Проверьте данные и попробуйте ещё раз.')}finally{setBusy(false)}};
  return <div className="public-modal-backdrop" onMouseDown={onClose}><form className="public-modal card" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><button type="button" className="public-close" onClick={onClose}><X size={18}/></button><div className="eyebrow">{mode==='booking'?'Онлайн-запись':'Новая заявка'}</div><h2>{mode==='booking'?'Записаться':'Оставить заявку'}</h2><p>{mode==='booking'?'Выберите удобное время — заявка сразу появится в бронированиях.':'Оставьте контакты — заявка сразу появится в разделе «Заявки».'}</p>{serviceName&&<label>Услуга<input value={form.service_name} onChange={e=>setForm(v=>({...v,service_name:e.target.value}))}/></label>}<label>Имя<input required value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Телефон<input required={mode==='booking'} value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label>{mode==='booking'?<label>Дата и время<input required type="datetime-local" value={form.starts_at} onChange={e=>setForm(v=>({...v,starts_at:e.target.value}))}/></label>:<label>Сообщение<textarea rows="4" value={form.message} onChange={e=>setForm(v=>({...v,message:e.target.value}))}/></label>}{error&&<div className="form-error">{error}</div>}<button className="primary" disabled={busy}>{busy?'Отправляем…':mode==='booking'?'Подтвердить запись':'Отправить заявку'}</button></form></div>
}

function PublicSite({data,slug}){
  const project=data.project,pages=data.pages||[],page=pages[0],blocks=page?.content?.blocks||[],catalog=(data.catalog||[]).filter(x=>x.active!==false),theme={accent:'#111827',background:'#ffffff',text:'#111827',font:'Inter',radius:'14px',...(page?.content?.theme||{})};
  const [modal,setModal]=useState(null),[sent,setSent]=useState(null),[cart,setCart]=useState([]),[openCart,setOpenCart]=useState(false),[form,setForm]=useState({name:'',phone:'',email:''}),[sending,setSending]=useState(false);
  useEffect(()=>{api.publicEvent(slug,{event_type:'page_view',path:window.location.pathname}).catch(()=>{})},[slug]);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const payment=params.get('payment');
    const orderId=params.get('order_id');
    if(!orderId||!['success','cancel'].includes(payment))return;
    let alive=true,attempt=0,timer;
    const clearQuery=()=>{try{const url=new URL(window.location.href);url.searchParams.delete('payment');url.searchParams.delete('order_id');window.history.replaceState({},'',url.pathname+(url.search?url.search:'')+url.hash)}catch{}};
    const check=async()=>{
      if(!alive)return;
      attempt+=1;
      try{
        const result=await api.publicOrderPaymentStatus(orderId,slug);
        const order=result?.order;
        if(order?.status==='paid'){
          setSent({number:order.number||order.id,paymentConfirmed:true});
          clearQuery();
          return;
        }
      }catch{}
      if(payment==='cancel'){setSent({number:orderId,paymentCancelled:true});clearQuery();return}
      if(attempt<12)timer=setTimeout(check,1500);
      else {setSent({number:orderId,paymentPending:true});clearQuery()}
    };
    check();
    return()=>{alive=false;if(timer)clearTimeout(timer)};
  },[slug]);
  const add=item=>setCart(v=>{const found=v.find(x=>x.id===item.id);return found?v.map(x=>x.id===item.id?{...x,quantity:x.quantity+1}:x):[...v,{...item,quantity:1}]});
  const change=(id,delta)=>setCart(v=>v.map(x=>x.id===id?{...x,quantity:Math.max(0,x.quantity+delta)}:x).filter(x=>x.quantity>0));
  const total=cart.reduce((s,x)=>s+Number(x.price||0)*x.quantity,0);
  const action=(b,serviceName='')=>{if(b?.action==='booking')setModal({mode:'booking',serviceName});else if(b?.action==='link'&&b.link)window.open(b.link,'_blank');else setModal({mode:'lead',serviceName})};
  const checkout=async e=>{e.preventDefault();if(!cart.length)return;setSending(true);try{const result=await api.publicCheckout(slug,{name:form.name,phone:form.phone,email:form.email,surface:'site',items:cart.map(x=>({catalog_id:x.id,quantity:x.quantity}))});if(result?.checkout_url){window.location.assign(result.checkout_url);return}setSent({number:result?.order?.number||result?.order?.id||'—',paymentPending:true});setOpenCart(false);setCart([]);setForm({name:'',phone:'',email:''})}catch(error){setSent({error:'Не удалось оформить заказ. Проверьте данные и попробуйте ещё раз.'});}finally{setSending(false)}};
  const done=v=>{setSent(v);setModal(null)};
  return <div className="public-app"><header className="public-nav"><b>{project.name}</b><span>Сайт</span>{cart.length>0&&<button className="filter" onClick={()=>setOpenCart(true)}>Корзина · {cart.reduce((s,x)=>s+x.quantity,0)}</button>}</header><main className="public-site" style={{'--public-accent':theme.accent,'--public-bg':theme.background,'--public-text':theme.text,'--public-radius':theme.radius,'--public-font':theme.font}}>
    {blocks.map((b,i)=>b.type==='hero'?<section className="public-hero" key={i}><small>NEXORA</small><h1>{b.headline}</h1><p>{b.subheadline}</p><button onClick={()=>action(b)}>{b.cta||'Оставить заявку'}</button></section>:b.type==='services'?<section className="public-block" key={i}><div className="public-kicker">{b.title}</div><div className="public-cards" style={{gridTemplateColumns:`repeat(${b.columns||3},minmax(0,1fr))`}}>{(b.items||[]).map((x,j)=><article key={j}><b>{x}</b><span>Подробности и запись доступны онлайн.</span><button className="text-action" onClick={()=>action(b,x)}>{b.action==='link'?'Подробнее →':b.action==='booking'?'Записаться →':'Оставить заявку →'}</button></article>)}</div></section>:b.type==='gallery'?<section className="public-block" key={i}><div className="public-kicker">{b.title}</div><div className="public-cards" style={{gridTemplateColumns:`repeat(${b.columns||3},minmax(0,1fr))`}}>{(b.items||[]).map((x,j)=><article key={j}>{(b.images||[])[j]&&<img src={b.images[j]} alt="" loading="lazy"/>}<b>{x}</b></article>)}</div></section>:b.type==='testimonials'?<section className="public-block" key={i}><div className="public-kicker">{b.title}</div><div className="public-cards" style={{gridTemplateColumns:`repeat(${b.columns||2},minmax(0,1fr))`}}>{(b.items||[]).map((x,j)=><article key={j}><b>{x}</b></article>)}</div></section>:b.type==='faq'?<section className="public-block" key={i}><div className="public-kicker">{b.title}</div><div className="preview-faq">{(b.items||[]).map((x,j)=>{const [q,...rest]=String(x).split(' — ');return <div className="preview-faq-row" key={j}><details open={j===0&&b.openFirst}><summary>{q}</summary><p>{rest.join(' — ')||'Ответ будет добавлен.'}</p></details></div>})}</div></section>:b.type==='cta'?<section className="public-block public-cta" key={i}><div className="public-kicker">{b.title}</div><p>{b.text}</p><button onClick={()=>action(b)}>{b.button||'Оставить заявку'}</button></section>:<section className="public-block" key={i}><div className="public-kicker">{b.title}</div><p>{b.text}</p></section>)}
    {catalog.length>0&&<section className="public-block"><div className="public-kicker">Каталог</div><div className="public-cards">{catalog.map(x=><article key={x.id}><b>{x.name}</b><span>{x.description||'Услуга или товар'}</span><strong>{x.price!=null?new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(Number(x.price)):'По запросу'}</strong><button className="text-action" onClick={()=>add(x)}>В корзину →</button><button className="text-action" onClick={()=>setModal({mode:'booking',serviceName:x.name})}>Записаться →</button></article>)}</div></section>}
  </main>
  {cart.length>0&&<div className="public-cart card"><div><b>Корзина</b><span>{cart.reduce((s,x)=>s+x.quantity,0)} позиции · {new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(total)}</span></div><button className="primary" onClick={()=>setOpenCart(true)}>Оформить заказ</button></div>}
  {modal&&<PublicActionModal mode={modal.mode} serviceName={modal.serviceName} slug={slug} onClose={()=>setModal(null)} onSuccess={done}/>} 
  {sent&&!openCart&&<div className="public-modal-backdrop" onMouseDown={()=>setSent(null)}><div className="public-modal card" onMouseDown={e=>e.stopPropagation()}><div className="public-success">{sent.error?<><h2>Не удалось оформить заказ</h2><p>{sent.error}</p></>:<><CheckCircle2 size={30}/><h2>{sent.paymentConfirmed?'Оплата подтверждена':sent.paymentCancelled?'Оплата отменена':sent.number?'Заказ принят':'Заявка отправлена'}</h2><p>{sent.paymentConfirmed?<span>Платёж успешно подтверждён. Заказ № <b>{sent.number}</b> принят в работу.</span>:sent.paymentCancelled?<span>Платёж не завершён. Заказ № <b>{sent.number}</b> можно оплатить повторно.</span>:sent.number?<span>Номер заказа: <b>{sent.number}</b><br/><span>{sent.paymentPending?'Платёж ещё обрабатывается. Обновите страницу через минуту, если статус не изменится.':'Заказ сохранён и передан в рабочее пространство.'}</span></span>:<span>Спасибо! Мы получили ваши данные и скоро свяжемся с вами.</span>}</p></>}<button type="button" onClick={()=>setSent(null)}>Готово</button></div></div></div>}
  {openCart&&<div className="public-modal-backdrop" onMouseDown={()=>setOpenCart(false)}><form className="public-modal card" onSubmit={checkout} onMouseDown={e=>e.stopPropagation()}><button type="button" className="public-close" onClick={()=>setOpenCart(false)}><X size={18}/></button>{sent?<div className="public-success"><CheckCircle2 size={30}/><h2>{sent.paymentConfirmed?'Оплата подтверждена':sent.paymentCancelled?'Оплата отменена':'Заказ оформлен'}</h2><p>{sent.paymentConfirmed?'Платёж успешно подтверждён.':sent.paymentCancelled?'Платёж не завершён.':'Заказ создан. Номер: '}<b>{sent.number}</b></p><button type="button" onClick={()=>{setSent(null);setOpenCart(false)}}>Готово</button></div>:<><div className="eyebrow">Оформление заказа</div><h2>Ваш заказ</h2><div className="checkout-lines">{cart.map(x=><div key={x.id}><span>{x.name} × {x.quantity}</span><b>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(Number(x.price||0)*x.quantity)}</b><button type="button" onClick={()=>change(x.id,-1)}>−</button><button type="button" onClick={()=>change(x.id,1)}>+</button></div>)}</div><strong className="checkout-total">Итого: {new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(total)}</strong><label>Имя<input required value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Телефон<input value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label><button className="primary" disabled={sending||!cart.length}>{sending?'Оформляем…':'Подтвердить заказ'}</button></>}</form></div>}
  </div>
}

function PublicMiniApp({data,slug}){
  const project=data.project,pages=data.pages||[],page=pages[0],blocks=page?.content?.blocks||[],catalog=(data.catalog||[]).filter(x=>x.active!==false);
  const theme={accent:'#17191d',background:'#f5f6f8',text:'#17191d',...(page?.content?.theme||{})};
  const hero=blocks.find(b=>b.type==='hero'), services=blocks.find(b=>b.type==='services');
  const [modal,setModal]=useState(null),[open,setOpen]=useState(false),[sent,setSent]=useState(null),[cart,setCart]=useState([]),[form,setForm]=useState({name:'',phone:'',email:''}),[sending,setSending]=useState(false);
  useEffect(()=>{api.publicEvent(slug,{event_type:'page_view',path:window.location.pathname,metadata:{surface:'miniapp'}}).catch(()=>{})},[slug]);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const payment=params.get('payment');
    const orderId=params.get('order_id');
    if(!orderId||!['success','cancel'].includes(payment))return;
    let alive=true,attempt=0,timer;
    const clearQuery=()=>{try{const url=new URL(window.location.href);url.searchParams.delete('payment');url.searchParams.delete('order_id');window.history.replaceState({},'',url.pathname+(url.search?url.search:'')+url.hash)}catch{}};
    const check=async()=>{
      if(!alive)return;
      attempt+=1;
      try{
        const result=await api.publicOrderPaymentStatus(orderId,slug);
        const order=result?.order;
        if(order?.status==='paid'){
          setSent({number:order.number||order.id,paymentConfirmed:true});
          clearQuery();
          return;
        }
      }catch{}
      if(payment==='cancel'){setSent({number:orderId,paymentCancelled:true});clearQuery();return}
      if(attempt<12)timer=setTimeout(check,1500);
      else {setSent({number:orderId,paymentPending:true});clearQuery()}
    };
    check();
    return()=>{alive=false;if(timer)clearTimeout(timer)};
  },[slug]);
  useEffect(()=>{
    const webApp=window.Telegram?.WebApp;
    if(!webApp) return;
    const root=document.documentElement;
    const applyTelegramTheme=()=>{
      try{
        const tp=webApp.themeParams||{};
        if(tp.bg_color) root.style.setProperty('--tg-bg',tp.bg_color);
        if(tp.text_color) root.style.setProperty('--tg-text',tp.text_color);
        if(tp.hint_color) root.style.setProperty('--tg-hint',tp.hint_color);
        if(tp.button_color) root.style.setProperty('--tg-button',tp.button_color);
        if(tp.button_text_color) root.style.setProperty('--tg-button-text',tp.button_text_color);
        if(tp.secondary_bg_color) root.style.setProperty('--tg-secondary-bg',tp.secondary_bg_color);
      }catch{}
    };
    try{
      webApp.ready();
      webApp.expand();
      applyTelegramTheme();
      webApp.onEvent?.('themeChanged',applyTelegramTheme);
      if(webApp.enableClosingConfirmation) webApp.enableClosingConfirmation();
    }catch{}
    return()=>{
      try{
        webApp.offEvent?.('themeChanged',applyTelegramTheme);        if(webApp.disableClosingConfirmation) webApp.disableClosingConfirmation();
        ['--tg-bg','--tg-text','--tg-hint','--tg-button','--tg-button-text','--tg-secondary-bg'].forEach(k=>root.style.removeProperty(k));
      }catch{}
    };
  },[]);
  useEffect(()=>{
    const webApp=window.Telegram?.WebApp;
    if(!webApp?.BackButton) return;
    const close=()=>{
      if(open) setOpen(false);
      else if(modal) setModal(null);
      else if(sent) setSent(null);
      else if(typeof webApp.close==='function') webApp.close();
    };
    try{webApp.BackButton.onClick(close); if(open||modal||sent) webApp.BackButton.show(); else webApp.BackButton.hide()}catch{}
    return()=>{try{webApp.BackButton.offClick(close);webApp.BackButton.hide()}catch{}};
  },[open,modal,sent]);
  const add=item=>setCart(v=>{const found=v.find(x=>x.id===item.id);return found?v.map(x=>x.id===item.id?{...x,quantity:x.quantity+1}:x):[...v,{...item,quantity:1}]});
  const change=(id,d)=>setCart(v=>v.map(x=>x.id===id?{...x,quantity:Math.max(0,x.quantity+d)}:x).filter(x=>x.quantity>0));
  const total=cart.reduce((s,x)=>s+Number(x.price||0)*x.quantity,0);
  const checkout=async e=>{e.preventDefault();if(!cart.length)return;setSending(true);try{const result=await api.publicCheckout(slug,{name:form.name,phone:form.phone,email:form.email,surface:'miniapp',items:cart.map(x=>({catalog_id:x.id,quantity:x.quantity}))});if(result?.checkout_url){window.location.assign(result.checkout_url);return}setSent({number:result?.order?.number||result?.order?.id||'—',paymentPending:true});setOpen(false);setCart([]);setForm({name:'',phone:'',email:''})}catch(error){setSent({error:'Не удалось оформить заказ. Проверьте данные и попробуйте ещё раз.'});}finally{setSending(false)}};
  return <div className="mini-public" style={{background:theme.background,color:theme.text,'--mini-accent':theme.accent}}>
    <div className="mini-public-top"><div><b>{project.name}</b><span>Telegram Mini App</span></div>{cart.length>0&&<button className="filter" onClick={()=>setOpen(true)}>Корзина · {cart.reduce((s,x)=>s+x.quantity,0)}</button>}</div>
    <section className="mini-public-hero" style={{background:theme.accent}}>
      <small>ОНЛАЙН-СЕРВИС</small><h1>{hero?.headline||project.name}</h1><p>{hero?.subheadline||'Каталог, заявки и запись — прямо внутри Telegram.'}</p><button onClick={()=>setModal({mode:hero?.action==='booking'?'booking':'lead'})}>{hero?.cta||'Оставить заявку'}</button>
    </section>
    {services&&<section className="mini-public-section"><div className="public-kicker">{services.title||'Услуги'}</div><div className="mini-public-services">{(services.items||[]).map((x,j)=><button className="mini-service-card" key={j} onClick={()=>setModal({mode:services.action==='booking'?'booking':'lead',serviceName:x})}><b>{x}</b><span>Подробнее и запись онлайн</span><strong>{services.action==='booking'?'Записаться':'Узнать больше'} →</strong></button>)}</div></section>}
    <section className="mini-public-section"><div className="public-kicker">Каталог</div>{catalog.length?catalog.map(x=><div className="mini-public-item" key={x.id}><div><b>{x.name}</b><span>{x.description||'Услуга или товар'}</span></div><strong>{x.price!=null?new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(Number(x.price)):'По запросу'}</strong><button onClick={()=>setModal({mode:'booking',serviceName:x.name})}>Записаться</button><button onClick={()=>add(x)}>В корзину</button></div>):<div className="mini-public-empty">Каталог будет доступен после публикации позиций.</div>}</section>
    {cart.length>0&&<div className="public-cart card"><div><b>Корзина</b><span>{cart.reduce((s,x)=>s+x.quantity,0)} позиции · {new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(total)}</span></div><button className="primary" onClick={()=>setOpen(true)}>Оформить</button></div>}
    {modal&&<PublicActionModal mode={modal.mode} serviceName={modal.serviceName} slug={slug} onClose={()=>setModal(null)} onSuccess={v=>{setSent(v);setModal(null)}}/>}
    {sent&&<div className="public-modal-backdrop" onMouseDown={()=>setSent(null)}><div className="public-modal card" onMouseDown={e=>e.stopPropagation()}><div className="public-success"><CheckCircle2 size={30}/><h2>{sent.number?'Заказ принят':'Заявка отправлена'}</h2><p>{sent.number?'Номер заказа: ':''}<b>{sent.number||'Готово'}</b></p><button onClick={()=>setSent(null)}>Готово</button></div></div></div>}
    {open&&<div className="public-modal-backdrop" onMouseDown={()=>setOpen(false)}><form className="public-modal card" onSubmit={checkout} onMouseDown={e=>e.stopPropagation()}><button type="button" className="public-close" onClick={()=>setOpen(false)}><X size={18}/></button>{sent?<div className="public-success">{sent.error?<><h2>Не удалось оформить заказ</h2><p>{sent.error}</p></>:<><CheckCircle2 size={30}/><h2>{sent.paymentConfirmed?'Оплата подтверждена':sent.paymentCancelled?'Оплата отменена':'Заказ принят'}</h2><p>{sent.paymentConfirmed?'Платёж успешно подтверждён.':sent.paymentCancelled?'Платёж не завершён.':'Номер заказа: '}<b>{sent.number}</b>{sent.paymentPending&&<><br/><span>Платёж ещё обрабатывается. Проверьте статус немного позже.</span></>}</p></>}<button type="button" onClick={()=>{setSent(null);setOpen(false)}}>Готово</button></div>:<><div className="eyebrow">Заказ</div><h2>Оформление</h2><div className="checkout-lines">{cart.map(x=><div key={x.id}><span>{x.name} × {x.quantity}</span><b>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(Number(x.price||0)*x.quantity)}</b><button type="button" onClick={()=>change(x.id,-1)}>−</button><button type="button" onClick={()=>change(x.id,1)}>+</button></div>)}</div><strong className="checkout-total">Итого: {new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(total)}</strong><label>Имя<input required value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Телефон<input value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label><button className="primary" disabled={sending||!cart.length}>{sending?'Оформляем…':'Подтвердить заказ'}</button></>}</form></div>}
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
  componentDidCatch(){/* Keep production UI free of internal error details. */}
  render(){
    if(this.state.error) return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:32,fontFamily:'Inter,system-ui',background:'#f6f7fb',color:'#111827'}}><div style={{maxWidth:520,background:'#fff',padding:28,borderRadius:18,boxShadow:'0 10px 40px rgba(0,0,0,.08)',textAlign:'center'}}><h1 style={{marginTop:0}}>Nexora Studio</h1><p style={{color:'#667085'}}>Интерфейс временно не смог загрузиться. Попробуйте обновить страницу.</p><button onClick={()=>location.reload()} style={{padding:'10px 16px',borderRadius:10,border:0,cursor:'pointer'}}>Обновить</button></div></div>
    return this.props.children
  }
}

function Root(){
  const path=window.location.pathname.split('/').filter(Boolean)
  const invite=new URLSearchParams(window.location.search).get('invite')
  const isPublic=(path[0]==='published'&&path[1])||(path[0]==='miniapp'&&path[1])
  useEffect(()=>{if(isPublic)return installLanguageObserver()},[isPublic])
  if(invite) return <InviteAcceptScreen token={invite} onAuthenticated={()=>{window.history.replaceState({},'',window.location.pathname);window.location.reload()}}/>
  if(path[0]==='published'&&path[1]) return <PublicErrorBoundary><PublicApp mode="site" slug={path[1]}/></PublicErrorBoundary>
  if(path[0]==='miniapp'&&path[1]) return <PublicErrorBoundary><PublicApp mode="miniapp" slug={path[1]}/></PublicErrorBoundary>
  return <App/>
}

function OwnerDashboard(){
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=async()=>{setLoading(true);try{setData(await api.adminOverview());setError('')}catch(e){setError(e.message||'Не удалось загрузить данные')}finally{setLoading(false)}}
  useEffect(()=>{load();const t=setInterval(load,30000);return()=>clearInterval(t)},[]);
  const metric=(value)=>new Intl.NumberFormat('ru-RU').format(Number(value||0));
  const money=(value)=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Number(value||0));
  const series=data?.series||[];
  const maxRevenue=Math.max(1,...series.map(x=>Number(x.subscription_revenue||0)));
  return <div className="app" style={{background:'#f6f7fb'}}>
    <main style={{width:'100%',padding:'32px',maxWidth:1400,margin:'0 auto'}}>
      <div className="workspace-head" style={{marginBottom:24}}>
        <div className="workspace-title"><div className="project-logo dark">N</div><div><b>Nexora Owner</b><span>Панель владельца платформы</span></div></div>
        <div className="workspace-actions"><span className="status success"><i/>Система онлайн</span><button className="filter" onClick={load}>Обновить</button><button className="filter" onClick={()=>{api.authLogout();location.reload()}}><LogOut size={14}/> Выйти</button></div>
      </div>
      <div className="card workspace-card" style={{marginBottom:18}}><div className="eyebrow">Центр владельца</div><h1 style={{marginBottom:8}}>Управление бизнесом Nexora</h1><p>Главные показатели платформы: рост студий, активность, подписочная выручка, оборот клиентов и расчётная комиссия.</p></div>
      {error&&<div className="form-error" style={{marginBottom:18}}>{error}</div>}
      {loading&&!data?<div className="card workspace-card"><b>Загружаем статистику…</b></div>:data&&<><div className="dashboard-grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))'}}>
        {[['Студии',metric(data.metrics.studios)],['Активные',metric(data.metrics.activeStudios)],['Новые за 30 дней',metric(data.metrics.newStudios30d)],['Пользователи',metric(data.metrics.users)],['Проекты',metric(data.metrics.projects)],['Заявки',metric(data.metrics.leads)],['Заказы',metric(data.metrics.orders)],['Бронирования',metric(data.metrics.bookings)]].map(([label,value])=><div className="card stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="dashboard-grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',marginTop:18}}>
        {[['Оборот клиентов',money(data.metrics.gmv)],['Доход от подписок',money(data.metrics.subscriptionRevenue)],['Доход за месяц',money(data.metrics.monthlySubscriptionRevenue)],['Доход за год',money(data.metrics.yearlySubscriptionRevenue)],['MRR',money(data.metrics.mrr)],['ARR',money(data.metrics.arr)],['Комиссия платформы',money(data.metrics.estimatedPlatformCommission)],['Активные подписки',metric(data.metrics.activePaidSubscriptions)],['Конверсия в активные',Number(data.metrics.conversionRate||0).toFixed(1)+'%'],['Churn за 30 дней',Number(data.metrics.churnRate30d||0).toFixed(1)+'%'],['Отменено за 30 дней',metric(data.metrics.cancelledStudios30d)],['Внешних платежей',metric(data.metrics.yookassaPayments)],['Успешность внешних платежей',Number(data.metrics.yookassaSuccessRate||0).toFixed(1)+'%']].map(([label,value])=><div className="card stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="workspace-grid" style={{marginTop:18}}>
        <section className="card workspace-card"><div className="eyebrow">Финансы</div><h2>Доход платформы</h2><p>Ставка комиссии <b>{data.metrics.platformCommissionPercent}%</b>. Расчётная комиссия от GMV — <b>{money(data.metrics.estimatedPlatformCommission)}</b>.</p><div className="workspace-stat-grid"><div><b>{money(data.metrics.mrr)}</b><span>MRR</span></div><div><b>{money(data.metrics.arr)}</b><span>ARR</span></div><div><b>{money(data.metrics.gmv)}</b><span>GMV</span></div></div></section>
        <section className="card workspace-card"><div className="eyebrow">Тарифы</div><h2>Студии по тарифам</h2>{Object.entries(data.plans||{}).map(([plan,count])=><div className="page-row" key={plan}><b style={{textTransform:'capitalize'}}>{plan}</b><span className="status success"><i/>{metric(count)}</span></div>)}</section>
      </div>
      <section className="card workspace-card" style={{marginTop:18}}><div className="card-head"><div><h2>Подписочная выручка за 30 дней</h2><span>Подписочная выручка по данным платформы</span></div></div><div style={{display:'flex',alignItems:'flex-end',gap:5,height:180,paddingTop:20}}>{series.map(x=><div key={x.day} title={x.day+' · '+money(x.subscription_revenue)} style={{flex:1,height:Math.max(4,(Number(x.subscription_revenue||0)/maxRevenue)*140),borderRadius:'6px 6px 2px 2px',background:'currentColor',opacity:.8}}/> )}</div><div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#667085',marginTop:8}}><span>{series[0]?.day||'—'}</span><span>{series[series.length-1]?.day||'—'}</span></div></section>
      <div className="workspace-grid" style={{marginTop:18}}>
        <section className="card workspace-card"><div className="eyebrow">Месячная динамика</div><h2>Выручка по месяцам</h2><div className="team-list">{(data.monthlySeries||[]).map(x=><div className="page-row" key={x.month}><b>{x.month}</b><span>{money(x.subscription_revenue)} · +{metric(x.new_studios)} студ.</span></div>)}</div></section>
        <section className="card workspace-card"><div className="eyebrow">Годовая динамика</div><h2>Выручка по годам</h2><div className="team-list">{(data.yearlySeries||[]).map(x=><div className="page-row" key={x.year}><b>{x.year}</b><span>{money(x.subscription_revenue)} · +{metric(x.new_studios)} студ.</span></div>)}</div></section>
      </div>
      <section className="card workspace-card" style={{marginTop:18}}><div className="card-head"><div><h2>Последние студии</h2><span>Новые рабочие пространства платформы</span></div><span className="status draft"><i/>Обновление каждые 30 сек</span></div>{data.recentStudios?.length?<div className="team-list">{data.recentStudios.map(s=><div className="team-row" key={s.id}><div className="team-person"><b>{s.name}</b><span>{s.owner_name} · {new Date(s.created_at).toLocaleString('ru-RU')}</span></div><span className="status success"><i/>{s.plan}</span></div>)}</div>:<div className="empty-editor"><b>Пока нет клиентских студий</b><span>Как только появится первая студия, она отобразится здесь.</span></div>}</section>
      </>}
      <div style={{marginTop:18,color:'#667085',fontSize:13}}>Последнее обновление: {data?.generated_at?new Date(data.generated_at).toLocaleString('ru-RU'):'—'}</div>
    </main>
  </div>
}

function ProjectTypeCard({project,onOpenProject,surface}) {
  const isMini=surface==='miniapp'
  const title=isMini?'Mini App':'Сайт'
  const url=project.slug ? (isMini?'/miniapp/':'/published/')+encodeURIComponent(project.slug) : ''
  return <article className="card project-type-card">
    <div className="project-type-preview">
      <div className="project-type-icon">{isMini?<Smartphone size={22}/>:<Globe2 size={22}/>}</div>
      <span>{title}</span>
    </div>
    <div className="project-type-info">
      <div>
        <h3>{project.name}</h3>
        <span>{project.status}{project.slug?' · /'+project.slug:''}</span>
      </div>
      <div className="project-type-actions">
        <button className="filter" onClick={()=>onOpenProject?.(project)}>Открыть</button>
        {url&&<button className="filter" onClick={()=>window.open(url,'_blank','noopener,noreferrer')}>Предпросмотр <ExternalLink size={14}/></button>}
      </div>
    </div>
  </article>
}

function Sites({projects,onCreate,onOpenProject}) {
  const items=(projects||[]).filter(p=>p.type==='Сайт'||p.type==='Сайт + Mini App')
  return <>
    <Header eyebrow="Клиентские проекты" title="Сайты" description="Создавайте, редактируйте и публикуйте сайты клиентов." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Новый сайт</button>}/>
    {items.length===0
      ? <div className="card empty-editor"><Globe2 size={26}/><b>Сайтов пока нет</b><span>Создайте первый сайт из шаблона и откройте его рабочее пространство.</span><button className="primary" onClick={onCreate}><Plus size={16}/> Создать сайт</button></div>
      : <div className="project-type-grid">{items.map(p=><ProjectTypeCard key={p.id||p.name} project={p} surface="site" onOpenProject={onOpenProject}/>)}</div>}
  </>
}

function MiniApps({projects,onCreate,onOpenProject}) {
  const items=(projects||[]).filter(p=>p.type==='Mini App'||p.type==='Сайт + Mini App')
  return <>
    <Header eyebrow="Telegram" title="Mini Apps" description="Управляйте клиентскими Telegram Mini Apps, каталогом и публичными страницами." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Новый Mini App</button>}/>
    {items.length===0
      ? <div className="card empty-editor"><Smartphone size={26}/><b>Mini Apps пока нет</b><span>Создайте первый Mini App и настройте его в рабочем пространстве проекта.</span><button className="primary" onClick={onCreate}><Plus size={16}/> Создать Mini App</button></div>
      : <div className="project-type-grid">{items.map(p=><ProjectTypeCard key={p.id||p.name} project={p} surface="miniapp" onOpenProject={onOpenProject}/>)}</div>}
  </>
}


function ProjectWorkspace({project,data,view,setView,onProjectUpdated,onBack,onRefresh}){
  const current=data?.project||project||{}
  const pages=Array.isArray(data?.pages)?data.pages:[]
  const [name,setName]=useState(current.name||'')
  const [domain,setDomain]=useState(current.domain||'')
  const [saving,setSaving]=useState(false)
  const [pageId,setPageId]=useState('')
  const [pageTitle,setPageTitle]=useState('')
  const [pageContent,setPageContent]=useState('')
  const [catalog,setCatalog]=useState([])
  const [newItem,setNewItem]=useState({name:'',price:'',description:''})
  const [busy,setBusy]=useState('')
  const [telegram,setTelegram]=useState(null)
  const [telegramToken,setTelegramToken]=useState('')
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')

  useEffect(()=>{
    setName(current.name||'');setDomain(current.domain||'')
    if(pages.length){
      const p=pages.find(x=>x.id===pageId)||pages[0]
      setPageId(p.id);setPageTitle(p.title||'');setPageContent(JSON.stringify(p.content||{blocks:[]},null,2))
    }
  },[current.id,current.name,current.domain,pages.length])

  useEffect(()=>{if(view==='catalog'&&current.id)api.catalog(current.id).then(r=>setCatalog(r.items||r.catalog||[])).catch(()=>setCatalog([]))},[view,current.id])

  const saveProject=async()=>{
    setSaving(true);setError('');setNotice('')
    try{const r=await api.updateProject(current.id,{name:name.trim(),domain:domain.trim()});onProjectUpdated?.(r.project||{...current,name,domain});setNotice('Изменения сохранены')}
    catch(e){setError(e.message||'Не удалось сохранить проект')}finally{setSaving(false)}
  }
  const savePage=async()=>{
    if(!pageId)return
    setBusy('page');setError('');setNotice('')
    try{
      const content=JSON.parse(pageContent)
      const r=await api.updatePage(current.id,pageId,{title:pageTitle.trim()||'Страница',content})
      setPageContent(JSON.stringify(r.page?.content||content,null,2));setNotice('Страница сохранена');await onRefresh?.()
    }catch(e){setError(e.message||'Не удалось сохранить страницу')}finally{setBusy('')}
  }
  const addPage=async()=>{
    setBusy('add-page');setError('')
    try{const r=await api.createPage(current.id,{title:'Новая страница'});await onRefresh?.();if(r.page){setPageId(r.page.id);setPageTitle(r.page.title);setPageContent(JSON.stringify(r.page.content||{blocks:[]},null,2))}}
    catch(e){setError(e.message||'Не удалось создать страницу')}finally{setBusy('')}
  }
  const publish=async()=>{
    setBusy('publish');setError('');setNotice('')
    try{const r=current.status==='published'?await api.unpublishProject(current.id):await api.publishProject(current.id);onProjectUpdated?.(r.project||{...current,status:current.status==='published'?'draft':'published'});setNotice(current.status==='published'?'Проект снят с публикации':'Проект опубликован')}
    catch(e){setError(e.message||'Не удалось изменить публикацию')}finally{setBusy('')}
  }
  const saveCatalog=async()=>{
    if(!newItem.name.trim()||!Number(newItem.price))return setError('Укажите название и цену товара')
    setBusy('catalog');setError('')
    try{await api.createCatalogItem(current.id,{name:newItem.name.trim(),description:newItem.description.trim(),price:Number(newItem.price),currency:'RUB',active:true});const r=await api.catalog(current.id);setCatalog(r.items||r.catalog||[]);setNewItem({name:'',price:'',description:''})}
    catch(e){setError(e.message||'Не удалось добавить товар')}finally{setBusy('')}
  }
  const removeCatalog=async id=>{if(!window.confirm('Удалить товар из каталога?'))return;setBusy('delete-catalog');try{await api.deleteCatalogItem(current.id,id);setCatalog(v=>v.filter(x=>x.id!==id))}catch(e){setError(e.message||'Не удалось удалить товар')}finally{setBusy('')}}
  const configureBot=async()=>{
    if(!telegramToken.trim())return setError('Вставьте токен Telegram-бота')
    setBusy('telegram');setError('')
    try{const r=await api.configureTelegram(current.id,{token:telegramToken.trim()});setTelegram(r);setNotice(r.botUrl?'Telegram подключён: '+r.botUrl:'Telegram подключён')}
    catch(e){setError(e.message||'Не удалось подключить Telegram')}finally{setBusy('')}
  }
  const publicUrl=location.origin+'/'+(current.project_type==='miniapp'?'miniapp':'published')+'/'+encodeURIComponent(current.slug||'')
  const tabs=[['overview','Обзор'],['pages','Страницы'],['catalog','Каталог'],['telegram','Telegram'],['settings','Настройки']]
  return <div className="project-workspace">
    <div className="page-head">
      <div><button className="text-btn" onClick={onBack}>← Все проекты</button><div className="eyebrow">Рабочее пространство</div><h1>{current.name||'Проект'}</h1><p>{current.project_type==='miniapp'?'Telegram Mini App':current.project_type==='site_miniapp'?'Сайт + Telegram Mini App':'Сайт'} · {current.status==='published'?'Опубликован':'Черновик'}</p></div>
      <div className="workspace-actions"><button className="filter" onClick={()=>window.open(publicUrl,'_blank','noopener,noreferrer')}>Предпросмотр <ExternalLink size={14}/></button><button className="primary" onClick={publish} disabled={busy==='publish'}>{busy==='publish'?'Сохраняем…':current.status==='published'?'Снять с публикации':'Опубликовать'}</button></div>
    </div>
    {(notice||error)&&<div className={error?'form-error':'status success'} style={{marginBottom:16}}>{error||notice}</div>}
    <div className="settings-layout">
      <div className="settings-nav card">{tabs.map(([id,label])=><button key={id} className={view===id?'selected':''} onClick={()=>setView(id)}>{label}</button>)}</div>
      <section className="card settings-form">
        {view==='overview'&&<div className="setting-block"><h2>Проект готов к работе</h2><span>Редактируйте страницы, каталог, Telegram и домен из одного пространства.</span><div className="metrics compact"><Metric title="Страницы" value={String(pages.length)} change="в проекте" icon={Globe2}/><Metric title="Товары" value={String(catalog.length)} change="в каталоге" icon={ShoppingCart}/><Metric title="Статус" value={current.status==='published'?'Онлайн':'Черновик'} change="публикация" icon={CheckCircle2}/></div><div className="setting-actions"><button className="primary" onClick={()=>setView('pages')}>Редактировать страницы</button><button className="filter" onClick={()=>setView('catalog')}>Открыть каталог</button></div></div>}
        {view==='pages'&&<div className="setting-block"><div className="card-head"><div><h2>Страницы</h2><span>Контент хранится как структурированные блоки.</span></div><button className="filter" onClick={addPage} disabled={busy==='add-page'}>{busy==='add-page'?'Создаём…':'＋ Новая страница'}</button></div><div className="team-list">{pages.map(p=><button key={p.id} className={pageId===p.id?'team-row selected':'team-row'} onClick={()=>{setPageId(p.id);setPageTitle(p.title||'');setPageContent(JSON.stringify(p.content||{blocks:[]},null,2))}}><div className="team-person"><b>{p.title}</b><span>/{p.slug}</span></div><ChevronRight size={16}/></button>)}</div>{pageId&&<><label>Название страницы<input value={pageTitle} onChange={e=>setPageTitle(e.target.value)}/></label><label>Контент (JSON блоков)<textarea rows="18" value={pageContent} onChange={e=>setPageContent(e.target.value)} style={{fontFamily:'monospace'}}/></label><button className="primary" onClick={savePage} disabled={busy==='page'}>{busy==='page'?'Сохраняем…':'Сохранить страницу'}</button></>}</div>}
        {view==='catalog'&&<div className="setting-block"><h2>Каталог</h2><span>Товары проекта используются на сайте и в Mini App.</span><div className="catalog-form-grid"><input placeholder="Название товара" value={newItem.name} onChange={e=>setNewItem(v=>({...v,name:e.target.value}))}/><input type="number" min="0.01" placeholder="Цена, ₽" value={newItem.price} onChange={e=>setNewItem(v=>({...v,price:e.target.value}))}/><input placeholder="Описание" value={newItem.description} onChange={e=>setNewItem(v=>({...v,description:e.target.value}))}/><button className="primary" onClick={saveCatalog} disabled={busy==='catalog'}>Добавить</button></div><div className="team-list">{catalog.map(x=><div className="team-row" key={x.id}><div className="team-person"><b>{x.name}</b><span>{Number(x.price||0).toLocaleString('ru-RU')} ₽ · {x.description||'Без описания'}</span></div><button className="filter" onClick={()=>removeCatalog(x.id)}>Удалить</button></div>)}{catalog.length===0&&<div className="empty-editor"><ShoppingCart size={22}/><b>Каталог пуст</b><span>Добавьте первый товар.</span></div>}</div></div>}
        {view==='telegram'&&<div className="setting-block"><h2>Telegram Mini App</h2><span>Подключите бота, чтобы проект можно было открыть из Telegram.</span><label>Bot Token<input type="password" value={telegramToken} onChange={e=>setTelegramToken(e.target.value)} placeholder="123456:AA..." /></label><button className="primary" onClick={configureBot} disabled={busy==='telegram'}>{busy==='telegram'?'Подключаем…':'Подключить Telegram'}</button>{telegram?.botUrl&&<div className="status success" style={{marginTop:14}}><i/>Бот: <a href={telegram.botUrl} target="_blank" rel="noreferrer">{telegram.botUrl}</a></div>}</div>}
        {view==='settings'&&<div className="setting-block"><h2>Настройки проекта</h2><span>Название, домен и публикация.</span><label>Название<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Домен<input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="example.com"/></label><button className="primary" onClick={saveProject} disabled={saving}>{saving?'Сохраняем…':'Сохранить изменения'}</button></div>}
      </section>
    </div>
  </div>
}

function App() {
  const [auth,setAuth]=useState(null)
  const [authLoading,setAuthLoading]=useState(true)
  const [active, setActive] = useState('Обзор')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createType, setCreateType] = useState('website')
  const [projectData, setProjectData] = useState([])
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
    let alive = true
    refreshWorkspace().catch(()=>{})
    return () => { alive = false }
  }, [auth])

  const refreshWorkspace = async () => {
    setApiState('loading')
    try {
      const [projects, leads, clients, bookings, payments, invoices, analytics, ordersResult] = await Promise.allSettled([
        api.projects(), api.leads(), api.clients(), api.bookings(), api.payments(), api.invoices(), api.analytics(), api.orders()
      ])
      const list = projects.status === 'fulfilled' ? (Array.isArray(projects.value) ? projects.value : (projects.value.projects || [])) : []
      setProjectData(list.map(p => ({
        id:p.id,name:p.name||p.title||'Без названия',slug:p.slug||'',domain:p.domain||null,project_type:p.project_type||'',
        type:p.project_type==='miniapp'?'Mini App':p.project_type==='site'?'Сайт':'Сайт + Mini App',
        status:p.status==='published'?'Опубликован':p.status==='draft'?'Черновик':'В работе',
        color:'dark',leads:Number(p.leads||0),bookings:Number(p.bookings||0),revenue:p.revenue||'₽0',updated:'только что'
      })))
      setOrders(ordersResult.status==='fulfilled'?(ordersResult.value.orders||[]):[])
      setCrm({
        leads:leads.status==='fulfilled'?(leads.value.leads||[]):[],
        clients:clients.status==='fulfilled'?(clients.value.clients||[]):[],
        bookings:bookings.status==='fulfilled'?(bookings.value.bookings||[]):[],
        payments:payments.status==='fulfilled'?(payments.value.payments||[]):[],
        invoices:invoices.status==='fulfilled'?(invoices.value.invoices||[]):[],
        analytics:analytics.status==='fulfilled'?analytics.value.metrics:null
      })
      setApiState(projects.status==='fulfilled'?'online':'offline')
    } catch { setApiState('offline') }
  }

  const deleteProject = async (project) => {
    if (!project?.id) return
    if (!window.confirm(`Удалить проект «${project.name}»? Все страницы, каталог и данные проекта будут удалены. Это действие нельзя отменить.`)) return
    try {
      await api.deleteProject(project.id)
      setProjectData(v => v.filter(x => x.id !== project.id))
      if (selectedProject?.id === project.id) {
        setSelectedProject(null)
        setWorkspaceData(null)
        setProjectView('overview')
      }
    } catch (err) {
      let message = err?.message || 'Не удалось удалить проект.'
      try { message = JSON.parse(message)?.error || message } catch {}
      window.alert(message)    }
  }

  const duplicateProject = async (project) => { if(!project?.id)return; try { const r=await api.duplicateProject(project.id); setProjectData(v=>[{...r.project,type:project.type,status:'Черновик',color:'dark',leads:0,bookings:0,revenue:'₽0',updated:'только что'},...v]); } catch(err){ let m=err?.message||'Не удалось дублировать проект'; try{m=JSON.parse(m)?.error||m}catch{} window.alert(m) } }
  const archiveProject = async (project) => { if(!project?.id || !window.confirm(`Архивировать проект «${project.name}»?`))return; try { const r=await api.archiveProject(project.id); setProjectData(v=>v.map(x=>x.id===project.id?{...x,status:'Архив'}:x)); } catch(err){ window.alert(err?.message||'Не удалось архивировать проект') } }
  const createProject = async (projectType, name, templateId = '') => {
    if (!name?.trim()) return
    try {
      const created = await api.createProject({ name: name.trim(), projectType, templateId })
      const project = created?.project || created
      const mapped = {
        id: project.id,
        name: project.name || name.trim(),
        slug: project.slug || '',
        domain: project.domain || null,
        type: projectType === 'miniapp' ? 'Mini App' : projectType === 'website' ? 'Сайт' : 'Сайт + Mini App',
        status: 'Черновик',
        color: 'dark',
        leads: 0,
        bookings: 0,
        revenue: '₽0',
        updated: 'только что'
      }
      setProjectData(v => [mapped, ...v])
      setShowCreate(false)
      await openProject(mapped)
    } catch (err) {
      let message = err?.message || 'Не удалось создать проект.'
      try { message = JSON.parse(message)?.error || message } catch {}
      if (message.includes('Достигнут лимит проектов')) {
        window.alert(message + '\n\nОткройте Настройки → Тариф, чтобы увеличить лимит.')
      } else {
        window.alert(message)
      }
    }
  }

  const filteredProjects = useMemo(
    () => projectData.filter(p => String(p?.name || '').toLowerCase().includes(query.toLowerCase())),
    [projectData, query]
  )

  const go = (item) => {
    setActive(item); setSelectedProject(null); setProjectView('overview'); setWorkspaceData(null); setSelectedClient(null); setClientData(null); setMobileOpen(false)
  }
  const openClient = async (client) => {
    if (!client?.id) return
    setSelectedClient(client)
    setSelectedProject(null)
    try { setClientData(await api.client(client.id)) } catch { setClientData({client,leads:[],bookings:[],payments:[],invoices:[]}) }
  }  const openProject = async (project) => {
    if (!project?.id) return
    setActive('Проекты')
    setSelectedClient(null); setClientData(null)
    setSelectedProject(project); setProjectView('overview'); setWorkspaceProjectId(String(project.id))
    const url=new URL(window.location.href); url.searchParams.set('project',String(project.id)); url.searchParams.delete('miniapp'); url.searchParams.delete('published'); window.history.pushState({project:String(project.id)},'',url.pathname+url.search)
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
          {nav.slice(0, 5).map(([label, Icon]) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => go(label)}><Icon size={18}/><span>{label}</span>{label === 'Заявки' && crm.leads.length>0 && <em>{crm.leads.length}</em>}</button>)}
          <div className="nav-label">Создание</div>
          {nav.slice(5, 12).map(([label, Icon]) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => go(label)}><Icon size={18}/><span>{label}</span></button>)}
          <div className="nav-label">Система</div>
          <button className={active === 'Настройки' ? 'nav-item active' : 'nav-item'} onClick={() => go('Настройки')}><Settings size={18}/><span>Настройки</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="plan"><div className="plan-icon"><Sparkles size={16}/></div><div><b>{auth.studio?.plan||"Starter"} Studio</b><span>Рабочее пространство</span></div></div>
          <button className="user user-logout" onClick={async()=>{await api.authLogout();setAuth(null)}}><div className="user-avatar">{initials||"NS"}</div><div><b>{userName}</b><span>{auth.user?.role||"owner"}</span></div><LogOut size={17}/></button>
        </div>
      </aside>
      {mobileOpen && <button type="button" aria-label="Закрыть меню" className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(v => !v)}><Menu size={21}/></button>
          <div className="crumb"><span>{studioName}</span><ChevronRight size={15}/><b>{active}</b></div>
          <div className="top-actions">
            <div className="search"><Search size={17}/><input placeholder="Поиск..." value={query} onChange={e => setQuery(e.target.value)}/><kbd>⌘ K</kbd></div>
            <button type="button" className="icon-btn" title="Открыть заявки" aria-label="Открыть заявки" onClick={() => go('Заявки')}><Bell size={18}/><i/></button>
            <div className="top-avatar" title={userName}>{initials||"NS"}</div>
          </div>
        </header>

        <div className="content">
          {active === 'Обзор' && !selectedProject && <Dashboard projects={filteredProjects} onCreate={() => setShowCreate(true)} onNavigate={go} onOpenProject={openProject} metrics={crm.analytics} onDeleteProject={deleteProject} onDuplicateProject={duplicateProject} onArchiveProject={archiveProject}/>}
          {active === 'Проекты' && !selectedProject && <Projects projects={filteredProjects} onCreate={() => setShowCreate(true)} onOpenProject={openProject} onDeleteProject={deleteProject} onDuplicateProject={duplicateProject} onArchiveProject={archiveProject}/>}
          {active === 'Заявки' && <InboxPage leads={crm.leads} />}
          {active === 'Клиенты' && !selectedClient && <Clients clients={crm.clients} onOpenClient={openClient} />}
          {active === 'Клиенты' && selectedClient && <ClientWorkspace data={clientData} projects={projectData} onRefresh={async () => { if (selectedClient?.id) setClientData(await api.client(selectedClient.id)); const [cl,ord,inv]=await Promise.all([api.clients(),api.orders(),api.invoices()]); setCrm(v=>({...v,clients:cl.clients||[],invoices:inv.invoices||[]})); setOrders(ord.orders||[]) }} onBack={() => { setSelectedClient(null); setClientData(null) }} />}
          {active === 'Бронирования' && <Bookings bookings={crm.bookings} projects={projectData} clients={crm.clients} />}
          {active === 'Платежи' && <Payments payments={crm.payments} />}
          {active === 'Счета' && <Invoices invoices={crm.invoices} projects={projectData} />}
          {active === 'Заказы' && <Orders orders={orders} projects={projectData} />}
          {active === 'Сайты' && <Sites projects={projectData} onCreate={(type='website') => { setCreateType(type); setShowCreate(true) }} onOpenProject={openProject} />}
          {active === 'Mini Apps' && <MiniApps projects={projectData} onCreate={(type='miniapp') => { setCreateType(type); setShowCreate(true) }} onOpenProject={openProject} />}
          {active === 'Аналитика' && <Analytics metrics={crm.analytics} />}
          {active === 'Оплата' && <PaymentsPage />}
          {active === 'Шаблоны' && <Templates onCreate={createProject} />}
          {active === 'Настройки' && !selectedProject && <SettingsPage />}
          {selectedProject && <ProjectWorkspace project={selectedProject} data={workspaceData} view={projectView} setView={setProjectView} onProjectUpdated={(updated)=>setProjectData(v=>v.map(x=>x.id===updated.id?{...x,name:updated.name||x.name,slug:updated.slug||x.slug,domain:updated.domain||x.domain,status:updated.status==='published'?'Опубликован':x.status}:x))} onBack={() => { setSelectedProject(null); setWorkspaceData(null); setWorkspaceProjectId(''); const url=new URL(window.location.href); url.searchParams.delete('project'); window.history.replaceState({},'',url.pathname+url.search) }} onRefresh={async()=>setWorkspaceData(await api.project(selectedProject.id))} />}
        </div>
      </main>

      {showCreate && <CreateProjectModal initialType={createType} onClose={() => setShowCreate(false)} onCreate={createProject} />}
    </div>
  )
}

function CreateProjectModal({onClose,onCreate,initialType='website'}) {
  const [busy,setBusy]=useState(false)
  const [type,setType]=useState(initialType)
  const [name,setName]=useState('')
  const create=async()=>{if(!name.trim())return;setBusy(true);try{await onCreate(type,name.trim())}finally{setBusy(false)}}
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="card create-project-modal" onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-head"><div><div className="eyebrow">Новый проект</div><h2>Что создаём?</h2><p>Выберите формат клиентского проекта. Его можно настроить и опубликовать позже.</p></div><button className="icon-btn" onClick={onClose} aria-label="Закрыть"><X size={18}/></button></div>
      <label className="create-project-name">Название проекта<input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')create()}} placeholder="Например, Кофейня Aurora" disabled={busy}/></label>
      <div className="create-project-grid">
        <button className={type==='website'?'create-project-option selected':'create-project-option'} disabled={busy} onClick={()=>setType('website')}><span className="create-project-icon"><Globe2 size={22}/></span><b>Сайт</b><small>Публичный сайт клиента</small></button>
        <button className={type==='miniapp'?'create-project-option selected':'create-project-option'} disabled={busy} onClick={()=>setType('miniapp')}><span className="create-project-icon"><Smartphone size={22}/></span><b>Mini App</b><small>Telegram Mini App клиента</small></button>
        <button className={type==='site_miniapp'?'create-project-option selected':'create-project-option'} disabled={busy} onClick={()=>setType('site_miniapp')}><span className="create-project-icon"><Layers3 size={22}/></span><b>Сайт + Mini App</b><small>Оба канала в одном проекте</small></button>
      </div>
      <div className="setting-actions"><button className="filter" disabled={busy} onClick={onClose}>Отмена</button><button className="primary" disabled={busy||!name.trim()} onClick={create}>{busy?'Создаём…':'Создать проект'}</button></div>
      {busy&&<div className="create-project-busy">Создаём проект…</div>}
    </div>
  </div>
}

function Header({ eyebrow, title, description, action }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

function Dashboard({ projects, onCreate, onNavigate, onOpenProject, onDuplicateProject, onArchiveProject, metrics }) {
  return <>
    <Header eyebrow="Среда студии" title="Доброе утро 👋" description="Вот что происходит с вашими клиентскими проектами сегодня." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Новый проект</button>}/>
    <div className="metrics">
      <Metric title="Активные проекты" value={String(metrics?.projects ?? projects.length)} change="в рабочем пространстве" icon={FolderKanban}/>
      <Metric title="Новые заявки" value={String(metrics?.leads ?? 0)} change="за последние 30 дней" icon={Inbox}/>
      <Metric title="Бронирования" value={String(metrics?.bookings ?? 0)} change="за последние 30 дней" icon={CalendarDays}/>
      <Metric title="Продажи" value={metrics?.revenue!=null?new Intl.NumberFormat('ru-RU',{style:'currency',currency:metrics?.currency||'RUB',maximumFractionDigits:0}).format(Number(metrics.revenue||0)):'—'} change="за последние 30 дней" icon={CircleDollarSign}/>
    </div>
    <div className="grid-main">
      <section className="card projects-card">
        <div className="card-head"><div><h2>Последние проекты</h2><span>Обновления по клиентским пространствам</span></div><button className="text-btn" onClick={() => onNavigate('Проекты')}>Все проекты <ArrowUpRight size={15}/></button></div>
        <ProjectTable projects={projects.slice(0, 4)} onOpenProject={onOpenProject} onDuplicateProject={onDuplicateProject} onArchiveProject={onArchiveProject}/>
      </section>
      <Activity onNavigate={onNavigate} />
    </div>
    <div className="quick"><div className="section-title"><div><h2>Быстрый старт</h2><span>Частые действия студии</span></div></div><div className="quick-grid">
      <Quick icon={Globe2} title="Создать сайт" text="Запустить проект из шаблона" onClick={onCreate}/><Quick icon={Smartphone} title="Создать Mini App" text="Каталог и заявки в Telegram" onClick={onCreate}/><Quick icon={Users} title="Добавить клиента" text="Создать карточку клиента" onClick={() => onNavigate('Клиенты')}/><Quick icon={BarChart3} title="Открыть аналитику" text="Посмотреть показатели" onClick={() => onNavigate('Аналитика')}/>
    </div></div>
  </>
}

function Metric({title,value,change,detail,icon:Icon}) {
  return <div className="metric card"><div className="metric-top"><span>{title}</span><div className="metric-icon"><Icon size={17}/></div></div><div className="metric-value">{value}</div><div className="metric-foot"><b>{change}</b>{detail!==''&&<span>{detail||'к прошлому месяцу'}</span>}</div></div>
}

function ProjectTable({projects,onOpenProject,onDeleteProject,onDuplicateProject,onArchiveProject}) {
  return <div className="table">{projects.map((p,i)=><div className="project-row project-row-button" key={p.id||p.name} onClick={() => onOpenProject?.(p)}><div className={`project-logo ${p.color}`}>{p.name.slice(0,1)}</div><div className="project-name"><b>{p.name}</b><span>{p.type}</span></div><span className={`status ${p.status === 'Опубликован' ? 'success' : p.status === 'В работе' ? 'working' : 'draft'}`}><i/>{p.status}</span><div className="project-stat"><b>{p.leads}</b><span>заявок</span></div><div className="project-stat"><b>{p.revenue}</b><span>выручка</span></div><span className="updated">{p.updated}</span><button type="button" className="filter project-open-button" onClick={e=>{e.stopPropagation();onOpenProject?.(p)}}>Открыть рабочее пространство</button><button type="button" className="filter" onClick={e=>{e.stopPropagation();onDuplicateProject?.(p)}}>Дублировать</button><button type="button" className="filter" onClick={e=>{e.stopPropagation();onArchiveProject?.(p)}}>Архив</button></div>)}</div>
}

function Activity({onNavigate}) {
  return <section className="card activity"><div className="card-head"><div><h2>Активность</h2><span>Последние события</span></div><button type="button" className="icon-btn" title="Открыть аналитику" aria-label="Открыть аналитику" onClick={() => onNavigate?.('Аналитика')}><MoreHorizontal size={17}/></button></div><div className="activity-list">{activities.map(([title,sub,time,type])=><div className="activity-item" key={title+time}><div className={`activity-icon ${type}`}>{type === 'lead' ? <Inbox size={15}/> : type === 'booking' ? <CalendarDays size={15}/> : type === 'site' ? <Globe2 size={15}/> : <CreditCard size={15}/>}</div><div><b>{title}</b><span>{sub}</span></div><time>{time}</time></div>)}</div></section>
}

function Quick({icon:Icon,title,text,onClick}) { return <button className="quick-card card" onClick={onClick}><div className="quick-icon"><Icon size={19}/></div><div><b>{title}</b><span>{text}</span></div><ChevronRight size={17}/></button> }

function Projects({projects,onCreate,onOpenProject,onDeleteProject,onDuplicateProject,onArchiveProject}) {
  const [filter,setFilter]=useState('all')
  const activeProjects=projects.filter(x=>x.status!=='Архив'&&x.status!=='archived'); const counts={all:activeProjects.length,published:activeProjects.filter(x=>x.status==='Опубликован').length,working:activeProjects.filter(x=>x.status==='В работе').length,draft:activeProjects.filter(x=>x.status==='Черновик').length}
  const visible=filter==='all'?activeProjects:activeProjects.filter(x=>filter==='published'?x.status==='Опубликован':filter==='working'?x.status==='В работе':x.status==='Черновик')
  return <><Header eyebrow="Рабочая область" title="Проекты" description="Все сайты, Mini Apps и клиентские пространства студии." action={<button className="primary" onClick={onCreate}><Plus size={17}/> Новый проект</button>}/>
    <div className="filterbar">{[['all','Все'],['published','Опубликованные'],['working','В работе'],['draft','Черновики']].map(([id,label])=><button key={id} className={filter===id?'filter active':'filter'} onClick={()=>setFilter(id)}>{label} <b>{counts[id]}</b></button>)}</div>
    <section className="card projects-full">{visible.length?<ProjectTable projects={visible} onOpenProject={onOpenProject} onDeleteProject={onDeleteProject} onDuplicateProject={onDuplicateProject} onArchiveProject={onArchiveProject}/>:<div className="empty-editor"><FolderKanban size={24}/><b>Проектов в этом фильтре нет</b><span>Создайте проект или выберите другой фильтр.</span></div>}</section>
  </>}

function InboxPage({leads=[]}) {
  const [items,setItems]=useState(leads),[selected,setSelected]=useState(null)
  useEffect(()=>setItems(leads),[leads])
  const setStatus=async(id,status)=>{try{await api.updateLead(id,status);setItems(v=>v.map(x=>x.id===id?{...x,status}:x))}catch(e){window.alert(e.message||'Не удалось изменить статус')}}
  const convert=async(id)=>{try{const r=await api.convertLead(id);setItems(v=>v.map(x=>x.id===id?{...x,status:'won'}:x));window.alert(r.existing?'Клиент уже существует':'Заявка превращена в клиента')}catch(e){window.alert(e.message||'Не удалось создать клиента')}}
  return <><Header eyebrow="CRM" title="Заявки" description="Входящие обращения клиентов из сайтов и Mini Apps."/><div className="card inbox-list">{items.length===0?<div className="empty-editor"><Inbox size={24}/><b>Заявок пока нет</b><span>Новые обращения появятся здесь.</span></div>:items.map(l=><div className="inbox-row" key={l.id} onClick={()=>setSelected(l)}><div className="inbox-avatar">{String(l.name||'?').slice(0,1)}</div><div className="inbox-main"><b>{l.name||'Без имени'}</b><span>{l.message||'Новое обращение'}{l.phone?' · '+l.phone:''}</span></div><select value={l.status||'new'} onClick={e=>e.stopPropagation()} onChange={e=>setStatus(l.id,e.target.value)}><option value="new">Новая</option><option value="in_progress">В работе</option><option value="won">Клиент</option><option value="lost">Закрыта</option></select><button className="filter" onClick={e=>{e.stopPropagation();convert(l.id)}} disabled={l.status==='won'}>{l.status==='won'?'Клиент создан':'В клиента'}</button></div>)}</div>{selected&&<div className="public-modal-backdrop" onMouseDown={()=>setSelected(null)}><section className="card booking-editor" onMouseDown={e=>e.stopPropagation()}><button className="public-close" onClick={()=>setSelected(null)}><X size={18}/></button><div className="eyebrow">Заявка · {selected.project_name||'Проект'}</div><h2>{selected.name||'Без имени'}</h2><div className="detail-list"><div><span>Телефон</span><b>{selected.phone||'Не указан'}</b></div><div><span>Email</span><b>{selected.email||'Не указан'}</b></div><div><span>Сообщение</span><b>{selected.message||'Без сообщения'}</b></div><div><span>Источник</span><b>{selected.source||'public'}</b></div></div><div className="setting-actions"><button className="filter" onClick={()=>setSelected(null)}>Закрыть</button><button className="primary" disabled={selected.status==='won'} onClick={()=>{convert(selected.id);setSelected(null)}}>Создать клиента</button></div></section></div>}</>
}
function Invoices({invoices=[],projects=[]}) {
  const fallback=[];
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
    <div className="metrics compact"><Metric title="Оплачено" value={new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(total)} change="по счетам" icon={CheckCircle2}/><Metric title="Всего" value={String(items.length)} change="счетов" icon={Receipt}/><Metric title="Ожидают" value={String(items.filter(x=>x.status==='sent').length)} change="отправлены клиентам" icon={Clock3}/><Metric title="Просрочено" value={String(items.filter(x=>x.status==='overdue').length)} change="требуют внимания" icon={CircleDollarSign}/></div>
    <section className="card calendar-card"><div className="card-head"><div><h2>Реестр счетов</h2><span>Счёт → клиент → оплата</span></div><div className="calendar-actions">{[['all','Все'],['draft','Черновики'],['sent','Отправлены'],['paid','Оплачены'],['overdue','Просрочены']].map(([id,label])=><button key={id} className={filter===id?'filter active':'filter'} onClick={()=>setFilter(id)}>{label}</button>)}</div></div>
      {visible.length===0?<div className="empty-editor"><Receipt size={24}/><b>Счетов пока нет</b><span>Создайте первый счёт для клиента.</span></div>:visible.map((x,i)=><div className="slot invoice-row" key={x.id||i}><div className="invoice-number"><b>{x.number}</b><span>{x.description||'Без описания'}</span></div><div className="invoice-project"><b>{x.project_name||'Проект'}</b><span>{x.due_date?'до '+new Date(x.due_date).toLocaleDateString('ru-RU'):''}</span></div><strong>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(Number(x.amount||0))}</strong>{x.id&&<select className="booking-status" value={x.status||'draft'} onChange={e=>setStatus(x.id,e.target.value)}>{Object.entries(statusLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>}</div>)}</section>
    {creating&&<div className="modal-backdrop" onMouseDown={()=>setCreating(false)}><div className="modal card" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">Финансы</span><h2>Новый счёт</h2></div><button className="icon-btn" onClick={()=>setCreating(false)}><X size={18}/></button></div><div className="block-form"><label>Проект<select value={form.project_id} onChange={e=>setForm(v=>({...v,project_id:e.target.value}))}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Сумма<input type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm(v=>({...v,amount:e.target.value}))}/></label><label>Описание<input value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} placeholder="Например, абонемент"/></label><label>Срок оплаты<input type="date" value={form.due_date} onChange={e=>setForm(v=>({...v,due_date:e.target.value}))}/></label></div><div className="setting-actions"><button className="filter" onClick={()=>setCreating(false)}>Отмена</button><button className="primary" onClick={create} disabled={!form.project_id||!form.amount}>Создать счёт</button></div></div></div>}
  </>;
}

function Clients({clients=[],onOpenClient}){
  const [open,setOpen]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('')
  const [form,setForm]=useState({name:'',phone:'',email:''}),[rows,setRows]=useState(clients)
  useEffect(()=>setRows(clients),[clients])
  const create=async(e)=>{
    e.preventDefault(); setSaving(true); setError('')
    try{ const r=await api.createClient(form); setRows(v=>[{...(r.client||{}),project_count:0,contact_count:0,last_activity:r.client?.created_at},...v]); setOpen(false); setForm({name:'',phone:'',email:''}) }
    catch(err){setError(err.message||'Не удалось создать клиента')} finally{setSaving(false)}
  }
  return <><Header eyebrow="CRM" title="Клиенты" description="Единая база клиентов, история покупок, записей и оплат." action={<button className="primary" onClick={()=>{setError('');setOpen(true)}}><Plus size={17}/> Добавить клиента</button>}/><div className="client-grid">{rows.map((x,i)=>{const name=typeof x==='string'?x:x.name;const activity=x.last_activity?Math.max(0,Math.floor((Date.now()-new Date(x.last_activity).getTime())/86400000)):null;return <button className="card client-card client-card-button" key={x.id||x.name||x} onClick={()=>typeof x==='string'?null:onOpenClient?.(x)}><div className={`client-logo c${i}`}>{name.slice(0,1)}</div><div><h3>{name}</h3><span>{x.project_count??0} {Number(x.project_count)===1?'проект':'проекта'} · {x.contact_count??0} взаимодействий</span></div><span className="row-more"><MoreHorizontal size={17}/></span><div className="client-bottom"><span>Последняя активность</span><b>{activity===null?'нет активности':activity===0?'сегодня':activity===1?'вчера':activity+' дн. назад'}</b></div></button>})}</div>{open&&<div className="public-modal-backdrop" onMouseDown={()=>setOpen(false)}><form className="card booking-editor" onSubmit={create} onMouseDown={e=>e.stopPropagation()}><button type="button" className="public-close" onClick={()=>setOpen(false)}><X size={18}/></button><div className="eyebrow">CRM</div><h2>Новый клиент</h2><p>Добавьте клиента вручную. Он сразу появится в CRM.</p><div className="booking-form-grid"><label>Имя<input required maxLength="120" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Телефон<input maxLength="40" value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label><label>Email<input type="email" maxLength="160" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label></div>{error&&<div className="form-error">{error}</div>}<div className="setting-actions"><button type="button" className="filter" onClick={()=>setOpen(false)}>Отмена</button><button className="primary" disabled={saving}>{saving?'Создаём…':'Создать клиента'}</button></div></form></div>}</>
}
function ClientWorkspace({data,projects=[],onBack,onRefresh}){
  const c=data?.client||{},leads=data?.leads||[],bookings=data?.bookings||[],payments=data?.payments||[],invoices=data?.invoices||[],orders=data?.orders||[]
  const [editing,setEditing]=useState(false),[saving,setSaving]=useState(false),[invoiceOpen,setInvoiceOpen]=useState(false),[bookingOpen,setBookingOpen]=useState(false),[orderOpen,setOrderOpen]=useState(false),[catalog,setCatalog]=useState([]),[order,setOrder]=useState({project_id:'',catalog_id:'',quantity:1}),[invoice,setInvoice]=useState({project_id:'',amount:'',description:'',due_date:''}),[notice,setNotice]=useState('')
  const [booking,setBooking]=useState({project_id:'',customer_name:c.name||'',customer_phone:c.phone||'',service_name:'',starts_at:'',ends_at:'',status:'confirmed'})
  const [form,setForm]=useState({name:c.name||'',email:c.email||'',phone:c.phone||''})
  const projectOptions=useMemo(()=>{const map=new Map();for(const p of projects||[])map.set(p.id,p);for(const o of orders||[])if(o.project_id&&!map.has(o.project_id))map.set(o.project_id,{id:o.project_id,name:o.project_name||'Проект'});for(const b of bookings||[])if(b.project_id&&!map.has(b.project_id))map.set(b.project_id,{id:b.project_id,name:b.project_name||'Проект'});return [...map.values()]},[projects,orders,bookings])
  useEffect(()=>setForm({name:c.name||'',email:c.email||'',phone:c.phone||''}),[c.id,c.name,c.email,c.phone])
  useEffect(()=>setBooking(v=>({...v,customer_name:c.name||'',customer_phone:c.phone||'',project_id:v.project_id||projectOptions[0]?.id||''})),[c.id,c.name,c.phone,projectOptions.length])
  useEffect(()=>{if(!invoice.project_id&&projectOptions[0]?.id)setInvoice(v=>({...v,project_id:projectOptions[0].id}))},[projectOptions,invoice.project_id])
  const paid=payments.filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.amount||0),0)
  const orderRevenue=orders.filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.total||0),0)
  const totalPaid=Math.max(paid,orderRevenue)
  const timeline=[...leads.map(x=>({kind:'Заявка',text:(x.project_name?x.project_name+' · ':'')+(x.message||'Новое обращение'),date:x.created_at,status:x.status})),...bookings.map(x=>({kind:'Бронирование',text:(x.project_name?x.project_name+' · ':'')+(x.service_name||'Запись')+(x.status?' · '+({pending:'новая',confirmed:'подтверждено',completed:'завершено',cancelled:'отменено'}[x.status]||x.status):''),date:x.starts_at||x.created_at,status:x.status})),...orders.map(x=>({kind:'Заказ',text:(x.project_name?x.project_name+' · ':'')+x.number+' · '+Number(x.total||0)+' '+(x.currency||'RUB'),date:x.created_at,status:x.status})),...payments.map(x=>({kind:'Платёж',text:(x.description||'Оплата')+' · '+Number(x.amount||0)+' '+(x.currency||'RUB'),date:x.created_at,status:x.status})),...invoices.map(x=>({kind:'Счёт',text:(x.project_name?x.project_name+' · ':'')+x.number+' · '+Number(x.amount||0)+' '+(x.currency||'RUB'),date:x.created_at,status:x.status}))].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))
  const saveClient=async()=>{setSaving(true);try{const r=await api.updateClient(c.id,form);setNotice('Данные клиента сохранены');setEditing(false);onRefresh?.(r.client)}catch(e){window.alert(e.message||'Не удалось сохранить клиента')}finally{setSaving(false)}}
  const createInvoice=async()=>{if(!invoice.project_id||!invoice.amount)return;setSaving(true);try{const r=await api.createInvoice({...invoice,client_id:c.id});setNotice('Счёт '+(r.invoice?.number||'')+' создан');setInvoiceOpen(false);setInvoice({project_id:projectOptions[0]?.id||'',amount:'',description:'',due_date:''});onRefresh?.()}catch(e){window.alert(e.message||'Не удалось создать счёт')}finally{setSaving(false)}}
  const openOrder=async()=>{const pid=projectOptions[0]?.id||'';if(!pid){window.alert('Сначала создайте проект для клиента');return}setOrder(v=>({...v,project_id:pid,catalog_id:'',quantity:1}));setOrderOpen(true);try{const r=await api.catalog(pid);setCatalog(r.items||[])}catch{setCatalog([])}}
  const createOrder=async()=>{if(!order.project_id||!order.catalog_id)return;setSaving(true);try{const r=await api.createOrder({project_id:order.project_id,client_id:c.id,currency:'RUB',items:[{catalog_id:order.catalog_id,quantity:Number(order.quantity)||1}]});setNotice('Заказ '+(r.order?.number||'')+' создан');setOrderOpen(false);onRefresh?.()}catch(e){window.alert(e.message||'Не удалось создать заказ')}finally{setSaving(false)}}
  const changeOrderProject=async pid=>{setOrder(v=>({...v,project_id:pid,catalog_id:''}));try{const r=await api.catalog(pid);setCatalog(r.items||[])}catch{setCatalog([])}}
  const createBooking=async()=>{if(!booking.project_id||!booking.customer_name||!booking.starts_at||!booking.ends_at){window.alert('Выберите проект, дату и время записи');return}setSaving(true);try{const r=await api.createBooking({...booking,client_id:c.id});setNotice('Запись клиента создана');setBookingOpen(false);setBooking(v=>({...v,project_id:v.project_id||projectOptions[0]?.id||'',starts_at:'',ends_at:'',service_name:''}));onRefresh?.(r.booking)}catch(e){window.alert(e.message||'Не удалось создать запись')}finally{setSaving(false)}}
  return <div className="client-workspace"><div className="workspace-head"><button className="filter" onClick={onBack}>← Клиенты</button><div className="workspace-title"><div className="client-logo c0">{String(c.name||'?').slice(0,1)}</div><div><h1>{c.name||'Клиент'}</h1><span>{c.email||'Без email'} · {c.phone||'Без телефона'}</span></div></div><div className="workspace-actions"><button className="filter" onClick={()=>setEditing(true)}>Изменить</button><button className="filter" onClick={openOrder}><ShoppingCart size={15}/> Новый заказ</button><button className="filter" onClick={()=>setBookingOpen(true)}><CalendarDays size={15}/> Новая запись</button><button className="primary" onClick={()=>setInvoiceOpen(true)}><Receipt size={15}/> Новый счёт</button></div></div>{notice&&<div className="status success client-notice"><i/>{notice}</div>}<div className="metrics compact"><Metric title="Заявки" value={leads.length} change="обращения" icon={Inbox}/><Metric title="Записи" value={bookings.length} change="бронирования" icon={CalendarDays}/><Metric title="Заказы" value={orders.length} change="покупки" icon={ShoppingCart}/><Metric title="Оплачено" value={new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(totalPaid)} change="выручка клиента" icon={CircleDollarSign}/></div><div className="client-detail-grid"><section className="card workspace-card"><div className="card-head"><div><h2>Заказы клиента</h2><span>История покупок и статусы оплаты</span></div></div>{orders.length?orders.map(x=><div className="client-op" key={x.id}><span>{x.number}</span><b>{x.project_name||'Проект'} · {(x.items||[]).map(i=>i.name+' × '+i.quantity).join(', ')}</b><strong>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(Number(x.total||0))}</strong><em className={x.status==='paid'?'success':''}>{x.status==='paid'?'Оплачен':x.status==='pending'?'Ожидает':x.status==='refunded'?'Возврат':'Отменён'}</em></div>):<div className="empty-editor"><ShoppingCart size={22}/><b>Заказов пока нет</b><span>Покупки клиента появятся здесь.</span></div>}<div className="client-subsection"><h3>Счета</h3>{invoices.length?invoices.slice(0,6).map(x=><div className="client-op" key={x.id}><span>{x.number}</span><b>{x.description||'Счёт'}</b><strong>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(Number(x.amount||0))}</strong><em>{({draft:'Черновик',sent:'Отправлен',paid:'Оплачен',overdue:'Просрочен',cancelled:'Отменён'}[x.status]||x.status)}</em></div>):<span className="muted">Счетов пока нет.</span>}</div></section><section className="card workspace-card"><div className="card-head"><div><h2>История клиента</h2><span>Заявки, записи, заказы, оплаты и счета в одной ленте</span></div></div>{timeline.length?timeline.slice(0,20).map((x,i)=><div className="client-activity" key={i}><div className="activity-icon"><CheckCircle2 size={15}/></div><div><b>{x.kind}</b><span>{x.text}</span></div><time>{x.date?new Date(x.date).toLocaleString('ru-RU'):''}</time></div>):<div className="empty-editor"><Clock3 size={22}/><b>Истории пока нет</b><span>Новые взаимодействия появятся автоматически.</span></div>}</section></div>{editing&&<div className="public-modal-backdrop" onMouseDown={()=>setEditing(false)}><section className="card booking-editor" onMouseDown={e=>e.stopPropagation()}><button className="public-close" onClick={()=>setEditing(false)}><X size={18}/></button><div className="eyebrow">CRM</div><h2>Данные клиента</h2><div className="booking-form-grid"><label>Имя<input value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Телефон<input value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label></div><div className="setting-actions"><button className="filter" onClick={()=>setEditing(false)}>Отмена</button><button className="primary" disabled={saving} onClick={saveClient}>{saving?'Сохраняем…':'Сохранить'}</button></div></section></div>}{orderOpen&&<div className="public-modal-backdrop" onMouseDown={()=>setOrderOpen(false)}><section className="card booking-editor" onMouseDown={e=>e.stopPropagation()}><button className="public-close" onClick={()=>setOrderOpen(false)}><X size={18}/></button><div className="eyebrow">CRM · Заказ</div><h2>Новый заказ для {c.name||'клиента'}</h2><div className="booking-form-grid"><label>Проект<select value={order.project_id} onChange={e=>changeOrderProject(e.target.value)}><option value="">Выберите проект</option>{projectOptions.map(x=><option key={x.id} value={x.id}>{x.name||'Проект'}</option>)}</select></label><label>Позиция<select value={order.catalog_id} onChange={e=>setOrder(v=>({...v,catalog_id:e.target.value}))}><option value="">Выберите позицию</option>{catalog.filter(x=>x.active!==false).map(x=><option key={x.id} value={x.id}>{x.name} · {Number(x.price||0).toLocaleString('ru-RU')} ₽</option>)}</select></label><label>Количество<input type="number" min="1" max="100" value={order.quantity} onChange={e=>setOrder(v=>({...v,quantity:e.target.value}))}/></label></div><div className="setting-actions"><button className="filter" onClick={()=>setOrderOpen(false)}>Отмена</button><button className="primary" disabled={saving||!order.project_id||!order.catalog_id} onClick={createOrder}>{saving?'Создаём…':'Создать заказ'}</button></div></section></div>}{bookingOpen&&<div className="public-modal-backdrop" onMouseDown={()=>setBookingOpen(false)}><section className="card booking-editor" onMouseDown={e=>e.stopPropagation()}><button className="public-close" onClick={()=>setBookingOpen(false)}><X size={18}/></button><div className="eyebrow">CRM · Бронирование</div><h2>Новая запись для {c.name||'клиента'}</h2><div className="booking-form-grid"><label>Проект<select value={booking.project_id} onChange={e=>setBooking(v=>({...v,project_id:e.target.value}))}><option value="">Выберите проект</option>{projectOptions.map(x=><option key={x.id} value={x.id}>{x.name||'Проект'}</option>)}</select></label><label>Услуга<input value={booking.service_name} onChange={e=>setBooking(v=>({...v,service_name:e.target.value}))} placeholder="Например, консультация"/></label><label>Имя клиента<input value={booking.customer_name} onChange={e=>setBooking(v=>({...v,customer_name:e.target.value}))}/></label><label>Телефон<input value={booking.customer_phone} onChange={e=>setBooking(v=>({...v,customer_phone:e.target.value}))}/></label><label>Начало<input type="datetime-local" value={booking.starts_at} onChange={e=>setBooking(v=>({...v,starts_at:e.target.value}))}/></label><label>Окончание<input type="datetime-local" value={booking.ends_at} onChange={e=>setBooking(v=>({...v,ends_at:e.target.value}))}/></label></div><div className="setting-actions"><button className="filter" onClick={()=>setBookingOpen(false)}>Отмена</button><button className="primary" disabled={saving} onClick={createBooking}>{saving?'Создаём…':'Создать запись'}</button></div></section></div>}{invoiceOpen&&<div className="public-modal-backdrop" onMouseDown={()=>setInvoiceOpen(false)}><section className="card booking-editor" onMouseDown={e=>e.stopPropagation()}><button className="public-close" onClick={()=>setInvoiceOpen(false)}><X size={18}/></button><div className="eyebrow">Финансы</div><h2>Новый счёт для клиента</h2><div className="booking-form-grid"><label>Проект<select value={invoice.project_id} onChange={e=>setInvoice(v=>({...v,project_id:e.target.value}))}><option value="">Выберите проект</option>{projectOptions.map(x=><option key={x.id} value={x.id}>{x.name||'Проект'}</option>)}</select></label><label>Сумма<input type="number" min="0.01" step="0.01" value={invoice.amount} onChange={e=>setInvoice(v=>({...v,amount:e.target.value}))}/></label><label>Описание<input value={invoice.description} onChange={e=>setInvoice(v=>({...v,description:e.target.value}))} placeholder="Например, услуги за месяц"/></label><label>Срок оплаты<input type="date" value={invoice.due_date} onChange={e=>setInvoice(v=>({...v,due_date:e.target.value}))}/></label></div><div className="setting-actions"><button className="filter" onClick={()=>setInvoiceOpen(false)}>Отмена</button><button className="primary" disabled={saving||!invoice.project_id||!invoice.amount} onClick={createInvoice}>{saving?'Создаём…':'Создать счёт'}</button></div></section></div>}</div>}
function Bookings({bookings=[],projects=[],clients=[]}){
  const fallback=[];
  const [items,setItems]=useState(bookings.length?bookings:fallback),[filter,setFilter]=useState('all'),[view,setView]=useState('day'),[date,setDate]=useState(new Date()),[editing,setEditing]=useState(null),[creating,setCreating]=useState(false),[saving,setSaving]=useState(false);
  const [newBooking,setNewBooking]=useState({project_id:'',client_id:'',customer_name:'',customer_phone:'',service_name:'',starts_at:'',ends_at:'',status:'confirmed'});
  const localInputValue=d=>{const x=new Date(d);if(Number.isNaN(x.getTime()))return '';const pad=n=>String(n).padStart(2,'0');return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate())+'T'+pad(x.getHours())+':'+pad(x.getMinutes())};
  const create=async()=>{if(!newBooking.project_id||!newBooking.customer_name||!newBooking.starts_at){window.alert('Заполните проект, клиента и время');return}if(!newBooking.ends_at){const end=new Date(newBooking.starts_at);end.setHours(end.getHours()+1);newBooking.ends_at=localInputValue(end)}setSaving(true);try{const r=await api.createBooking(newBooking);setItems(v=>[...v,r.booking].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)));setCreating(false);setNewBooking(v=>({...v,customer_name:'',customer_phone:'',service_name:''}));setDate(new Date(r.booking.starts_at))}catch(err){let msg=err.message||'Не удалось создать запись';try{const j=JSON.parse(err.message);msg=j.error||msg}catch{}window.alert(msg)}finally{setSaving(false)}};
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
  const pay=async(x)=>{const raw=window.prompt('Сумма оплаты (₽):',String(x.amount||0));if(raw===null)return;const amount=Number(raw.replace(',','.'));if(!Number.isFinite(amount)||amount<=0){window.alert('Введите корректную сумму');return}try{await api.bookingPayment(x.id,{amount,currency:'RUB'});setItems(v=>v.map(o=>o.id===x.id?{...o,status:'completed'}:o));window.alert('Оплата проведена, запись завершена')}catch(err){window.alert(err.message||'Не удалось провести оплату')}}
  const save=async()=>{if(!editing?.id)return;setSaving(true);try{const payload={customer_name:editing.customer_name,customer_phone:editing.customer_phone,service_name:editing.service_name,starts_at:new Date(editing.starts_at).toISOString(),ends_at:new Date(editing.ends_at||new Date(new Date(editing.starts_at).getTime()+3600000)).toISOString()};const r=await api.updateBooking(editing.id,payload);setItems(v=>v.map(x=>x.id===editing.id?{...x,...r.booking}:x));setEditing(null)}catch(err){window.alert(err.message||'Не удалось сохранить запись')}finally{setSaving(false)}}
  const createModal=creating&&<div className="public-modal-backdrop" onMouseDown={()=>setCreating(false)}><section className="card booking-editor" onMouseDown={e=>e.stopPropagation()}><button className="public-close" onClick={()=>setCreating(false)}><X size={18}/></button><div className="eyebrow">Новая запись</div><h2>Добавить бронирование</h2><div className="booking-form-grid"><label>Проект<select value={newBooking.project_id} onChange={e=>setNewBooking(v=>({...v,project_id:e.target.value}))}><option value="">Выберите проект</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Клиент<select value={newBooking.client_id} onChange={e=>{const id=e.target.value;const c=clients.find(x=>x.id===id);setNewBooking(v=>({...v,client_id:id,customer_name:c?.name||v.customer_name,customer_phone:c?.phone||v.customer_phone}))}}><option value="">Новый / вручную</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?` · ${c.phone}`:""}</option>)}</select></label><label>Имя клиента<input placeholder="Имя клиента" value={newBooking.customer_name} onChange={e=>setNewBooking(v=>({...v,customer_name:e.target.value}))}/></label><label>Телефон<input value={newBooking.customer_phone} onChange={e=>setNewBooking(v=>({...v,customer_phone:e.target.value}))}/></label><label>Услуга<input value={newBooking.service_name} onChange={e=>setNewBooking(v=>({...v,service_name:e.target.value}))}/></label><label>Начало<input type="datetime-local" value={newBooking.starts_at} onChange={e=>setNewBooking(v=>({...v,starts_at:e.target.value}))}/></label><label>Окончание<input type="datetime-local" value={newBooking.ends_at} onChange={e=>setNewBooking(v=>({...v,ends_at:e.target.value}))}/></label></div><div className="setting-actions"><button className="filter" onClick={()=>setCreating(false)}>Отмена</button><button className="primary" disabled={saving} onClick={create}>{saving?'Создаём…':'Создать запись'}</button></div></section></div>;
  const editor=editing&&<div className="public-modal-backdrop" onMouseDown={()=>setEditing(null)}><section className="card booking-editor" onMouseDown={e=>e.stopPropagation()}><button className="public-close" onClick={()=>setEditing(null)}><X size={18}/></button><div className="eyebrow">Запись клиента</div><h2>Редактировать бронирование</h2><div className="booking-form-grid"><label>Клиент<input value={editing.customer_name||''} onChange={e=>setEditing(v=>({...v,customer_name:e.target.value}))}/></label><label>Телефон<input value={editing.customer_phone||''} onChange={e=>setEditing(v=>({...v,customer_phone:e.target.value}))}/></label><label>Услуга<input value={editing.service_name||''} onChange={e=>setEditing(v=>({...v,service_name:e.target.value}))}/></label><label>Начало<input type="datetime-local" value={localInputValue(editing.starts_at)} onChange={e=>setEditing(v=>({...v,starts_at:new Date(e.target.value).toISOString()}))}/></label><label>Окончание<input type="datetime-local" value={localInputValue(editing.ends_at||new Date(new Date(editing.starts_at).getTime()+3600000))} onChange={e=>setEditing(v=>({...v,ends_at:new Date(e.target.value).toISOString()}))}/></label></div><div className="setting-actions"><button className="filter" onClick={()=>setEditing(null)}>Отмена</button><button className="primary" disabled={saving} onClick={save}>{saving?'Сохраняем…':'Сохранить запись'}</button></div></section></div>;
  return <><Header eyebrow="Операции" title="Бронирования" description="Единый календарь записей клиентов из всех проектов." action={<button className="primary" onClick={()=>setCreating(true)}><Plus size={17}/> Новая запись</button>}/><div className="metrics compact"><Metric title="Все" value={String(items.length)} change="записи" icon={CalendarDays}/><Metric title="Новые" value={String(items.filter(x=>x.status==='pending').length)} change="ожидают подтверждения" icon={Clock3}/><Metric title="Подтверждено" value={String(items.filter(x=>x.status==='confirmed').length)} change="готовы к визиту" icon={CheckCircle2}/><Metric title="Завершено" value={String(items.filter(x=>x.status==='completed').length)} change="выполненные" icon={BarChart3}/></div><section className="card calendar-card"><div className="calendar-toolbar"><div><h2>Календарь</h2><span>{view==='day'?fmtDay(date):'Неделя · '+fmtDay(days[0])+' — '+fmtDay(days[6])}</span></div><div className="calendar-toolbar-actions"><button className="filter" onClick={()=>setDate(new Date())}>Сегодня</button><button className="filter" onClick={()=>move(-1)}>←</button><button className="filter" onClick={()=>move(1)}>→</button><button className={view==='day'?'filter active':'filter'} onClick={()=>setView('day')}>День</button><button className={view==='week'?'filter active':'filter'} onClick={()=>setView('week')}>Неделя</button></div></div><div className="calendar-filters">{[['all','Все'],['pending','Новые'],['confirmed','Подтверждены'],['completed','Завершены'],['cancelled','Отменены']].map(([id,label])=><button key={id} className={filter===id?'filter active':'filter'} onClick={()=>setFilter(id)}>{label}</button>)}</div>{view==='week'&&<div className="calendar-week-head">{days.map(d=><div key={dayKey(d)} className={dayKey(d)===dayKey(new Date())?'today':''}>{fmtDay(d)}</div>)}</div>}<div className={view==='week'?'calendar-week-grid':'calendar-day-grid'}>{visible.length===0?<div className="empty-editor"><CalendarDays size={24}/><b>Записей нет</b><span>На выбранную дату записей пока нет.</span></div>:visible.sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)).map((b,i)=><div className="slot booking-slot" key={b.id||i}><div className="slot-time"><b>{new Date(b.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</b><span>{new Date(b.ends_at||new Date(new Date(b.starts_at).getTime()+3600000)).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span></div><div className="booking-wrap"><Booking name={b.customer_name||'Клиент'} project={b.project_name||'Проект'} service={b.service_name} status={b.status}/><div className="booking-actions"><button className="filter" onClick={()=>setEditing({...b})}>Изменить</button><button className="filter" disabled={b.status==='completed'||b.status==='cancelled'} onClick={()=>pay(b)}>Оплатить</button><select className="booking-status" value={b.status||'pending'} onChange={e=>setStatus(b.id,e.target.value)}><option value="pending">Новая</option><option value="confirmed">Подтверждено</option><option value="completed">Завершено</option><option value="cancelled">Отменено</option></select></div></div></div>)}</div></section>{editor}{createModal}</>
}

function Booking({name,project,service,status='pending'}){const labels={pending:'Новая',confirmed:'Подтверждено',completed:'Завершено',cancelled:'Отменено'};return <div className="booking"><b>{name}</b><span>{project}{service?' · '+service:''}</span><em className={status}>{labels[status]||status}</em></div>}

function Payments({payments=[]}){
  const fallback=[];
  const [items,setItems]=useState(payments.length?payments:fallback),[filter,setFilter]=useState('all');
  useEffect(()=>setItems(payments.length?payments:fallback),[payments]);
  const visible=filter==='all'?items:items.filter(x=>x.status===filter);
  const total=items.filter(x=>x.status==='paid').reduce((sum,x)=>sum+Number(x.amount||0),0);
  const fmt=x=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(Number(x.amount||0));
  const setStatus=async(id,status)=>{try{await api.updatePayment(id,status);setItems(v=>v.map(x=>x.id===id?{...x,status}:x))}catch{window.alert('Не удалось изменить статус платежа')}};
  const labels={pending:'Ожидает',paid:'Оплачен',refunded:'Возврат',failed:'Ошибка'};
  return <><Header eyebrow="Финансы" title="Платежи" description="Оплаты, возвраты и финансовые операции клиентских проектов."/><div className="metrics compact"><Metric title="Получено" value={new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(total)} change="оплаченные операции" icon={CircleDollarSign}/><Metric title="Операций" value={String(items.length)} change="всего" icon={CreditCard}/><Metric title="Ожидает" value={String(items.filter(x=>x.status==='pending').length)} change="к оплате" icon={Clock3}/><Metric title="Возвраты" value={String(items.filter(x=>x.status==='refunded').length)} change="операции" icon={BarChart3}/></div><section className="card calendar-card"><div className="card-head"><div><h2>Операции</h2><span>Платежи по всем проектам</span></div><div className="calendar-actions">{[['all','Все'],['pending','Ожидают'],['paid','Оплачены'],['refunded','Возвраты'],['failed','Ошибки']].map(([id,label])=><button key={id} className={filter===id?'filter active':'filter'} onClick={()=>setFilter(id)}>{label}</button>)}</div></div>{visible.length===0?<div className="empty-editor"><CreditCard size={24}/><b>Операций нет</b><span>Платежи появятся после первой оплаты.</span></div>:<div className="inbox-list">{visible.map((p,i)=><div className="inbox-row" key={p.id||i}><div className="inbox-avatar"><CreditCard size={17}/></div><div className="inbox-main"><b>{p.project_name||'Проект'}</b><span>{p.description||'Оплата'} · {new Date(p.created_at).toLocaleString('ru-RU')}</span></div><strong>{fmt(p)}</strong><span className={'status '+(p.status==='paid'?'success':p.status==='refunded'?'draft':'working')}><i/>{labels[p.status]||p.status}</span>{p.id&&<select value={p.status||'pending'} onChange={e=>setStatus(p.id,e.target.value)}><option value="pending">Ожидает</option><option value="paid">Оплачен</option><option value="refunded">Возврат</option><option value="failed">Ошибка</option></select>}</div>)}</div>}</section></>
}

function Orders({orders=[],projects=[]}){
  const [items,setItems]=useState(orders||[])
  const [filter,setFilter]=useState('all')
  const [selected,setSelected]=useState(null)
  const [detail,setDetail]=useState(null)
  const [busy,setBusy]=useState(false)
  useEffect(()=>setItems(orders||[]),[orders])
  const visible=filter==='all'?items:items.filter(x=>x.status===filter)
  const money=v=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Number(v||0))
  const labels={pending:'Ожидает оплаты',paid:'Оплачен',cancelled:'Отменён',refunded:'Возврат'}
  const openOrder=async(id)=>{
    setSelected(id)
    try{setDetail((await api.order(id))||null)}catch(e){window.alert(e.message||'Не удалось открыть заказ')}
  }
  const createInvoice=async()=>{
    if(!selected)return
    setBusy(true)
    try{const r=await api.createOrderInvoice(selected);setDetail(v=>v?{...v,invoice:r.invoice}:v);window.alert('Счёт создан')}
    catch(e){window.alert(e.message||'Не удалось создать счёт')}
    finally{setBusy(false)}
  }
  const payOrder=async()=>{
    if(!detail?.order||detail.order.status==='paid')return
    setBusy(true)    try{
      const r=await api.createPayment({project_id:detail.order.project_id,client_id:detail.order.client_id||null,order_id:detail.order.id,amount:Number(detail.order.total),currency:detail.order.currency||'RUB',status:'paid',description:'Оплата заказа '+detail.order.number})
      setItems(v=>v.map(x=>x.id===detail.order.id?{...x,status:'paid'}:x))
      setDetail(v=>v?{...v,order:{...v.order,status:'paid'},payments:[r.payment,...(v.payments||[])]}:v)
    }catch(e){window.alert(e.message||'Не удалось принять оплату')}
    finally{setBusy(false)}
  }
  return <><Header eyebrow="Продажи" title="Заказы" description="Полный цикл: каталог → заказ → клиент → счёт → оплата."/>
    <div className="metrics compact">      <Metric title="Заказы" value={String(items.length)} change="всего" icon={ShoppingCart}/>
      <Metric title="Оплачено" value={money(items.filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.total||0),0))} change="выручка" icon={CircleDollarSign}/>
      <Metric title="Новые" value={String(items.filter(x=>x.status==='pending').length)} change="ожидают оплаты" icon={Clock3}/>
      <Metric title="Средний чек" value={money(items.length?items.reduce((s,x)=>s+Number(x.total||0),0)/items.length:0)} change="по заказам" icon={Receipt}/>
    </div>
    <section className="card calendar-card">
      <div className="card-head"><div><h2>Реестр заказов</h2><span>{items.length} заказов · по всем проектам</span></div><div className="calendar-actions">{[['all','Все'],['pending','Ожидают'],['paid','Оплачены'],['cancelled','Отменены'],['refunded','Возвраты']].map(([id,label])=><button key={id} className={filter===id?'filter active':'filter'} onClick={()=>setFilter(id)}>{label}</button>)}</div></div>
      {visible.length===0?<div className="empty-editor"><ShoppingCart size={24}/><b>Заказов пока нет</b><span>Создайте заказ из каталога проекта или примите заказ с сайта / Mini App.</span></div>:
      <div className="inbox-list">{visible.map((o,i)=><div className="inbox-row" key={o.id||i}>
        <div className="inbox-avatar"><ShoppingCart size={17}/></div>
        <div className="inbox-main"><b>{o.number||'Заказ'}</b><span>{o.project_name||projects.find(p=>p.id===o.project_id)?.name||'Проект'}{o.client_name?' · '+o.client_name:''} · {new Date(o.created_at).toLocaleString('ru-RU')}</span></div>
        <strong>{money(o.total)}</strong><span className={'status '+(o.status==='paid'?'success':o.status==='pending'?'working':'draft')}><i/>{labels[o.status]||o.status}</span>
        <div className="catalog-actions"><button className="filter" onClick={()=>openOrder(o.id)}>Открыть</button>{o.status!=='paid'&&<button className="filter" onClick={()=>openOrder(o.id)}>Оплатить</button>}</div>
      </div>)}</div>}
    </section>
    {detail&&<div className="public-modal-backdrop" onMouseDown={()=>{setDetail(null);setSelected(null)}}><section className="card order-detail-modal" onMouseDown={e=>e.stopPropagation()}>
      <button className="public-close" onClick={()=>{setDetail(null);setSelected(null)}}><X size={18}/></button>
      <div className="eyebrow">Заказ</div><h2>{detail.order?.number}</h2>
      <div className="order-detail-grid">
        <div><span>Проект</span><b>{detail.order?.project_name||'—'}</b></div>
        <div><span>Клиент</span><b>{detail.client?.name||'Без клиента'}</b></div>
        <div><span>Сумма</span><b>{money(detail.order?.total)}</b></div>
        <div><span>Статус</span><b>{labels[detail.order?.status]||detail.order?.status}</b></div>
      </div>
      <h3>Позиции</h3><div className="order-detail-lines">{(detail.order?.items||[]).map((x,i)=><div key={i}><span>{x.name} × {x.quantity}</span><b>{money(Number(x.price||0)*Number(x.quantity||1))}</b></div>)}</div>
      <h3>Оплата и счёт</h3><div className="order-detail-lines">
        {(detail.payments||[]).length?(detail.payments||[]).map((p,i)=><div key={p.id||i}><span>{p.description||'Платёж'} · {new Date(p.created_at).toLocaleString('ru-RU')}</span><b>{money(p.amount)}</b></div>):<div><span>Платежей пока нет</span><b>—</b></div>}
        <div><span>{detail.invoice?'Счёт '+detail.invoice.number:'Счёт не создан'}</span><b>{detail.invoice?money(detail.invoice.amount):'—'}</b></div>
      </div>
      <h3>История</h3><div className="order-timeline">{(detail.timeline||[]).map((x,i)=><div key={i}><span>{new Date(x.date).toLocaleString('ru-RU')}</span><b>{x.text}</b></div>)}</div>
      <div className="setting-actions"><button className="filter" onClick={createInvoice} disabled={busy||!!detail.invoice}>{detail.invoice?'Счёт создан':'Выставить счёт'}</button><button className="primary" onClick={payOrder} disabled={busy||detail.order?.status==='paid'}>{detail.order?.status==='paid'?'Оплачен':'Принять оплату'}</button></div>
    </section></div>}
  </>
}

function Analytics({metrics}){
  const m=metrics||{},series=m.series||[]
  const max=Math.max(1,...series.map(x=>Number(x.revenue||0)))
  const visitToLead=m.visits?((m.leads/m.visits)*100).toFixed(1):'0.0'
  const leadToBooking=m.leads?((m.bookings/m.leads)*100).toFixed(1):'0.0'
  const money=v=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Number(v||0))
  return <><Header eyebrow="Отчёты" title="Аналитика" description="Показатели студии и клиентских проектов в одном отчёте."/>
    <div className="metrics"><Metric title="Посещения" value={Number(m.visits||0).toLocaleString('ru-RU')} change="за 30 дней" icon={Globe2}/><Metric title="Заявки" value={Number(m.leads||0).toLocaleString('ru-RU')} change="за 30 дней" icon={Inbox}/><Metric title="Бронирования" value={Number(m.bookings||0).toLocaleString('ru-RU')} change="за 30 дней" icon={CalendarDays}/><Metric title="Выручка" value={money(m.revenue)} change="оплаченные" icon={CircleDollarSign}/></div>
    <div className="metrics compact"><Metric title="Заказы" value={Number(m.orders||0).toLocaleString('ru-RU')} change="создано за 30 дней" icon={ShoppingCart}/><Metric title="Оплачено заказов" value={Number(m.paidOrders||0).toLocaleString('ru-RU')} change="успешные оплаты" icon={CheckCircle2}/><Metric title="Средний чек" value={money(m.averageOrder)} change="по всем заказам" icon={Receipt}/><Metric title="Конверсия в оплату" value={Number(m.paymentConversion||0).toFixed(1)+'%'} change="заказ → оплата" icon={CreditCard}/></div>
    <div className="analytics-grid"><section className="card chart-card"><div className="card-head"><div><h2>Динамика выручки</h2><span>Реальные платежи за последние 30 дней</span></div></div><div className="analytics-bars">{(series.length?series:[{day:'Нет данных',revenue:0}]).slice(-14).map((x,i)=><div className="analytics-bar" key={x.day+i}><div className="analytics-bar-stack"><i style={{height:(Number(x.revenue||0)/max*100)+'%'}}/></div><span>{x.day==='Нет данных'?'—':new Date(x.day).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})}</span></div>)}</div></section>
      <section className="card funnel-card"><div className="card-head"><div><h2>Конверсия</h2><span>Путь клиента по воронке</span></div></div><div className="funnel-row"><b>Посещение → заявка</b><strong>{visitToLead}%</strong></div><div className="funnel-row"><b>Заявка → бронирование</b><strong>{leadToBooking}%</strong></div><div className="funnel-row"><b>Заказ → оплата</b><strong>{Number(m.paymentConversion||0).toFixed(1)}%</strong></div><div className="analytics-note">Финансовая конверсия считается по реальным заказам.</div></section></div>
  </>
}

function Integrations(){const items=[['Telegram','Заявки, уведомления и Mini Apps','Подключено',Send],['Payments','Оплата и статусы заказов','Подключить',CreditCard],['Analytics','События и конверсии','Подключено',BarChart3],['Domains','Домены и SSL','Подключено',Globe2],['CRM','Синхронизация клиентов','Подключить',Users],['Webhooks','Внешние автоматизации','Подключить',Zap]];return <><Header eyebrow="Экосистема" title="Интеграции" description="Подключайте сервисы, которые расширяют возможности Nexora."/><div className="integration-grid">{items.map(([name,desc,status,Icon])=><div className="card integration" key={name}><div className="integration-icon"><Icon size={20}/></div><div><h3>{name}</h3><span>{desc}</span></div><button className={status==='Подключено'?'connected':'filter'}>{status}</button></div>)}</div></>}

function Templates({onCreate}){const templates=[['barber','Барбершоп','Барбершоп','dark'],['beauty','Салон красоты','Салон красоты','blue'],['fitness','Фитнес','Фитнес-студия','purple'],['cafe','Кафе','Кафе / ресторан','orange'],['shop','Магазин','Интернет-магазин','green'],['services','Услуги','Бизнес и услуги','pink']];return <><Header eyebrow="Библиотека" title="Шаблоны" description="Готовые стартовые проекты с готовыми страницами, блоками и каталогом."/><div className="template-grid">{templates.map(([id,name,desc,color])=><div className="card template" key={id}><div className={`template-preview ${color}`}><span>{name}</span><div className="template-lines"><i/><i/><i/></div></div><div className="template-info"><div><h3>{name}</h3><span>{desc} · страницы + каталог</span></div><button className="filter" onClick={()=>onCreate('site',id)}>Использовать</button></div></div>)}</div></>}

function PaymentsPage(){
  const [plans,setPlans]=useState([]),[account,setAccount]=useState(null),[busy,setBusy]=useState(''),[message,setMessage]=useState('');
  const load=()=>Promise.allSettled([api.billingPlans(),api.billingAccount()]).then(([p,a])=>{if(p.status==='fulfilled')setPlans(p.value.plans||[]);if(a.status==='fulfilled')setAccount(a.value)});
  useEffect(()=>{load()},[]);
  const active=account?.plan?.id||'free';
  const startCheckout=async plan=>{
    if(plan.id===active)return;
    setBusy(plan.id);setMessage('');
    try{
      const result=await api.billingCheckout(plan.id);
      if(result.free){setMessage('Тариф Free подключён.');await load();return}
      if(result.checkout_url) window.location.assign(result.checkout_url);
      else setMessage('ЮKassa не вернула ссылку на оплату.');
    }catch(error){setMessage(error?.message||'Не удалось создать оплату. Проверьте настройки ЮKassa.')}finally{setBusy('')}
  };
  return <><Header eyebrow="Финансы" title="Тариф и оплата" description="Управление тарифом Nexora Studio и безопасная оплата через ЮKassa."/>
    <div className="metrics compact">
      <Metric title="Тариф" value={account?.plan?.name||active} change={account?.status==='active'?'Активен':'Требует внимания'} icon={ShieldCheck}/>
      <Metric title="Валюта" value={account?.currency==='USD'?'USD $':'RUB ₽'} change="валюта биллинга" icon={CircleDollarSign}/>
      <Metric title="Провайдер" value={account?.provider==='yookassa'?'ЮKassa':'—'} change={account?.provider?'подключён':'не использован'} icon={CreditCard}/>
      <Metric title="Продление" value={account?.renews_at?new Date(account.renews_at).toLocaleDateString('ru-RU'):'—'} change={account?.renews_at?'через 30 дней':'без автопродления'} icon={CheckCircle2}/>
    </div>
    {message&&<div className="form-error" style={{marginBottom:14}}>{message}</div>}
    <div className="pricing-grid">{plans.map(p=><div className={p.id===active?'pricing-card featured':'pricing-card'} key={p.id}><div className="pricing-head"><div><b>{p.name}</b><span>{p.projectLimit} проектов</span></div></div><div className="pricing-price">{p.price===0?'Бесплатно':'₽'+Number(p.rubPrice||p.price||0).toLocaleString('ru-RU')}<small>{p.price===0?'':' / 30 дней'}</small></div><ul><li>До {Number(p.clientLimit||0).toLocaleString('ru-RU')} клиентов</li><li>{p.teamLimit} участников</li><li>Сайт + Telegram Mini App</li></ul><button className={p.id===active?'primary':'filter'} disabled={busy!==''||p.id===active} onClick={()=>startCheckout(p)}>{busy===p.id?'Создаём оплату…':p.id===active?'Текущий тариф':p.id==='free'?'Перейти на Free':'Оплатить через ЮKassa'}</button></div>)}</div>
    <div className="card setting-block"><h2>Платёжная схема</h2><div className="security-cards"><div><CreditCard size={18}/><b>ЮKassa</b><span>Платёж создаётся на сервере с idempotency key, а тариф активируется только после подтверждённого payment.succeeded.</span></div><div><ShieldCheck size={18}/><b>Защита от повторов</b><span>Webhook идемпотентен: повторное уведомление не продлит подписку повторно.</span></div></div><p className="pricing-note"><ShieldCheck size={17}/> Для production нужны YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY и webhook <code>/api/billing/yookassa/webhook</code>.</p></div>
  </>
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
  const labels={profile:'Профиль студии',branding:'Брендинг',team:'Команда',notifications:'Уведомления',payments:'Оплата',security:'Безопасность',billing:'Тариф и оплата'}
  const loadTeam=async()=>{try{const r=await api.team();setTeam(r.members||[]);setInvites(r.invitations||[])}catch{}}
  useEffect(()=>{if(tab==='team')loadTeam();if(tab==='billing'){api.billingPlans().then(r=>setPlans(r.plans||[])).catch(()=>{});api.studioUsage().then(setUsage).catch(()=>{});api.billingAccount().then(setBillingAccount).catch(()=>{})}},[tab])
  useEffect(()=>{if(tab==='billing'){api.billingAccount().then(setBillingAccount).catch(()=>{});api.studioUsage().then(setUsage).catch(()=>{})}},[tab])
  const changeLanguage=v=>{setUiLanguage(v);setLanguage(v)}
  const changeCurrency=async value=>{const next=String(value||'RUB').toUpperCase();setBillingCurrency(next);setCurrency(next);try{await api.updateBillingSettings(next)}catch{}}
  const add=async()=>{if(!form.email)return;setBusy(true);try{await api.addTeamMember(form);setForm({email:'',role:'member'});await loadTeam();window.alert('Приглашение создано. Скопируйте ссылку из списка приглашений.')}catch(e){window.alert(e.message||'Не удалось создать приглашение')}finally{setBusy(false)}}
  const role=async(id,v)=>{try{await api.updateTeamRole(id,v);await loadTeam()}catch{window.alert('Не удалось изменить роль')}}
  const remove=async id=>{if(!window.confirm('Удалить участника?'))return;try{await api.removeTeamMember(id);await loadTeam()}catch{window.alert('Не удалось удалить участника')}}
  const revoke=async id=>{if(!window.confirm('Отозвать приглашение?'))return;try{await api.revokeTeamInvitation(id);await loadTeam()}catch{window.alert('Не удалось отозвать приглашение')}}
  const switchPlan=async()=>{setTab('payments')}
  const planPrice=p=>Number(p.rubPrice??0).toLocaleString('ru-RU')
  return <><Header eyebrow="Рабочее пространство" title="Настройки" description="Управляйте студией, командой, безопасностью и доступами."/>
    <div className="settings-layout">
      <div className="settings-nav card">{Object.keys(labels).map(x=><button key={x} className={tab===x?'selected':''} onClick={()=>setTab(x)}>{labels[x]}</button>)}</div>
      <section className="card settings-form">
        {tab==='profile'&&<div className="setting-block"><h2>Профиль студии</h2><span>Основная информация рабочего пространства.</span><label>Название студии<input value="Nexora Studio" readOnly/></label><label>Рабочий email<input value="studio@nexora.local" readOnly/></label><div className="catalog-form-grid"><label>Язык интерфейса<select value={language} onChange={e=>changeLanguage(e.target.value)}><option value="ru">Русский</option><option value="en">Английский</option></select></label><label>Валюта оплаты<select value={billingCurrency} onChange={e=>changeCurrency(e.target.value)}><option value="RUB">Российский рубль (₽)</option><option value="USD">Доллар США ($)</option></select></label></div></div>}
        {tab==='team'&&<><div className="setting-block"><h2>Команда студии</h2><span>Управляйте ролями и доступами сотрудников.</span><div className="team-list">{team.map(m=><div className="team-row" key={m.id}><div className="user-avatar">{String(m.name||'?').slice(0,1)}</div><div className="team-person"><b>{m.name}</b><span>{m.email}</span></div>{m.role==='owner'?<span className="status success"><i/>Владелец</span>:<><select value={m.role} onChange={e=>role(m.id,e.target.value)}><option value="admin">Администратор</option><option value="member">Участник</option><option value="viewer">Наблюдатель</option></select><button className="filter" onClick={()=>remove(m.id)}>Удалить</button></>}</div>)}</div></div><div className="setting-block"><h2>Пригласить сотрудника</h2><div className="team-add-grid"><input type="email" placeholder="Email сотрудника" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/><select value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value}))}><option value="admin">Администратор</option><option value="member">Участник</option><option value="viewer">Наблюдатель</option></select><button className="primary" disabled={busy} onClick={add}>{busy?'Создаём…':'Создать приглашение'}</button></div></div><div className="setting-block"><h2>Ожидают приглашения</h2>{invites.length===0?<div className="empty-editor"><b>Нет активных приглашений</b></div>:<div className="team-list">{invites.map(inv=><div className="team-row" key={inv.id}><div className="team-person"><b>{inv.email}</b><span>Истекает {new Date(inv.expires_at).toLocaleDateString('ru-RU')}</span></div><span className="status draft"><i/>Ожидает</span><button className="filter" onClick={()=>revoke(inv.id)}>Отозвать</button></div>)}</div>}</div></>}