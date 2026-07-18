-- Deterministic, idempotent, synthetic seed for local/test only.
-- No real PII, credentials, provider tokens or legal tax claims.

WITH vn AS (
  INSERT INTO country (id, code, name, currency_code, currency_exponent, enabled, created_at)
  VALUES ('10000000-0000-4000-8000-000000000001', 'VN', 'Vietnam', 'VND', 0, true, CURRENT_TIMESTAMP)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    currency_code = EXCLUDED.currency_code,
    currency_exponent = EXCLUDED.currency_exponent,
    enabled = EXCLUDED.enabled
  RETURNING id
)
INSERT INTO country_config (
  id, country_id, version, locale, fallback_locale, config_json, active, active_from, created_at
)
SELECT
  '11000000-0000-4000-8000-000000000001', id, 1, 'vi-VN', 'en',
  '{"kycChecklistVersion":"VN-v1","taxRuleVersion":"VN-DEMO-10","paymentAdapter":"mock","providerModeDisclosed":true}'::jsonb,
  true, '2026-07-18T00:00:00.000Z'::timestamptz, CURRENT_TIMESTAMP
FROM vn
ON CONFLICT (country_id, version) DO UPDATE SET
  locale = EXCLUDED.locale,
  fallback_locale = EXCLUDED.fallback_locale,
  config_json = EXCLUDED.config_json,
  active = EXCLUDED.active;

WITH ph AS (
  INSERT INTO country (id, code, name, currency_code, currency_exponent, enabled, created_at)
  VALUES ('20000000-0000-4000-8000-000000000001', 'PH', 'Philippines', 'PHP', 2, true, CURRENT_TIMESTAMP)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    currency_code = EXCLUDED.currency_code,
    currency_exponent = EXCLUDED.currency_exponent,
    enabled = EXCLUDED.enabled
  RETURNING id
)
INSERT INTO country_config (
  id, country_id, version, locale, fallback_locale, config_json, active, active_from, created_at
)
SELECT
  '21000000-0000-4000-8000-000000000001', id, 1, 'fil-PH', 'en',
  '{"kycChecklistVersion":"PH-v1","taxRuleVersion":"PH-DEMO-05","paymentAdapter":"mock","providerModeDisclosed":true}'::jsonb,
  true, '2026-07-18T00:00:00.000Z'::timestamptz, CURRENT_TIMESTAMP
FROM ph
ON CONFLICT (country_id, version) DO UPDATE SET
  locale = EXCLUDED.locale,
  fallback_locale = EXCLUDED.fallback_locale,
  config_json = EXCLUDED.config_json,
  active = EXCLUDED.active;

