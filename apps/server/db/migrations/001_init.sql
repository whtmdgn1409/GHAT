-- 001_init.sql
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token TEXT NOT NULL UNIQUE,
  issued_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  room_id TEXT PRIMARY KEY,
  host_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  max_participants INTEGER NOT NULL,
  participants_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  game_id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  status TEXT NOT NULL,
  score INTEGER NOT NULL,
  current_round INTEGER NOT NULL,
  rounds_json TEXT NOT NULL,
  policy_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_events (
  analytics_event_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_time TEXT NOT NULL,
  params_json TEXT NOT NULL,
  user_id TEXT,
  room_id TEXT,
  processed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_queue (
  queue_id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  next_attempt_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS word_packs (
  word_pack_id TEXT PRIMARY KEY,
  target_lang TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  topic TEXT NOT NULL,
  words_json TEXT NOT NULL
);
