-- Re-assert Row Level Security across all tables.
--
-- RLS was found DISABLED on orders, download_tokens, and ~18 other tables in the live
-- database — diverging from 001_initial_schema.sql, which originally enabled it on
-- products/orders/download_tokens. Most likely toggled off via the Supabase dashboard
-- at some point (e.g. while debugging) and never re-enabled.
--
-- The app only ever talks to these tables through the service_role key (supabaseAdmin,
-- server-side only in app/api/**/route.ts) — service_role bypasses RLS regardless of
-- its on/off state, so enabling RLS with no policy is a total no-op for the app.
-- What it fixes: the Supabase REST/GraphQL endpoint is directly reachable on the public
-- internet, and with RLS off, anyone holding the public anon key (NEXT_PUBLIC_SUPABASE_
-- ANON_KEY — meant to be public by design) could query/mutate these tables directly via
-- PostgREST, completely bypassing the Next.js app. RLS is the only thing standing
-- between the anon key and raw table access at that layer.

alter table products enable row level security;
alter table orders enable row level security;
alter table download_tokens enable row level security;
alter table followup_emails enable row level security;
alter table admin_outreach enable row level security;
alter table reviews enable row level security;
alter table promo_codes enable row level security;
alter table demos enable row level security;

-- Re-assert the one legitimate public policy: the storefront's server-rendered catalog
-- reads active products with the anon key (app/(main)/page.tsx getProducts()).
drop policy if exists "Public read active products" on products;
create policy "Public read active products"
  on products for select
  using (is_active = true);

-- No policies are added for orders / download_tokens / followup_emails / admin_outreach /
-- reviews / promo_codes / demos — with RLS enabled and zero policies, anon/authenticated
-- requests are denied by default. Only service_role (used exclusively server-side) can
-- read or write them, matching how the app already accesses them today.
