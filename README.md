# Nexora Studio

Nexora Studio — SaaS Operating System for digital studios and agencies.

Платформа позволяет студии вести клиентские проекты из одного рабочего пространства: сайт, Telegram Mini App, каталог, заявки, CRM, бронирования, заказы, счета, аналитика, домены и оплата.

## Что уже реализовано

- Авторизация: регистрация, вход, сессии, выход.
- Роли команды: owner / admin / member / viewer.
- Проекты и рабочие пространства.
- Шаблоны сайтов и Mini Apps.
- Редактор страниц на блоках.
- Публикация проекта.
- Публичный сайт.
- Публичный Telegram Mini App интерфейс.
- Каталог товаров/услуг.
- Заявки и конвертация в клиента.
- CRM и карточка клиента.
- Бронирования с проверкой конфликтов.
- Заказы, оплаты и счета.
- Аналитика проекта и студии.
- Подключение домена с DNS CNAME-проверкой.
- Telegram Mini App через Bot API.
- ЮKassa подключена для биллинга тарифов: checkout, подтверждение платежа и webhook с идемпотентной активацией тарифа.
- Stripe из продукта исключён.
- Ограничения тарифов по проектам, клиентам и участникам.
- Автоматический запуск PostgreSQL migrations перед API.

## Запуск

Команды: `npm install`, затем `npm run build`, затем `npm start`.

Если `DATABASE_URL` не задан, API работает в demo/memory режиме.

Если `DATABASE_URL` задан, перед запуском API автоматически выполняются `server/schema.sql` и все миграции из `server/migrations/`.

## Переменные окружения

Минимально для production:

- `DATABASE_URL` — PostgreSQL.
- `APP_URL` или `RENDER_EXTERNAL_URL` — публичный HTTPS URL приложения.
- `YOOKASSA_SHOP_ID` — идентификатор магазина ЮKassa, нужен на финальном этапе.
- `YOOKASSA_SECRET_KEY` — секретный ключ ЮKassa, нужен на финальном этапе.
- `TELEGRAM_BOT_TOKEN` — токен Telegram-бота для подключения Mini App.

Для локального запуска без ключей ЮKassa биллинг остаётся недоступным, а остальные функции работают в demo/memory режиме. В production для платных тарифов нужны ключи ЮKassa и webhook. Для публичных заказов также используется единый webhook `/api/public/yookassa/webhook` для события `payment.succeeded`.

## Миграции

Новые изменения БД добавляются в `server/migrations/NNN_description.sql`. Миграции применяются автоматически при `npm start` / `npm run api`.

## Production checklist

1. Задать production `DATABASE_URL`.
2. Задать `APP_URL` на HTTPS-домен приложения.
3. Задать `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY`.
4. В кабинете ЮKassa настроить webhook на `/api/billing/yookassa/webhook` для тарифного биллинга и `/api/public/yookassa/webhook` для публичных заказов; событие — `payment.succeeded`.
5. Для Telegram задать `TELEGRAM_BOT_TOKEN`.
6. Опубликовать проект и проверить публичный URL.
7. Для собственного домена направить CNAME на `<slug>.nexora.site` и пройти проверку домена.
8. После DNS-проверки подключить домен и настроить TLS на хостинге.

## Важно

Публичные заявки, бронирования и checkout не требуют авторизации студии. Все внутренние API студии требуют Bearer-сессию и проверяют принадлежность данных текущей студии.

Stripe не используется в текущей архитектуре Nexora Studio.
