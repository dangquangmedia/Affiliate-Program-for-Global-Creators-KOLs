-- name: CreateAuditEvent :exec
INSERT INTO audit_event (
  id, actor_user_id, country_id, action, target_type, target_id, metadata
)
VALUES ($1, $2, $3, $4, $5, $6, $7);

-- name: ListAuditEvents :many
SELECT
  e.id,
  u.display_name AS actor_name,
  e.action,
  c.code AS country_code,
  e.target_type,
  e.target_id,
  e.metadata,
  e.created_at
FROM audit_event e
JOIN app_user u ON u.id = e.actor_user_id
LEFT JOIN country c ON c.id = e.country_id
WHERE ($1::uuid IS NULL OR e.country_id = $1::uuid)
ORDER BY e.created_at DESC, e.id DESC
LIMIT 200;

