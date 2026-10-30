-- Schema do ranking. A API também cria isto automaticamente (IF NOT EXISTS),
-- então rodar este arquivo é opcional: turso db shell neon-arcade < schema.sql
CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  game       TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  score      INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scores_game_score ON scores (game, score DESC);
