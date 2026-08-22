-- The Whispering Archive — schema (idempotent, applied on service start)
-- Postgres 15

CREATE TABLE IF NOT EXISTS users (
  id              text PRIMARY KEY,
  username        text NOT NULL UNIQUE,
  password_hash   text NOT NULL,
  role            text NOT NULL DEFAULT 'user',  -- 'user' | 'moderator'
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash    text PRIMARY KEY,
  user_id       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS publications (
  id                  text PRIMARY KEY,
  owner_id            text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_character_id text,               -- provenance from the local character at publish time
  name                text NOT NULL,
  role                text NOT NULL DEFAULT '',
  profile             text NOT NULL DEFAULT '',
  opening_message     text NOT NULL DEFAULT '',
  avatar_url          text,
  scene_image_url     text,
  tags                text[] NOT NULL DEFAULT '{}',
  age_category        text NOT NULL DEFAULT 'unspecified',   -- 'minor' | 'adult' | 'unspecified'
  content_rating      text NOT NULL DEFAULT 'general',       -- 'general' | 'mature'
  visibility          text NOT NULL DEFAULT 'unlisted',      -- 'unlisted' | 'public'
  moderation_status   text NOT NULL DEFAULT 'pending',       -- 'pending' | 'published' | 'rejected'
  creator_credit      text,
  license             text,
  version             int NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS publications_owner_idx ON publications(owner_id);
CREATE INDEX IF NOT EXISTS publications_visibility_idx ON publications(visibility);
CREATE INDEX IF NOT EXISTS publications_moderation_idx ON publications(moderation_status);
CREATE INDEX IF NOT EXISTS publications_name_idx ON publications(lower(name));
CREATE INDEX IF NOT EXISTS publications_tags_idx ON publications USING gin(tags);

CREATE TABLE IF NOT EXISTS reports (
  id             text PRIMARY KEY,
  publication_id text NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  reporter_id    text REFERENCES users(id) ON DELETE SET NULL,
  category       text NOT NULL,
  details        text,
  status         text NOT NULL DEFAULT 'open',   -- 'open' | 'resolved' | 'dismissed'
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_publication_idx ON reports(publication_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);

CREATE TABLE IF NOT EXISTS user_backups (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  format     text NOT NULL DEFAULT 'howling-whispers-backup',
  version    int  NOT NULL DEFAULT 1,
  device     text NOT NULL DEFAULT '',
  source     text NOT NULL DEFAULT 'web',
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload    bytea NOT NULL
);

CREATE INDEX IF NOT EXISTS user_backups_user_idx ON user_backups(user_id, created_at);