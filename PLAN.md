# Мишка Макс — Маркет цифровых товаров

> План разработки и запуска отдельного маркета для продажи mp3, PDF-сценариев и методических материалов через YooKassa. Файлы хранятся в Supabase Storage, доставка — через одноразовые защищённые ссылки.

**Домен (финальный):** `market.mishka-max.ru`
**Тестовый домен:** `mishka-max-market.vercel.app`
**Репозиторий:** `github.com/Ramzec88/mishka-max-market` (private)
**Владелец:** ИП Роман, бренд «Мишка Макс»

---

## 1. Цель и объём проекта

### Что делаем
Отдельный маркет цифровых товаров на поддомене, изолированный от основного сайта `mishka-max.ru`. Продаём:
- Аудио (mp3 песни, минусовки, колыбельные, аудиосказки)
- PDF (сценарии утренников, методички, карточки, раскраски)
- Комплекты (набор файлов разного формата в одном заказе)

### Что НЕ делаем в MVP
- Личный кабинет с регистрацией (доступ к заказам — только по email-ссылке)
- Подписочная модель (это уже есть в «Кладовой педагога» на Boosty)
- Админку для добавления товаров (используем Supabase Table Editor напрямую)
- Промокоды и скидки (добавим во второй итерации)
- Отзывы и рейтинги (добавим во второй итерации)

### Метрика успеха MVP
Пайплайн «каталог → корзина → оплата → email → скачивание» работает без ручных действий для 10+ последовательных тестовых покупок. После — подключаем боевой магазин YooKassa.

---

## 2. Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (Vercel)                     │
│  Next.js 14 App Router + Tailwind + React Server Comp   │
│                                                         │
│  /              — каталог + корзина                     │
│  /thank-you     — страница после оплаты                 │
│  /download/[id] — защищённая выдача файла               │
│  /offer, /privacy — юридические страницы                │
└───────────────┬─────────────────────────────────────────┘
                │
     ┌──────────┴──────────┐
     ▼                     ▼
┌──────────────┐   ┌──────────────────────────────────────┐
│   API routes │   │           STORAGE                    │
│   (Vercel)   │   │                                      │
│              │   │   Supabase Storage (приватный бакет) │
│  /api/       │   │   └── products/                      │
│  create-     │   │       ├── songs-graduation/...       │
│   payment    │   │       ├── scenario-first-ticket/...  │
│  /api/       │   │       └── ...                        │
│  yookassa/   │   │                                      │
│   webhook    │   └──────────────────────────────────────┘
│  /api/       │
│  download/   │   ┌──────────────────────────────────────┐
│  [token]     │──▶│          DATABASE                    │
└──────┬───────┘   │          Supabase Postgres           │
       │           │                                      │
       │           │  products, orders, download_tokens   │
       │           └──────────────────────────────────────┘
       │
       ▼
┌──────────────┐   ┌──────────────────────────────────────┐
│   YooKassa   │   │           EMAIL                      │
│   (платежи   │   │                                      │
│    + чеки    │   │   Timeweb SMTP (info@mishka-max.ru)  │
│    54-ФЗ)    │   │   Nodemailer                         │
└──────────────┘   └──────────────────────────────────────┘
```

### Почему такой стек

| Компонент | Выбор | Почему |
|-----------|-------|--------|
| Фреймворк | Next.js 14 | Родная среда Vercel, SSR + API routes в одном проекте |
| Хостинг | Vercel | Free tier, автодеплой из GitHub, preview URLs |
| Хранилище | Supabase Storage | Приватные бакеты, signed URLs с TTL из коробки, уже в стеке Романа |
| БД | Supabase Postgres | Та же экосистема, уже знакома |
| Платежи | YooKassa | РФ-решение, встроенный 54-ФЗ (чеки), тестовый режим |
| Email | Timeweb SMTP | Уже настроен `info@mishka-max.ru`, отправка из РФ |
| Язык | TypeScript | Безопасность типов для платёжной логики |

---

## 3. Схема БД (Supabase Postgres)

### Таблица `products`
```sql
create table products (
  id text primary key,                      -- 'songs-graduation' (slug)
  title text not null,
  description text,
  price int not null,                       -- в копейках: 59900 = 599₽
  price_old int,                            -- для перечёркнутой цены
  category text,                            -- songs | scenarios | materials | bundles
  cover_emoji text,                         -- временная заглушка вместо картинок
  cover_variant text default 'orange',      -- orange|lavender|green|blue
  badge text,                               -- 'хит' | 'новинка' | 'выгодно' | null
  format text,                              -- 'MP3 + тексты' (отображается на карточке)

  storage_paths text[] not null,            -- ['products/songs-graduation/01.mp3', ...]
  -- если один путь заканчивается на /, это папка — все файлы из неё попадут в архив

  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index on products (is_active, sort_order);
```

### Таблица `orders`
```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  items jsonb not null,                     -- ['songs-graduation', 'scenario-8march']
  amount int not null,                      -- сумма в копейках
  yookassa_payment_id text unique,
  status text default 'pending',            -- pending | paid | failed | canceled
  created_at timestamptz default now(),
  paid_at timestamptz,
  email_sent_at timestamptz,

  -- для защиты от повторной обработки webhook
  webhook_processed_at timestamptz
);

