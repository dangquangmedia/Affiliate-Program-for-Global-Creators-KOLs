-- Production-safe reference data only. No demo users, roles, campaigns or PII.

INSERT INTO country (id, code, name, currency_code, currency_exponent, locale, fallback_locale, enabled, created_at)
VALUES ('10000000-0000-4000-8000-000000000001', 'VN', 'Vietnam', 'VND', 0, 'vi-VN', 'en', true, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  currency_code = EXCLUDED.currency_code,
  currency_exponent = EXCLUDED.currency_exponent,
  locale = EXCLUDED.locale,
  fallback_locale = EXCLUDED.fallback_locale,
  enabled = EXCLUDED.enabled;

INSERT INTO country_config (
  id, country_id, tax_percent, min_payout_minor, feature_kyc, feature_payout, feature_cps, config_version, created_at, updated_at
)
VALUES (
  '11000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  10, 200000, true, true, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (country_id) DO UPDATE SET
  tax_percent = EXCLUDED.tax_percent,
  min_payout_minor = EXCLUDED.min_payout_minor,
  feature_kyc = EXCLUDED.feature_kyc,
  feature_payout = EXCLUDED.feature_payout,
  feature_cps = EXCLUDED.feature_cps,
  config_version = EXCLUDED.config_version,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO country (id, code, name, currency_code, currency_exponent, locale, fallback_locale, enabled, created_at)
VALUES ('20000000-0000-4000-8000-000000000001', 'PH', 'Philippines', 'PHP', 2, 'fil-PH', 'en', true, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  currency_code = EXCLUDED.currency_code,
  currency_exponent = EXCLUDED.currency_exponent,
  locale = EXCLUDED.locale,
  fallback_locale = EXCLUDED.fallback_locale,
  enabled = EXCLUDED.enabled;

INSERT INTO country_config (
  id, country_id, tax_percent, min_payout_minor, feature_kyc, feature_payout, feature_cps, config_version, created_at, updated_at
)
VALUES (
  '21000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  8, 50000, true, true, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (country_id) DO UPDATE SET
  tax_percent = EXCLUDED.tax_percent,
  min_payout_minor = EXCLUDED.min_payout_minor,
  feature_kyc = EXCLUDED.feature_kyc,
  feature_payout = EXCLUDED.feature_payout,
  feature_cps = EXCLUDED.feature_cps,
  config_version = EXCLUDED.config_version,
  updated_at = CURRENT_TIMESTAMP;

