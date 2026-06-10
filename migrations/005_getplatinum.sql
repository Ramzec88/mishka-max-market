-- GetPlatinum payment provider support
-- dealId = order.id (UUID), so no extra column needed for lookups.
-- payment_provider column already exists from migration 004.
-- This migration is a no-op placeholder for documentation purposes.

-- If you need to query GetPlatinum orders:
-- SELECT * FROM orders WHERE payment_provider = 'getplatinum';