create index on orders (email, created_at desc);
create index on orders (yookassa_payment_id);
create index on orders (status);
```

### Таблица `download_tokens`
```sql
create table download_tokens (
  token text primary key,                   -- nanoid(32)
  order_id uuid references orders(id) on delete cascade,
  product_id text references products(id),
  file_path text not null,                  -- 'products/songs-graduation/01.mp3'

  expires_at timestamptz not null,          -- now() + 7 days
  downloads_count int default 0,
  max_downloads int default 5,

  last_downloaded_at timestamptz,
  created_at timestamptz default now()
);

create index on download_tokens (order_id);
create index on download_tokens (expires_at);
```

### RLS (Row Level Security)
Все таблицы — `enable row level security`. Доступ только через `service_role_key` на бэкенде. Публичного доступа нет.

---

## 4. Структура Supabase Storage

**Бакет:** `products`
**Тип:** приватный (private)
**Доступ:** только через signed URLs, генерируемые сервером

```
products/                              ← корень приватного бакета
├── songs-graduation/
│   ├── 01-vypusknoy-bal.mp3
│   ├── 02-pervyj-uchitel.mp3
│   ├── ...
│   ├── minusovki/
│   │   ├── 01-vypusknoy-bal-minus.mp3
│   │   └── ...
│   └── teksty.pdf
├── scenario-first-ticket/
│   └── scenarij.pdf
├── bundle-kindergarten/
│   ├── README.txt
│   ├── songs/
│   ├── scenarios/
│   └── materials/
└── ...
```

### Правила именования
- Slug-kebab-case для папок и файлов (`songs-graduation`, не `songs_graduation`)
- Только латиница в именах файлов (русские имена могут сломаться в signed URL)
- Отображаемые названия — только в БД в поле `title`

### Лимиты бесплатного тарифа Supabase
- 1 ГБ хранилища
- 2 ГБ трафика/месяц
- При превышении — переход на Pro ($25/мес, 100 ГБ)

---

## 5. Пользовательские сценарии

### 5.1 Покупка (основной флоу)
1. Пользователь открывает `market.mishka-max.ru`
2. Видит каталог, фильтрует по категории
3. Кликает карточку → добавляется в корзину (localStorage)
4. Открывает корзину → вводит email → жмёт «Оплатить»
5. Фронт шлёт `POST /api/create-payment` → получает `confirmation_token`
6. Открывается виджет YooKassa (embedded, не уводит с сайта)
7. Пользователь оплачивает тестовой/реальной картой
8. YooKassa перенаправляет на `/thank-you?order={id}`
9. Параллельно YooKassa шлёт webhook `payment.succeeded` на `/api/yookassa/webhook`
10. Webhook: проверяет статус → создаёт токены скачивания → отправляет email
11. На странице `/thank-you` пользователь видит кнопки «Скачать» для каждого товара
12. Клик на «Скачать» → `/api/download/[token]` → редирект на signed URL Supabase

### 5.2 Повторное скачивание
- Пользователь открывает email, жмёт на ссылку
- Ссылка действует 7 дней, лимит 5 скачиваний
- По истечении — пишет в поддержку (ручное продление через Supabase)

### 5.3 Неудачная оплата
- YooKassa шлёт webhook `payment.canceled`
- Заказ помечается `status=canceled`
- Email не отправляется
- Пользователь видит ошибку в виджете, может повторить

### 5.4 Edge case: webhook не пришёл
- На `/thank-you` есть fallback: polling статуса заказа раз в 3 секунды (5 попыток)
- Если через 15 секунд статус всё ещё `pending` — показать «Обработка… проверьте email через минуту или напишите info@mishka-max.ru»

---

## 6. Структура проекта

```
mishka-max-market/
├── app/
│   ├── layout.tsx                   # общий layout, шрифты, хедер, футер
│   ├── page.tsx                     # главная — каталог + корзина
│   ├── globals.css                  # токены дизайна, Tailwind
│   │
│   ├── thank-you/
│   │   └── page.tsx                 # страница после оплаты
│   │
│   ├── offer/page.tsx               # оферта (статичный текст)
│   ├── privacy/page.tsx             # политика конфиденциальности
│   ├── contacts/page.tsx            # контакты и реквизиты ИП
│   │
│   └── api/
│       ├── create-payment/route.ts     # POST: создать платёж
│       ├── yookassa/webhook/route.ts   # POST: webhook от YooKassa
│       ├── download/[token]/route.ts   # GET: скачать по токену
│       └── order-status/[id]/route.ts  # GET: статус для polling
│
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Catalog.tsx                  # сетка карточек + фильтры
│   ├── ProductCard.tsx
│   ├── CartDrawer.tsx               # боковая панель корзины
│   ├── CartButton.tsx
│   ├── CheckoutForm.tsx             # email + кнопка оплаты
│   └── YooKassaWidget.tsx           # обёртка над виджетом
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # публичный клиент (anon key)
│   │   └── admin.ts                 # серверный клиент (service_role)
│   ├── yookassa.ts                  # обёртка над @a2seven/yoo-checkout
│   ├── email.ts                     # nodemailer + шаблоны писем
│   ├── tokens.ts                    # генерация nanoid, валидация
│   └── cart.ts                      # утилиты корзины (localStorage)
│
├── types/
│   ├── product.ts
│   ├── order.ts
│   └── yookassa.ts
│
├── public/
│   ├── favicon.ico
│   ├── og-image.png                 # превью для соцсетей
│   └── mishka-logo.svg
│
├── emails/
│   └── order-delivery.html          # HTML-шаблон письма
│
├── migrations/
│   ├── 001_initial_schema.sql       # создание таблиц
│   └── 002_seed_products.sql        # тестовые товары
│
├── .env.local                       # секреты (в .gitignore!)
├── .env.example                     # пример переменных
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── PLAN.md                          # этот документ
└── README.md                        # как запустить локально
```

---

## 7. Переменные окружения

### `.env.example` (коммитим в репо)
```bash
# YooKassa — ТЕСТОВЫЕ ключи на время разработки
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=

