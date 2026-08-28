-- Lets the admin post a public reply under a customer review (e.g. to correct a
-- misunderstanding or point to a fix) — shown wherever the review itself is shown.
alter table reviews add column if not exists admin_reply text;
alter table reviews add column if not exists admin_reply_at timestamptz;
