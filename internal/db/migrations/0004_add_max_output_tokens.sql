-- +goose Up
-- T62: decouples ContextWindow from the output-token cap by introducing an
-- independent MaxOutputTokens field. INSERT OR IGNORE keeps this idempotent
-- against a DB that already has the keys (e.g. seeded after this migration
-- was added) and never clobbers a value the running app already wrote.
-- +goose StatementBegin
INSERT OR IGNORE INTO settings (key, value, type) VALUES ('model.useMaxOutputTokens', 'false', 'bool');
INSERT OR IGNORE INTO settings (key, value, type) VALUES ('model.maxOutputTokens', '2048', 'int');
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM settings WHERE key IN ('model.useMaxOutputTokens', 'model.maxOutputTokens');
-- +goose StatementEnd
