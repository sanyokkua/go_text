-- name: AddHistory :exec
INSERT INTO history (
  id, created_at, kind, title, input_text, output_text, applied,
  provider_name, model, input_lang, output_lang, format,
  duration_ms, inferences, status, error_code, failed_index
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: PruneHistory :exec
DELETE FROM history WHERE id NOT IN (
  SELECT id FROM history ORDER BY created_at DESC LIMIT ?
);

-- name: ListHistory :many
SELECT * FROM history ORDER BY created_at DESC LIMIT ? OFFSET ?;

-- name: GetHistory :one
SELECT * FROM history WHERE id = ?;

-- name: DeleteHistory :exec
DELETE FROM history WHERE id = ?;

-- name: ClearHistory :exec
DELETE FROM history;

-- name: CountHistory :one
SELECT count(*) FROM history;
