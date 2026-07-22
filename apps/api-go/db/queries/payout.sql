-- name: LockCreatorProfileForPayout :one
SELECT id
FROM creator_country_profile
WHERE id = $1 AND country_id = $2
FOR UPDATE;

-- name: SumAvailableEarningNet :one
SELECT COALESCE(sum(gross_minor - tax_minor), 0)::bigint
FROM earning
WHERE profile_id = $1 AND country_id = $2 AND status = 'AVAILABLE';

-- name: SumOutstandingPayouts :one
SELECT COALESCE(sum(amount_minor), 0)::bigint
FROM payout_request
WHERE profile_id = $1 AND country_id = $2
  AND state IN ('PROCESSING', 'PAID', 'UNKNOWN_HOLD');

-- name: ListProfilePayouts :many
SELECT *
FROM payout_request
WHERE profile_id = $1 AND country_id = $2
ORDER BY requested_at DESC, id DESC;

-- name: CreatePayoutOTP :one
INSERT INTO otp_code (id, user_id, purpose, code, expires_at)
VALUES ($1, $2, 'PAYOUT', $3, $4)
RETURNING *;

-- name: GetPayoutOTPForUpdate :one
SELECT *
FROM otp_code
WHERE id = $1 AND user_id = $2 AND purpose = 'PAYOUT'
FOR UPDATE;

-- name: ConsumePayoutOTP :one
UPDATE otp_code
SET consumed_at = CURRENT_TIMESTAMP
WHERE id = $1 AND consumed_at IS NULL
RETURNING *;

-- name: GetPayoutByIdempotencyKey :one
SELECT *
FROM payout_request
WHERE idempotency_key = $1 AND profile_id = $2;

-- name: CreatePayoutRequest :one
INSERT INTO payout_request (
  id, country_id, profile_id, amount_minor, currency, state, otp_id, idempotency_key
)
VALUES ($1, $2, $3, $4, $5, 'PROCESSING', $6, $7)
RETURNING *;

-- name: ListPayoutQueueByState :many
SELECT
  payout.*,
  u.display_name AS creator_name
FROM payout_request payout
JOIN creator_country_profile profile ON profile.id = payout.profile_id
JOIN app_user u ON u.id = profile.user_id
WHERE payout.country_id = $1 AND payout.state = $2
ORDER BY payout.requested_at ASC, payout.id ASC;

-- name: GetPayoutInCountry :one
SELECT *
FROM payout_request
WHERE id = $1 AND country_id = $2;

-- name: ClaimPayoutState :one
UPDATE payout_request
SET state = sqlc.arg(to_state)::"PayoutState"
WHERE id = sqlc.arg(id) AND state = sqlc.arg(from_state)::"PayoutState"
RETURNING *;

-- name: NextPayoutAttemptNo :one
SELECT (count(*) + 1)::integer
FROM payout_attempt
WHERE payout_request_id = $1;

-- name: CreatePayoutAttempt :one
INSERT INTO payout_attempt (id, payout_request_id, provider_ref, result, raw)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;
