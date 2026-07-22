-- name: GetCountryByCode :one
SELECT *
FROM country
WHERE code = $1;

-- name: GetCountryConfigByCountryID :one
SELECT *
FROM country_config
WHERE country_id = $1;

-- name: UpsertCreatorCountryProfile :one
INSERT INTO creator_country_profile (id, user_id, country_id)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, country_id)
DO UPDATE SET user_id = EXCLUDED.user_id
RETURNING *;

-- name: ListCreatorCountryProfiles :many
SELECT
  p.id AS profile_id,
  p.onboarding_state,
  c.id AS country_id,
  c.code,
  c.name,
  c.currency_code,
  c.currency_exponent,
  c.locale,
  c.fallback_locale,
  c.enabled
FROM creator_country_profile p
JOIN country c ON c.id = p.country_id
WHERE p.user_id = $1
ORDER BY p.created_at ASC, p.id ASC;

