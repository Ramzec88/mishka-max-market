-- Add line_items JSONB column to orders to store per-item price breakdown
-- Each element: { product_id, title, regular_price, paid_price, is_bump }
ALTER TABLE orders ADD COLUMN IF NOT EXISTS line_items JSONB;
