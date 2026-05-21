-- Lava Top payment provider support
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lava_contract_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'yookassa';

CREATE INDEX IF NOT EXISTS idx_orders_lava_contract_id
  ON orders (lava_contract_id)
  WHERE lava_contract_id IS NOT NULL;
