-- Мишка Макс Маркет — начальная схема БД

-- ============================================================
-- Таблица товаров
-- ============================================================
create table if not exists products (
  id text primary key,                      -- 'songs-graduation' (slug)
  title text not null,
  description text,
  price int not null,                       -- в копейках: 59900 = 599₽
  price_old int,                            -- для перечёркнутой цены
  category text,                            -- songs | scenarios | materials | bundles
  cover_emoji text,                         -- временная заглушка вместо картинок
  cover_variant text default 'orange',      -- orange | lavender | green | blue
  badge text,                               -- 'хит' | 'новинка' | 'выгодно' | null
  format text,                              -- 'MP3 + тексты' (отображается на карточке)
  storage_paths text[] not null default '{}', -- ['products/songs-graduation/01.mp3', ...]
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists products_active_sort on products (is_active, sort_order);

-- ============================================================
-- Таблица заказов
-- ============================================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  items jsonb not null,                     -- ['songs-graduation', 'scenario-8march']
  amount int not null,                      -- сумма в копейках
  yookassa_payment_id text unique,
  status text default 'pending',            -- pending | paid | failed | canceled
  created_at timestamptz default now(),
  paid_at timestamptz,
  email_sent_at timestamptz,
  webhook_processed_at timestamptz          -- для защиты от повторной обработки webhook
);

create index if not exists orders_email_created on orders (email, created_at desc);
create index if not exists orders_payment_id on orders (yookassa_payment_id);
create index if not exists orders_status on orders (status);

-- ============================================================
-- Таблица токенов скачивания
-- ============================================================
create table if not exists download_tokens (
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

create index if not exists download_tokens_order on download_tokens (order_id);
create index if not exists download_tokens_expires on download_tokens (expires_at);

-- ============================================================
-- Row Level Security — весь доступ только через service_role
-- ============================================================
alter table products enable row level security;
alter table orders enable row level security;
alter table download_tokens enable row level security;

-- Публичный SELECT для продуктов (нужен для SSR каталога через anon key)
create policy "Public read active products"
  on products for select
  using (is_active = true);
