-- +goose Up
-- +goose StatementBegin
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type  TEXT NOT NULL CHECK (type IN ('int','float','bool','string','json'))
);

CREATE TABLE providers (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL UNIQUE,
  kind              TEXT NOT NULL CHECK (kind IN ('ollama','lmstudio','llamacpp','openai','azure')),
  base_url          TEXT NOT NULL,
  auth_scheme       TEXT NOT NULL DEFAULT 'none' CHECK (auth_scheme IN ('none','bearer','apiKey')),
  api_key_env_var   TEXT NOT NULL DEFAULT '',
  api_version       TEXT NOT NULL DEFAULT '',
  selected_model    TEXT NOT NULL DEFAULT '',
  completion_path   TEXT NOT NULL DEFAULT '',
  models_path       TEXT NOT NULL DEFAULT '',
  use_custom_models INTEGER NOT NULL DEFAULT 0,
  headers           TEXT NOT NULL DEFAULT '{}',
  custom_models     TEXT NOT NULL DEFAULT '[]',
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);

CREATE TABLE app_state (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  current_provider_id TEXT REFERENCES providers(id) ON DELETE SET NULL
);

CREATE TABLE languages (
  name       TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE stacks (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL UNIQUE,
  icon             TEXT NOT NULL DEFAULT '',
  default_format   TEXT NOT NULL DEFAULT '',
  default_in_lang  TEXT NOT NULL DEFAULT '',
  default_out_lang TEXT NOT NULL DEFAULT '',
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

CREATE TABLE stack_steps (
  stack_id  TEXT NOT NULL REFERENCES stacks(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,
  action_id TEXT NOT NULL,
  PRIMARY KEY (stack_id, position)
);

CREATE INDEX idx_stack_steps_stack ON stack_steps(stack_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE stack_steps;
DROP TABLE stacks;
DROP TABLE languages;
DROP TABLE app_state;
DROP TABLE providers;
DROP TABLE settings;
-- +goose StatementEnd
