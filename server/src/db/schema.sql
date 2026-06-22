-- Схема БД TextQuest.
-- Полное состояние персонажа хранится в JSONB (data) — это устойчиво к
-- изменениям игровой модели. Ключевые поля продублированы колонками для поиска.

CREATE TABLE IF NOT EXISTS players (
  id          UUID PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  google_id   TEXT UNIQUE,
  email       TEXT,
  level       INTEGER NOT NULL DEFAULT 1,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS players_name_lower_idx ON players (lower(name));
CREATE INDEX IF NOT EXISTS players_google_idx ON players (google_id);
