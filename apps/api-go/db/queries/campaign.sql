-- name: ListCampaignsByCountry :many
SELECT *
FROM campaign
WHERE country_id = $1
ORDER BY created_at DESC;

-- name: ListActiveCampaignsByCountry :many
SELECT *
FROM campaign
WHERE country_id = $1 AND status = 'ACTIVE'
ORDER BY created_at DESC;

-- name: GetCampaignForCountry :one
SELECT *
FROM campaign
WHERE id = $1 AND country_id = $2;

-- name: GetRewardRuleByCampaignID :one
SELECT *
FROM reward_rule
WHERE campaign_id = $1;

-- name: CreateCampaign :one
INSERT INTO campaign (
  id, country_id, brand, title, reward_minor, currency, slots_total, slots_taken,
  status, platform, required_hashtag, brief
)
VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'ACTIVE', $8, $9, $10)
RETURNING *;

-- name: CreateRewardRule :one
INSERT INTO reward_rule (
  id, campaign_id, trigger_type, pricing_type, flat_amount_minor, cap_type, cap_slots
)
VALUES ($1, $2, 'CONTENT_APPROVED', 'FLAT', $3, 'SLOTS_X_PRICE', $4)
RETURNING *;