# Supabase — DEV проект
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# SMTP для email
SMTP_HOST=smtp.timeweb.ru
SMTP_PORT=465
SMTP_USER=info@mishka-max.ru
SMTP_PASSWORD=
SMTP_FROM="Мишка Макс <info@mishka-max.ru>"

# Публичный URL сайта
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Где хранить реальные значения
- Локально: `.env.local` (в `.gitignore`)
- Vercel: Settings → Environment Variables (по отдельности для Production / Preview / Development)
- При переходе на прод: заменить тестовые ключи YooKassa и Supabase на боевые

---

## 8. Дизайн-система

### Цвета (CSS-переменные)
```css
--orange: #FF7A3D;          /* основной акцент */
--orange-dark: #E85D1A;     /* hover */
--orange-light: #FFF1E8;    /* фон карточек */
--ink: #1F1B16;             /* текст */
--ink-soft: #5A4F45;        /* вторичный текст */
--cream: #FFFAF4;           /* фон страницы */
--border: #F0E4D6;          /* разделители */
--lavender: #8B7AB8;        /* Dreams sub-brand */
```

### Типографика
- Шрифт: **Nunito** (Google Fonts, веса 400/600/700/800/900)
- Заголовки: 900, tight letter-spacing
- Основной текст: 400-600

