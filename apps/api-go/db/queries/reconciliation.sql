-- Serializes batch creation per country so concurrent Finance requests cannot select the same
-- unbatched earnings before either inserts reconciliation lines.
-- name: LockCountryForReconciliation :one
SELECT id
FROM country
WHERE id = $1
FOR UPDATE;

-- name: ListPendingUnreconciledEarnings :many
SELECT e.*
FROM earning e
LEFT JOIN reconciliation_line l ON l.earning_id = e.id
WHERE e.country_id = $1 AND e.status = 'PENDING' AND l.id IS NULL
ORDER BY e.created_at ASC, e.id ASC;

-- name: CreateReconciliationBatch :one
INSERT INTO reconciliation_batch (id, country_id, period, status)
VALUES ($1, $2, $3, 'OPEN')
RETURNING *;

-- name: CreateReconciliationLine :one
INSERT INTO reconciliation_line (id, batch_id, earning_id, net_minor, currency, anomaly)
VALUES ($1, $2, $3, $4, $5, NULL)
RETURNING *;

-- name: ListReconciliationBatches :many
SELECT
  b.id,
  b.period,
  b.status,
  b.locked_at,
  count(l.id)::bigint AS line_count,
  COALESCE(sum(CASE WHEN l.anomaly IS NULL THEN l.net_minor ELSE 0 END), 0)::bigint AS total_net_minor,
  (array_agg(l.currency ORDER BY l.created_at, l.id) FILTER (WHERE l.id IS NOT NULL))[1] AS currency
FROM reconciliation_batch b
LEFT JOIN reconciliation_line l ON l.batch_id = b.id
WHERE b.country_id = $1
GROUP BY b.id
ORDER BY b.created_at DESC, b.id DESC;

-- name: GetReconciliationBatch :one
SELECT
  b.id,
  b.period,
  b.status,
  b.locked_at,
  count(l.id)::bigint AS line_count,
  COALESCE(sum(CASE WHEN l.anomaly IS NULL THEN l.net_minor ELSE 0 END), 0)::bigint AS total_net_minor,
  (array_agg(l.currency ORDER BY l.created_at, l.id) FILTER (WHERE l.id IS NOT NULL))[1] AS currency
FROM reconciliation_batch b
LEFT JOIN reconciliation_line l ON l.batch_id = b.id
WHERE b.id = $1 AND b.country_id = $2
GROUP BY b.id;

-- name: ListReconciliationLines :many
SELECT
  l.id,
  l.earning_id,
  u.display_name AS creator_name,
  c.title AS campaign_title,
  l.net_minor,
  l.currency,
  l.anomaly
FROM reconciliation_line l
JOIN earning e ON e.id = l.earning_id
JOIN creator_country_profile p ON p.id = e.profile_id
JOIN app_user u ON u.id = p.user_id
JOIN participation participation ON participation.id = e.participation_id
JOIN campaign c ON c.id = participation.campaign_id
WHERE l.batch_id = $1
ORDER BY l.created_at ASC, l.id ASC;

-- name: ClaimReconciliationBatchLock :one
UPDATE reconciliation_batch
SET status = 'LOCKED', locked_by = $2, locked_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status = 'OPEN'
RETURNING *;

-- name: ReleaseBatchEarnings :many
UPDATE earning e
SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP
FROM reconciliation_line l
WHERE l.batch_id = $1
  AND l.earning_id = e.id
  AND l.anomaly IS NULL
  AND e.status = 'PENDING'
RETURNING e.id;

