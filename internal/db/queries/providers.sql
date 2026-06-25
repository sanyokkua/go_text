-- name: CountProviders :one
SELECT count(*) FROM providers;

-- name: ListProviders :many
SELECT * FROM providers ORDER BY name;

-- name: GetProvider :one
SELECT * FROM providers WHERE id = ?;

-- name: CreateProvider :exec
INSERT INTO providers (
  id, name, kind, base_url, auth_scheme, api_key_env_var, api_version,
  selected_model, completion_path, models_path, use_custom_models,
  headers, custom_models, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateProvider :exec
UPDATE providers SET
  name = ?, kind = ?, base_url = ?, auth_scheme = ?, api_key_env_var = ?,
  api_version = ?, selected_model = ?, completion_path = ?, models_path = ?,
  use_custom_models = ?, headers = ?, custom_models = ?, updated_at = ?
WHERE id = ?;

-- name: DeleteProvider :exec
DELETE FROM providers WHERE id = ?;