### Компоненты
- Скругления: 16px (карточки) / 24px (крупные блоки) / 100px (кнопки)
- Тени: мягкие, на оранжевой основе (`rgba(255, 122, 61, 0.08-0.14)`)
- Кнопки: pill-shaped (border-radius 100px)
- Основная CTA-кнопка: `--orange` фон, белый текст, при hover → `--orange-dark`

### Referência
Готовый прототип страницы — `market.html` из предыдущего обсуждения. Используем его как отправную точку, портируем в React-компоненты.

---

## 9. Юридические требования (54-ФЗ, 152-ФЗ)

### Обязательно для запуска
- [ ] **Оферта** — публичный договор с условиями продажи цифровых товаров. Ссылка из корзины и футера.
- [ ] **Политика конфиденциальности** — обработка email и платёжных данных.
- [ ] **Согласие на обработку ПДн** — чекбокс или указание в оферте, что клик = согласие.
- [ ] **Реквизиты ИП** — ИНН, ОГРНИП, контакты — в футере и на странице `/contacts`.

### Фискализация (54-ФЗ)
- YooKassa предоставляет **встроенную онлайн-кассу** — включить в настройках магазина (+1.5% к комиссии)
- Чеки приходят покупателю автоматически на email
- В `receipt` при создании платежа передаём:
  - `vat_code: 1` (НДС не облагается — АвтоУСН)
  - `payment_mode: 'full_payment'`
  - `payment_subject: 'service'` (цифровой товар = услуга)

### АвтоУСН и цифровые товары
- АвтоУСН поддерживается YooKassa
- Доход фиксируется автоматически через интеграцию YooKassa с ФНС
- Ручной ввод в книгу учёта не нужен

---

## 10. Этапы разработки

### Этап 0: Подготовка окружения (1 день)
- [ ] Создать приватный репо `mishka-max-market` на GitHub
- [ ] Инициализировать Next.js 14 + TypeScript + Tailwind
- [ ] Подключить репо к Vercel, получить preview URL
- [ ] Создать `mishka-market-dev` проект в Supabase
- [ ] Применить миграцию `001_initial_schema.sql`
- [ ] Создать приватный бакет `products` в Storage
- [ ] Включить тестовый магазин в YooKassa
- [ ] Настроить SMTP в Timeweb (если ещё не настроен)
- [ ] Заполнить `.env.local` и переменные в Vercel
- [ ] **Критерий готовности:** пустая страница Next.js открывается на Vercel preview

### Этап 1: Фронтенд каталога (2-3 дня)
- [ ] Layout + шрифты + дизайн-токены
- [ ] `Header` (логотип + кнопка корзины с бэйджем)
- [ ] `Footer` с реквизитами
- [ ] `Catalog`: fetch товаров из Supabase (SSR), рендер сетки
- [ ] `ProductCard` с бейджем, категорией, ценой
- [ ] Фильтры по категориям
- [ ] `CartDrawer` + `localStorage` для корзины
- [ ] Форма оплаты (email + итог + кнопка)
- [ ] Mobile responsive
- [ ] **Критерий готовности:** каталог открывается, корзина работает, переживает перезагрузку страницы

### Этап 2: Интеграция YooKassa (2 дня)
- [ ] `POST /api/create-payment` — пересчёт суммы на сервере, создание заказа, вызов YooKassa
- [ ] Подключить YooKassa Widget JS, компонент `YooKassaWidget`
- [ ] `POST /api/yookassa/webhook` — обработка `payment.succeeded` и `payment.canceled`
- [ ] Идемпотентность webhook (не обрабатывать дважды)
- [ ] Валидация источника webhook (IP или подпись)
- [ ] Логирование всех транзакций
- [ ] **Критерий готовности:** тестовая карта `5555 5555 5555 4444` → статус заказа становится `paid`

