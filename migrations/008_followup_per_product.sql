-- Добавляем product_id чтобы отслеживать отправку отдельно по каждой серии
ALTER TABLE followup_emails ADD COLUMN IF NOT EXISTS product_id text NOT NULL DEFAULT '';

-- Меняем уникальный ключ: теперь одному заказу можно отправить письмо по каждой серии
ALTER TABLE followup_emails DROP CONSTRAINT IF EXISTS followup_emails_order_id_key;
ALTER TABLE followup_emails DROP CONSTRAINT IF EXISTS followup_emails_order_id_product_id_key;
ALTER TABLE followup_emails ADD CONSTRAINT followup_emails_order_id_product_id_key UNIQUE (order_id, product_id);

CREATE INDEX IF NOT EXISTS followup_emails_product_id ON followup_emails (product_id);
