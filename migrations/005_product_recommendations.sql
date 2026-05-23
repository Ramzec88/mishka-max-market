alter table products add column if not exists recommended_product_ids text[] default '{}';