### Этап 3: Доставка файлов (2 дня)
- [ ] Генерация токенов в webhook после оплаты
- [ ] `GET /api/download/[token]` с проверками expires_at, downloads_count
- [ ] Генерация signed URL Supabase (TTL 60 секунд, только для редиректа)
- [ ] HTML-шаблон email `order-delivery.html`
- [ ] Отправка email через Nodemailer + Timeweb SMTP
- [ ] Страница `/thank-you` с дублированием ссылок
- [ ] Polling статуса заказа для fallback-UX
- [ ] **Критерий готовности:** тестовая покупка → письмо в inbox → скачивание работает

### Этап 4: Zip-архивы для многофайловых товаров (1 день)
- [ ] Утилита: при товаре с >1 файлом собирать zip на лету
- [ ] Либо: один токен = один zip (предпочтительнее, меньше ссылок в письме)
- [ ] Архив собирается в Vercel function, стримится в ответ
- [ ] Предел размера zip — 50 МБ (лимит Vercel payload)
- [ ] **Критерий готовности:** комплект из 12 mp3 скачивается одним архивом

### Этап 5: Юридические страницы + полировка (1-2 дня)
- [ ] Текст оферты (шаблон для цифровых товаров + кастомизация)
- [ ] Политика конфиденциальности
- [ ] Страница контактов с реквизитами
- [ ] SEO: meta-теги, OG-превью, sitemap, robots.txt
- [ ] Яндекс.Метрика (цель: `purchase_completed`)
- [ ] Страница 404
- [ ] Страница `/orders/[email]` — список заказов по email со ссылкой-подписью (для тех, кто потерял письмо)
- [ ] **Критерий готовности:** всё работает, можно показывать Надежде Анатольевне и бета-покупателям

### Этап 6: Наполнение и тестирование (1-2 дня)
- [ ] Залить 5-7 реальных товаров: файлы в Storage, записи в БД
- [ ] Провести 10 тестовых покупок с разными сценариями:
  - успех
  - отказ банка (карта `5555 5555 5555 4477`)
  - недостаточно средств (`5555 5555 5555 4436`)
  - отмена платежа пользователем
  - несколько товаров в корзине
  - комплект (многофайловый)
- [ ] Проверить email в Gmail, Yandex, Mail.ru (спам-фильтры)
- [ ] Проверить лимит скачиваний (5 раз)
- [ ] Проверить истечение токена (подменить `expires_at` вручную)
- [ ] Mobile-тест в Safari iOS, Chrome Android
- [ ] **Критерий готовности:** чек-лист из 10 пунктов пройден без багов

### Этап 7: Переход на прод (0.5 дня)
- [ ] Перейти в YooKassa на боевой магазин, обновить `SHOP_ID` и `SECRET_KEY` в Vercel
- [ ] Обновить URL webhook в YooKassa на боевой
- [ ] Создать прод-проект Supabase `mishka-market-prod`, применить миграцию, залить файлы
- [ ] Обновить Supabase-ключи в Vercel Production environment
- [ ] Подключить кастомный домен `market.mishka-max.ru`:
  - В Vercel: Settings → Domains → Add
  - В Cloudflare: CNAME `market` → `cname.vercel-dns.com`
- [ ] Сделать одну реальную покупку на 10-50₽ (тестовый товар-пустышка), убедиться, что деньги упали на счёт ИП
- [ ] Добавить ссылку «Маркет» в меню основного сайта `mishka-max.ru`
- [ ] **Критерий готовности:** реальная транзакция прошла, деньги получены, чек отправлен покупателю

### Этап 8: Анонс (0.5 дня)
- [ ] Пост в Telegram «Кладовая педагога»
- [ ] Пост в MAX-канале
- [ ] Stories в Instagram
- [ ] Email-рассылка по базе подписчиков
- [ ] Обновить Taplink

---

## 11. Тестирование

### Тестовые карты YooKassa (песочница)
| Карта | CVC | Срок | Результат |
|-------|-----|------|-----------|
| `5555 5555 5555 4444` | любой | будущее | ✅ успех |
| `5555 5555 5555 4477` | любой | будущее | ❌ отказ банка |
| `5555 5555 5555 4436` | любой | будущее | ❌ нет средств |
| `4111 1111 1111 1026` | любой | будущее | ✅ успех с 3D-Secure |

