-- name: ListLanguages :many
SELECT name FROM languages ORDER BY sort_order, name;

-- name: AddLanguage :exec
INSERT INTO languages (name, sort_order) VALUES (?, ?) ON CONFLICT(name) DO NOTHING;

-- name: RemoveLanguage :exec
DELETE FROM languages WHERE name = ?;
