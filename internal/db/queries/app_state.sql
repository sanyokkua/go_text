-- name: GetCurrentProviderID :one
SELECT current_provider_id FROM app_state WHERE id = 1;

-- name: SetCurrentProviderID :exec
INSERT INTO app_state (id, current_provider_id) VALUES (1, ?)
ON CONFLICT(id) DO UPDATE SET current_provider_id = excluded.current_provider_id;
