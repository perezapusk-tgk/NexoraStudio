const DICT = {
  'Обзор':'Overview','Проекты':'Projects','Заявки':'Leads','Клиенты':'Clients','Бронирования':'Bookings','Платежи':'Payments','Заказы':'Orders','Счета':'Invoices','Сайты':'Websites','Mini Apps':'Mini Apps','Аналитика':'Analytics','Интеграции':'Integrations','Шаблоны':'Templates','Настройки':'Settings',
  'Рабочее пространство':'Workspace','Профиль студии':'Studio profile','Брендинг':'Branding','Команда':'Team','Уведомления':'Notifications','Безопасность':'Security','Тариф и оплата':'Plan & billing',
  'Доброе утро 👋':'Good morning 👋','Активные проекты':'Active projects','Новые заявки':'New leads','Продажи':'Sales','Получено':'Received','Операций':'Transactions','Ожидает':'Pending','Возвраты':'Refunds',
  'Новый проект':'New project','Что создаём?':'What are we creating?','Сайт':'Website','Сайт + Mini App':'Website + Mini App','Telegram Mini App':'Telegram Mini App',
  'Профиль студии':'Studio profile','Основная информация рабочего пространства.':'Basic workspace information.','Название студии':'Studio name','Рабочий email':'Work email','Часовой пояс':'Time zone','Внешний вид':'Appearance','Настройте стиль панели и клиентских проектов.':'Customize the dashboard and client project style.',
  'Светлая':'Light','Тёмная':'Dark','Системная':'System','Сохранить изменения':'Save changes','Отменить':'Cancel',
  'Язык интерфейса':'Interface language','Валюта оплаты':'Billing currency','Выберите язык всей панели':'Choose the language for the entire interface','Выберите валюту для тарифов и оплаты':'Choose the currency for plans and billing',
  'Русский':'Russian','Английский':'English','Российский рубль':'Russian ruble','Доллар США':'US dollar',
  'Команда студии':'Studio team','Добавляйте сотрудников по email — им выдаётся безопасная ссылка для первого входа.':'Invite team members by email — they receive a secure sign-in link.',
  'Ожидают приглашения':'Pending invitations','Пригласить сотрудника':'Invite a team member','Создать приглашение':'Create invitation','Администратор':'Administrator','Участник':'Member','Наблюдатель':'Viewer','Владелец':'Owner','полный доступ':'full access','только просмотр':'view only','проекты и CRM':'projects and CRM','команда и настройки':'team and settings',
  'Безопасность':'Security','Сессии':'Sessions','Пароли':'Passwords','Приглашения':'Invitations',
  'Тариф и оплата':'Plan & billing','Простые цены без завышения. Все тарифы рассчитаны на небольшие и растущие студии.':'Simple pricing without overcharging. Plans are designed for small and growing studios.',
  'Для старта':'For getting started','Для небольшой студии':'For a small studio','Для активной студии':'For an active studio','Для агентства':'For an agency','Популярный':'Popular','Бесплатно':'Free','Текущий тариф':'Current plan','Выбрать тариф':'Choose plan',
  'Сайты + Telegram Mini Apps':'Websites + Telegram Mini Apps','проект':'project','проектов':'projects','участник':'member','участника в команде':'team members','клиентов':'clients',
  'Оплата и переключение тарифов подключаются отдельно. Сейчас тарифы и лимиты уже заложены в архитектуру продукта.':'Payment processing and plan switching are connected separately. Plans and limits are already built into the product architecture.',
  'Обзор':'Overview','Центр управления клиентским проектом':'Client project control center','Следующие шаги':'Next steps','Настроить страницы':'Set up pages','Открыть редактор':'Open editor','Опубликовать':'Publish',
  'Страницы':'Pages','Каталог':'Catalog','Редактор':'Editor','Предпросмотр':'Preview',
  'Основные параметры':'General settings','Название проекта':'Project name','Домен':'Domain','Проверить домен':'Check domain','Подключить':'Connect','Сохранить':'Save',
  'Подключён':'Connected','Не подключён':'Not connected','Текст кнопки в Telegram':'Telegram button text','Подключить к Telegram':'Connect to Telegram',
  'Финансы':'Finance','Оплаты, возвраты и финансовые операции клиентских проектов.':'Payments, refunds and financial operations for client projects.',
  'Операции':'Transactions','Платежи по всем проектам':'Payments across all projects','Все':'All','Ожидают':'Pending','Оплачены':'Paid','Ошибки':'Errors','Операций нет':'No transactions','Платежи появятся после первой оплаты.':'Payments will appear after the first payment.',
  'Реестр заказов':'Order register','Реестр счетов':'Invoice register','Заказы появятся после оформления покупки в сайте или Mini App.':'Orders will appear after a purchase on a website or Mini App.',
  'Счетов пока нет':'No invoices yet','Заказов пока нет':'No orders yet','Новый счёт':'New invoice','Создать счёт':'Create invoice','Сумма':'Amount','Описание':'Description','Срок оплаты':'Due date',
  'Отправлен':'Sent','Просрочен':'Overdue','Отменён':'Cancelled','Черновик':'Draft','Оплачен':'Paid','Возврат':'Refund','Новый':'New',
  'Клиент':'Client','Без клиента':'No client','Телефон не указан':'Phone not provided','Email не указан':'Email not provided',
  'Добро пожаловать':'Welcome','Войти':'Sign in','Регистрация':'Sign up','Пароль':'Password','Ваше имя':'Your name','Название студии':'Studio name',
  'Email':'Email','Повторите пароль':'Confirm password','Создать рабочее пространство':'Create workspace',
  'Введите email и пароль':'Enter email and password','Минимум 8 символов':'Minimum 8 characters',
  'Загрузка…':'Loading…','Загрузка Nexora…':'Loading Nexora…'
}

