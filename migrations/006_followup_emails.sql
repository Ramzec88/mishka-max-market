-- Таблица учёта follow-up писем «Письмо Мишки Макса»
-- Отправляется автоматически через 7 дней после покупки любой серии

CREATE TABLE IF NOT EXISTS followup_emails (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)        -- одно письмо на заказ, без дублей
);

CREATE INDEX IF NOT EXISTS followup_emails_email ON followup_emails (email);
CREATE INDEX IF NOT EXISTS followup_emails_sent_at ON followup_emails (sent_at DESC);

ALTER TABLE followup_emails ENABLE ROW LEVEL SECURITY;
