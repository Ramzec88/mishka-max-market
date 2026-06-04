ALTER TABLE products ADD COLUMN IF NOT EXISTS bundle_product_ids text[] NOT NULL DEFAULT '{}';
