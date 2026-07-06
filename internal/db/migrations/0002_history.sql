-- +goose Up
-- +goose StatementBegin
CREATE TABLE history (
  id            TEXT PRIMARY KEY,
  created_at    INTEGER NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('single','stack')),
  title         TEXT NOT NULL,
  input_text    TEXT NOT NULL,
  output_text   TEXT NOT NULL,
  applied       TEXT NOT NULL DEFAULT '[]',
  provider_name TEXT NOT NULL DEFAULT '',
  model         TEXT NOT NULL DEFAULT '',
  input_lang    TEXT NOT NULL DEFAULT '',
  output_lang   TEXT NOT NULL DEFAULT '',
  format        TEXT NOT NULL DEFAULT '',
  duration_ms   INTEGER NOT NULL DEFAULT 0,
  inferences    INTEGER NOT NULL DEFAULT 1,
  status        TEXT NOT NULL CHECK (status IN ('success','partial','error')),
  error_code    TEXT NOT NULL DEFAULT '',
  failed_index  INTEGER NOT NULL DEFAULT -1
);
CREATE INDEX idx_history_created ON history(created_at DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE history;
-- +goose StatementEnd
