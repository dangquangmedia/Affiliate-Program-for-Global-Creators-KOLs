-- name: UpsertKycCase :one
INSERT INTO kyc_case (id, profile_id, state, updated_at)
VALUES ($1, $2, 'DRAFT', CURRENT_TIMESTAMP)
ON CONFLICT (profile_id)
DO UPDATE SET profile_id = EXCLUDED.profile_id
RETURNING *;

-- name: CreateKycField :exec
INSERT INTO kyc_field (id, case_id, key, label, state)
VALUES ($1, $2, $3, $4, 'EMPTY')
ON CONFLICT (case_id, key) DO NOTHING;

-- name: GetKycCaseByID :one
SELECT *
FROM kyc_case
WHERE id = $1;

-- name: GetKycCaseForCountry :one
SELECT
  k.id,
  k.profile_id,
  k.state,
  p.country_id
FROM kyc_case k
JOIN creator_country_profile p ON p.id = k.profile_id
WHERE k.id = $1
FOR UPDATE OF k;

-- name: ListKycFields :many
SELECT *
FROM kyc_field
WHERE case_id = $1
ORDER BY id ASC;

-- name: UpdateEditableKycField :exec
UPDATE kyc_field
SET value = $3, state = 'FILLED', reason = NULL
WHERE case_id = $1 AND key = $2 AND state <> 'ACCEPTED';

-- name: SubmitKycCase :one
UPDATE kyc_case
SET
  state = CASE WHEN state = 'REJECTED' THEN 'RESUBMITTED'::"KycCaseState" ELSE 'SUBMITTED'::"KycCaseState" END,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: ListKycQueueCases :many
SELECT
  k.id,
  k.profile_id,
  k.state,
  u.display_name AS creator_name,
  k.updated_at
FROM kyc_case k
JOIN creator_country_profile p ON p.id = k.profile_id
JOIN app_user u ON u.id = p.user_id
WHERE p.country_id = $1 AND k.state IN ('SUBMITTED', 'RESUBMITTED')
ORDER BY k.updated_at ASC, k.id ASC;

-- name: ReviewKycField :exec
UPDATE kyc_field
SET state = $3, reason = $4
WHERE case_id = $1 AND key = $2;

-- name: AllKycFieldsAccepted :one
SELECT COALESCE(bool_and(state = 'ACCEPTED'), false)::boolean
FROM kyc_field
WHERE case_id = $1;

-- name: FinishKycReview :one
UPDATE kyc_case
SET state = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;
