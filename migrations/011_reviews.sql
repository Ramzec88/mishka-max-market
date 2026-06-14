-- Reviews table for product ratings and testimonials
create table reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  product_id text references products(id) on delete cascade not null,
  email text not null,
  name text,
  rating int not null check (rating between 1 and 5),
  body text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique(order_id, product_id)
);

create index reviews_product_published_idx on reviews(product_id) where is_published = true;
create index reviews_created_at_idx on reviews(created_at desc);
