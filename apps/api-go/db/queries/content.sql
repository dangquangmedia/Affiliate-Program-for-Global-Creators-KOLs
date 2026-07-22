-- name: LockParticipationForContent :one
SELECT
  p.*,
  c.title AS campaign_title,
  c.platform AS campaign_platform,
  c.required_hashtag
FROM participation p
JOIN campaign c ON c.id = p.campaign_id
WHERE p.profile_id = $1 AND p.campaign_id = $2 AND p.country_id = $3
FOR UPDATE OF p;

-- name: GetParticipationForContent :one
SELECT
  p.*,
  c.title AS campaign_title,
  c.platform AS campaign_platform,
  c.required_hashtag
FROM participation p
JOIN campaign c ON c.id = p.campaign_id
WHERE p.profile_id = $1 AND p.campaign_id = $2 AND p.country_id = $3;

-- name: NextSubmissionAttemptNo :one
SELECT (COALESCE(max(attempt_no), 0) + 1)::integer
FROM content_submission
WHERE participation_id = $1;

-- name: GetLatestRejectedSubmission :one
SELECT *
FROM content_submission
WHERE participation_id = $1 AND state = 'REJECTED'
ORDER BY attempt_no DESC
LIMIT 1;

-- name: CreateContentSubmission :one
INSERT INTO content_submission (
  id, participation_id, attempt_no, supersedes_id, url, platform,
  hashtag_ok, platform_ok, state
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SUBMITTED')
RETURNING *;

-- name: MarkParticipationContentSubmitted :exec
UPDATE participation
SET state = 'CONTENT_SUBMITTED', row_version = row_version + 1
WHERE id = $1;

-- name: ListContentSubmissions :many
SELECT *
FROM content_submission
WHERE participation_id = $1
ORDER BY attempt_no DESC;

-- name: ListContentQueue :many
SELECT
  s.id AS submission_id,
  u.display_name AS creator_name,
  c.title AS campaign_title,
  s.url,
  s.attempt_no,
  s.hashtag_ok,
  s.platform_ok,
  s.created_at AS submitted_at
FROM content_submission s
JOIN participation p ON p.id = s.participation_id
JOIN creator_country_profile profile ON profile.id = p.profile_id
JOIN app_user u ON u.id = profile.user_id
JOIN campaign c ON c.id = p.campaign_id
WHERE s.state = 'SUBMITTED' AND p.country_id = $1
ORDER BY s.created_at ASC, s.id ASC;

-- name: GetSubmissionForReviewCountry :one
SELECT
  s.*,
  p.profile_id,
  p.country_id,
  p.snapshot_reward_minor,
  p.snapshot_currency
FROM content_submission s
JOIN participation p ON p.id = s.participation_id
WHERE s.id = $1 AND p.country_id = $2;

-- The conditional state predicate is the review claim: under concurrent approvals only one
-- transaction can return a row. The loser observes zero rows after the winner commits.
-- name: ClaimContentReview :one
UPDATE content_submission
SET
  state = sqlc.arg(next_state)::"SubmissionState",
  reject_reason = sqlc.narg(reject_reason),
  reviewed_by = sqlc.arg(reviewed_by),
  reviewed_at = CURRENT_TIMESTAMP,
  row_version = row_version + 1
WHERE id = sqlc.arg(id) AND state = 'SUBMITTED'
RETURNING *;

-- name: CreateEarning :one
INSERT INTO earning (
  id, participation_id, submission_id, country_id, profile_id,
  gross_minor, tax_minor, currency, status, updated_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', CURRENT_TIMESTAMP)
RETURNING *;

-- name: CreateLedgerEntry :one
INSERT INTO ledger_entry (
  id, country_id, profile_id, entry_type, amount_minor, currency,
  ref_type, ref_id, reversal_of_id, earning_id
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: MarkParticipationApproved :exec
UPDATE participation
SET state = 'APPROVED', row_version = row_version + 1
WHERE id = $1;

-- name: MarkParticipationRejected :exec
UPDATE participation
SET state = 'REJECTED', fix_deadline_at = $2, row_version = row_version + 1
WHERE id = $1;

