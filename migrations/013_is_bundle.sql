-- Decouple "this product is composed from other products" from the public
-- display category, so a bundle can be published under any category
-- (e.g. "Сценарии") while keeping bundle-only behavior (no volume discounts,
-- bundle composition UI in admin, etc).
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bundle boolean NOT NULL DEFAULT false;

UPDATE products SET is_bundle = true WHERE category = 'bundles' AND NOT is_bundle;
