-- updates: 크롤링된 원본 게시물
CREATE TABLE IF NOT EXISTS updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL CHECK(source IN ('dcinside', 'nexon')),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  url TEXT,
  published_at TEXT,
  crawled_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_updates_source ON updates(source);
CREATE INDEX IF NOT EXISTS idx_updates_published ON updates(published_at DESC);

-- analyses: Gemini 분석 결과
CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  update_id INTEGER NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  sentiment TEXT CHECK(sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
  key_changes TEXT,
  community_reaction TEXT,
  analyzed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(update_id)
);

-- reactions: 감정 이모지 반응
CREATE TABLE IF NOT EXISTS reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  update_id INTEGER NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK(reaction_type IN ('cheer', 'good', 'meh', 'so_what', 'dislike', 'worst')),
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(update_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_reactions_update ON reactions(update_id);

-- shorts: 유튜브 숏츠 (자동 크롤링)
CREATE TABLE IF NOT EXISTS shorts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  creator TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  types TEXT NOT NULL DEFAULT '[]',
  maps TEXT NOT NULL DEFAULT '[]',
  thumbnail TEXT,
  published_at TEXT,
  crawled_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shorts_channel ON shorts(channel_id);
CREATE INDEX IF NOT EXISTS idx_shorts_crawled ON shorts(crawled_at DESC);

-- crawl_logs: 작업 로그
CREATE TABLE IF NOT EXISTS crawl_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_type TEXT NOT NULL CHECK(trigger_type IN ('cron', 'manual', 'n8n_push')),
  source TEXT,
  status TEXT NOT NULL CHECK(status IN ('started', 'success', 'partial', 'error')),
  records_added INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);