const reverse = Object.fromEntries(Object.entries(DICT).map(([ru,en])=>[en,ru]))
const pairs = Object.entries(DICT).sort((a,b)=>b[0].length-a[0].length)

export const getLanguage=()=>localStorage.getItem('nexora_language')||'ru'
export const setLanguage=(lang)=>{
  const next=lang==='en'?'en':'ru'
  localStorage.setItem('nexora_language',next)
  window.dispatchEvent(new CustomEvent('nexora:language',{detail:next}))
  applyLanguage(next)
}
export const getCurrency=()=>localStorage.getItem('nexora_currency')||'RUB'
export const setCurrency=(currency)=>{
  const next=['RUB','USD'].includes(currency)?currency:'RUB'
  localStorage.setItem('nexora_currency',next)
  window.dispatchEvent(new CustomEvent('nexora:currency',{detail:next}))
}

const translateText=(text,lang)=>{
  if(!text||!text.trim()) return text
  if(lang==='ru') {
    let out=text
    for(const [en,ru] of Object.entries(reverse).sort((a,b)=>b[0].length-a[0].length)) out=out.split(en).join(ru)
    return out
  }
  let out=text
  for(const [ru,en] of pairs) out=out.split(ru).join(en)
  return out
}

export const applyLanguage=(lang=getLanguage())=>{
  const root=document.body
  if(!root) return
  document.documentElement.lang=lang==='en'?'en':'ru'
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT)
  const nodes=[]
  while(walker.nextNode()) nodes.push(walker.currentNode)
  nodes.forEach(node=>{
    if(node.parentElement?.closest('script,style')) return
    const next=translateText(node.nodeValue,lang)
    if(next!==node.nodeValue) node.nodeValue=next
  })
  root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
    el.placeholder=translateText(el.placeholder,lang)
  })
}

export const installLanguageObserver=()=>{
  applyLanguage()
  const observer=new MutationObserver(()=>applyLanguage())
  observer.observe(document.body,{subtree:true,childList:true,characterData:true})
  return ()=>observer.disconnect()
}
