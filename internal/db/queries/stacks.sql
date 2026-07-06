-- name: ListStacks :many
SELECT * FROM stacks ORDER BY name;

-- name: GetStack :one
SELECT * FROM stacks WHERE id = ?;

-- name: InsertStack :exec
INSERT INTO stacks (id, name, icon, default_format, default_in_lang, default_out_lang, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateStack :exec
UPDATE stacks SET
  name = ?, icon = ?, default_format = ?, default_in_lang = ?, default_out_lang = ?, updated_at = ?
WHERE id = ?;

-- name: DeleteStack :exec
DELETE FROM stacks WHERE id = ?;

-- name: GetStackSteps :many
SELECT action_id FROM stack_steps WHERE stack_id = ? ORDER BY position;

-- name: InsertStackStep :exec
INSERT INTO stack_steps (stack_id, position, action_id) VALUES (?, ?, ?);

-- name: DeleteAllStackSteps :exec
DELETE FROM stack_steps WHERE stack_id = ?;
