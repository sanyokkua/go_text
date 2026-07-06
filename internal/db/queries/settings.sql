-- name: GetSetting :one
SELECT value, type FROM settings WHERE key = ?;

-- name: ListSettings :many
SELECT key, value, type FROM settings;

-- name: UpsertSetting :exec
INSERT INTO settings (key, value, type) VALUES (?, ?, ?)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, type = excluded.type;
