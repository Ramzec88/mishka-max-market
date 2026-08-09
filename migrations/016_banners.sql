-- Promo banners shown in the homepage hero carousel, managed from /admin/settings.
-- desktop/mobile images are separate S3 keys because the carousel box switches to a
-- different fixed aspect ratio below the mobile breakpoint (see components/HeroCarousel.tsx).
create table if not exists banners (
  id                uuid        primary key default gen_random_uuid(),
  desktop_image_key text        not null,
  mobile_image_key  text        not null,
  link_url          text,
  is_active         boolean     not null default true,
  sort_order        int         not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists banners_active_sort on banners (is_active, sort_order);

-- Access only via service_role (admin API routes + homepage SSR fetch) — no anon policy needed.
alter table banners enable row level security;