### Чек-лист перед продом
- [ ] Успешная оплата → webhook → email → скачивание
- [ ] Отказ → webhook → заказ `canceled` → email НЕ отправлен
- [ ] Webhook приходит дважды (симуляция ретрая) → обработан один раз
- [ ] Прямой переход на `/download/{несуществующий_токен}` → 404
- [ ] Переход на истёкший токен → 410
- [ ] 6-й переход на токен с лимитом 5 → 429
- [ ] Сумма считается на сервере (подмена цены в devtools не влияет)
- [ ] Email с кириллицей не падает в спам Gmail
- [ ] На iPhone Safari виджет YooKassa открывается и работает
- [ ] При >1 товаре в заказе — все ссылки в письме
- [ ] Тестовый товар с комплектом (>1 файл) → zip скачивается

---

## 12. Риски и ограничения

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Vercel недоступен из РФ | Средняя | У Romana кастомный домен через Cloudflare — работает. Fallback: переезд на Timeweb Cloud. |
| Email падает в спам | Высокая | Настроить SPF/DKIM для `mishka-max.ru`. Завести аккаунт в Unisender Go как backup. |
| Пользователь потерял письмо | Очень высокая | Страница `/thank-you` дублирует ссылки + `/orders/[email]` доступ по email. |
| Превышен лимит 1 ГБ Supabase | Средняя при росте | Мониторить, при 80% заполнения — либо Pro ($25/мес), либо перенос тяжёлых файлов на Яндекс Object Storage. |
| Репост ссылки в чаты | Высокая | Лимит 5 скачиваний + срок 7 дней покрывает легитимное использование. Для сериальных нарушителей — в ручном режиме видим в логах. |
| YooKassa отклонит магазин при проверке | Низкая (у Romana ИП в порядке) | Подать заявку заранее, параллельно с разработкой. |
| Файлы с кириллицей в имени ломают URL | Средняя | Правило именования: только латиница. Автоматическая транслитерация при загрузке. |

---

## 13. Что отложено на после MVP

### v1.1 — Улучшения UX (через 2-4 недели после запуска)
- Промокоды и скидки
- Upsell на странице `/thank-you` (подписка «Кладовая педагога»)
- Отзывы покупателей
- Превью материалов (30 сек mp3, первая страница PDF)

### v1.2 — Аналитика и рост
- Интеграция с Яндекс.Метрикой через events
- A/B-тестирование цен
- Автоматические напоминания о брошенных корзинах

### v2.0 — Масштабирование
- Личный кабинет с историей заказов
- Подарочные сертификаты
- Партнёрская программа для воспитателей
- API для интеграции с Telegram-ботами

---

## 14. Полезные ссылки

### Документация
- YooKassa API: https://yookassa.ru/developers/api
- YooKassa Widget: https://yookassa.ru/developers/payment-acceptance/integration-scenarios/widget/quick-start
- Supabase Storage: https://supabase.com/docs/guides/storage
- Supabase signed URLs: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl
- Next.js App Router: https://nextjs.org/docs/app
- Vercel Environment Variables: https://vercel.com/docs/environment-variables

### Библиотеки
- `@a2seven/yoo-checkout` — Node.js клиент YooKassa
- `@supabase/supabase-js` — клиент Supabase
- `nodemailer` — отправка email
- `nanoid` — генерация токенов
- `archiver` — сборка zip на лету

---

## 15. Глоссарий

- **Signed URL** — временная ссылка на приватный файл в Supabase с заданным TTL. Генерируется через `createSignedUrl(path, expiresIn)`.
- **Токен скачивания** — запись в таблице `download_tokens`, привязанная к заказу. По токену пользователь получает signed URL.
- **Идемпотентность webhook** — гарантия, что повторная доставка того же webhook не создаёт дублирующих токенов.
- **54-ФЗ** — российский закон об онлайн-кассах. Требует фискальный чек на каждую продажу.
- **АвтоУСН** — налоговый режим Romana (ИП). YooKassa автоматически передаёт доход в ФНС.
- **YooKassa Checkout Widget** — встраиваемая форма оплаты, не уводит пользователя с сайта.

---

**Дата создания:** 19 апреля 2026
**Автор:** Роман + Claude
**Версия:** 1.0
