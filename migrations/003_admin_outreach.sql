-- Tracks which emails have been manually contacted via "Нужна помощь" tab
CREATE TABLE IF NOT EXISTS admin_outreach (
  email       text        PRIMARY KEY,
  contacted_at timestamptz NOT NULL DEFAULT now()
);
