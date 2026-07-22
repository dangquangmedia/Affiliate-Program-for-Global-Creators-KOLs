-- name: UpsertMockUser :one
INSERT INTO app_user (id, email, display_name, auth_provider, provider_subject)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (auth_provider, provider_subject)
DO UPDATE SET display_name = EXCLUDED.display_name
RETURNING *;

-- name: CreateSession :one
INSERT INTO session (id, user_id, token_hash, expires_at)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetSessionUserByTokenHash :one
SELECT
  s.id AS session_id,
  s.expires_at,
  s.revoked_at,
  u.id AS user_id,
  u.email,
  u.display_name
FROM session s
JOIN app_user u ON u.id = s.user_id
WHERE s.token_hash = $1;

-- name: ListRolesForUser :many
SELECT country_id, role
FROM role_assignment
WHERE user_id = $1
ORDER BY created_at ASC, id ASC;

-- name: RevokeSessionByTokenHash :exec
UPDATE session
SET revoked_at = CURRENT_TIMESTAMP
WHERE token_hash = $1 AND revoked_at IS NULL;

