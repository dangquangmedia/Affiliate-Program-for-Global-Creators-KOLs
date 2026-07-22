-- name: LockCampaignForJoin :one
SELECT
  c.id,
  c.country_id,
  c.title,
  c.reward_minor,
  c.currency,
  c.slots_total,
  c.slots_taken,
  c.status,
  c.ends_at,
  COALESCE(r.trigger_type, 'CONTENT_APPROVED'::"TriggerType") AS trigger_type,
  COALESCE(r.pricing_type, 'FLAT'::"PricingType") AS pricing_type
FROM campaign c
LEFT JOIN reward_rule r ON r.campaign_id = c.id
WHERE c.id = $1 AND c.country_id = $2
FOR UPDATE OF c;

-- name: LockCampaignForReclaim :one
SELECT
  c.id,
  c.country_id,
  c.title,
  c.reward_minor,
  c.currency,
  c.slots_total,
  c.slots_taken,
  c.status,
  c.ends_at,
  COALESCE(r.trigger_type, 'CONTENT_APPROVED'::"TriggerType") AS trigger_type,
  COALESCE(r.pricing_type, 'FLAT'::"PricingType") AS pricing_type
FROM campaign c
LEFT JOIN reward_rule r ON r.campaign_id = c.id
WHERE c.id = $1
FOR UPDATE OF c;

-- name: GetParticipationForJoin :one
SELECT *
FROM participation
WHERE profile_id = $1 AND campaign_id = $2;

-- name: GetParticipationByID :one
SELECT *
FROM participation
WHERE id = $1;

-- name: GetKycStateForProfile :one
SELECT state
FROM kyc_case
WHERE profile_id = $1;

-- name: CountWaitlistAhead :one
SELECT count(*)::bigint
FROM participation
WHERE campaign_id = $1
  AND state = 'WAITLISTED'
  AND waitlisted_at < $2;

-- PostgreSQL stores waitlisted_at at millisecond precision. The campaign row lock serializes
-- callers; advancing at least one millisecond avoids tied timestamps and preserves strict FCFS.
-- name: NextWaitlistedAt :one
SELECT GREATEST(
  clock_timestamp(),
  COALESCE(max(waitlisted_at) + interval '1 millisecond', clock_timestamp())
)::timestamptz
FROM participation
WHERE campaign_id = $1 AND state = 'WAITLISTED';

-- name: CreateWaitlistedParticipation :one
INSERT INTO participation (
  id, profile_id, campaign_id, country_id, state, waitlisted_at,
  snapshot_reward_minor, snapshot_currency, snapshot_trigger_type, snapshot_pricing_type,
  submit_deadline_at, fix_deadline_at
)
VALUES ($1, $2, $3, $4, 'WAITLISTED', $5, NULL, NULL, NULL, NULL, NULL, NULL)
RETURNING *;

-- name: UpdateWaitlistedParticipation :one
UPDATE participation
SET
  state = 'WAITLISTED',
  waitlisted_at = $2,
  snapshot_reward_minor = NULL,
  snapshot_currency = NULL,
  snapshot_trigger_type = NULL,
  snapshot_pricing_type = NULL,
  submit_deadline_at = NULL,
  fix_deadline_at = NULL,
  row_version = row_version + 1
WHERE id = $1
RETURNING *;

-- name: CreateJoinedParticipation :one
INSERT INTO participation (
  id, profile_id, campaign_id, country_id, state, joined_at,
  snapshot_reward_minor, snapshot_currency, snapshot_trigger_type, snapshot_pricing_type,
  submit_deadline_at, fix_deadline_at, waitlisted_at
)
VALUES ($1, $2, $3, $4, 'JOINED', $5, $6, $7, $8, $9, $10, NULL, NULL)
RETURNING *;

-- name: UpdateJoinedParticipation :one
UPDATE participation
SET
  state = 'JOINED',
  joined_at = $2,
  snapshot_reward_minor = $3,
  snapshot_currency = $4,
  snapshot_trigger_type = $5,
  snapshot_pricing_type = $6,
  submit_deadline_at = $7,
  fix_deadline_at = NULL,
  waitlisted_at = NULL,
  row_version = row_version + 1
WHERE id = $1
RETURNING *;

-- name: IncrementCampaignSlots :exec
UPDATE campaign
SET slots_taken = slots_taken + 1
WHERE id = $1;

-- name: DecrementCampaignSlots :exec
UPDATE campaign
SET slots_taken = GREATEST(slots_taken - 1, 0)
WHERE id = $1;

-- name: LeaveParticipation :one
UPDATE participation
SET state = 'LEFT', waitlisted_at = NULL, row_version = row_version + 1
WHERE id = $1
RETURNING *;

-- name: ListMyParticipations :many
SELECT
  p.*,
  c.title AS campaign_title,
  CASE WHEN p.state = 'WAITLISTED' THEN (
    SELECT count(*)::bigint + 1
    FROM participation ahead
    WHERE ahead.campaign_id = p.campaign_id
      AND ahead.state = 'WAITLISTED'
      AND ahead.waitlisted_at < p.waitlisted_at
  ) ELSE 0::bigint END AS waitlist_position
FROM participation p
JOIN campaign c ON c.id = p.campaign_id
WHERE p.profile_id = $1 AND p.country_id = $2 AND p.state <> 'LEFT'
ORDER BY p.joined_at DESC, p.id ASC;

-- name: GetNextWaitlistedParticipation :one
SELECT *
FROM participation
WHERE campaign_id = $1 AND state = 'WAITLISTED'
ORDER BY waitlisted_at ASC, id ASC
LIMIT 1
FOR UPDATE;

-- name: ListExpiredParticipationCandidates :many
SELECT id, campaign_id
FROM participation
WHERE (state = 'JOINED' AND submit_deadline_at < $1)
   OR (state = 'REJECTED' AND fix_deadline_at < $1)
ORDER BY campaign_id ASC, id ASC;

-- name: ExpireParticipation :one
UPDATE participation
SET state = 'EXPIRED', strike_count = strike_count + 1, row_version = row_version + 1
WHERE id = $1
RETURNING *;
