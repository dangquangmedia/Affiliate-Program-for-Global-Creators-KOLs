-- Seed synthetic tối thiểu cho walking skeleton (N5): chỉ countries + country_configs.
-- Idempotent (ON CONFLICT), không PII thật. Đủ để /vn /ph round-trip DB chạy.
-- Dữ liệu nghiệp vụ (users/campaigns/...) seed sau khi có luồng thật (N6+).

-- VN
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

-- PH
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

-- Tài khoản Ops demo (N8). Đăng nhập vai Ops = mock-login bằng chính email này (upsert khớp
-- theo provider+subject), khi đó session mang sẵn role_assignment LOCAL_OPS của nước tương ứng.
INSERT INTO app_user (id, email, display_name, auth_provider, provider_subject, created_at)
VALUES
  ('30000000-0000-4000-8000-000000000001', 'ops.vn@demo.affiliate.gl', 'Ops VN', 'mock-google', 'ops.vn@demo.affiliate.gl', CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000002', 'ops.ph@demo.affiliate.gl', 'Ops PH', 'mock-google', 'ops.ph@demo.affiliate.gl', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

INSERT INTO role_assignment (id, user_id, country_id, role, created_at)
VALUES
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'LOCAL_OPS', CURRENT_TIMESTAMP),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'LOCAL_OPS', CURRENT_TIMESTAMP)
ON CONFLICT (user_id, country_id, role) DO NOTHING;

-- Tài khoản Local Admin demo (N9) — đăng nhập vai để dùng campaign builder (V11).
INSERT INTO app_user (id, email, display_name, auth_provider, provider_subject, created_at)
VALUES
  ('32000000-0000-4000-8000-000000000001', 'admin.vn@demo.affiliate.gl', 'Admin VN', 'mock-google', 'admin.vn@demo.affiliate.gl', CURRENT_TIMESTAMP),
  ('32000000-0000-4000-8000-000000000002', 'admin.ph@demo.affiliate.gl', 'Admin PH', 'mock-google', 'admin.ph@demo.affiliate.gl', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

INSERT INTO role_assignment (id, user_id, country_id, role, created_at)
VALUES
  ('33000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'LOCAL_ADMIN', CURRENT_TIMESTAMP),
  ('33000000-0000-4000-8000-000000000002', '32000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'LOCAL_ADMIN', CURRENT_TIMESTAMP)
ON CONFLICT (user_id, country_id, role) DO NOTHING;

-- Campaign demo (N9) để creator discover có dữ liệu ngay. Mỗi campaign 1 reward_rule 3 trục
-- Phase 1: CONTENT_APPROVED + FLAT + SLOTS_X_PRICE (trần = suất × đơn giá). currency theo nước.
INSERT INTO campaign (id, country_id, brand, title, reward_minor, currency, slots_total, slots_taken, status, platform, required_hashtag, brief, created_at)
VALUES
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'GlowUp Cosmetics', 'Review son mùa hè', 500000, 'VND', 50, 12, 'ACTIVE', 'TikTok', '#GlowUpHe2026', 'Quay 1 video >= 30s review son, gắn hashtag và link cửa hàng.', CURRENT_TIMESTAMP),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Highland Canned', 'Đánh giá cà phê lon', 350000, 'VND', 30, 30, 'ACTIVE', 'Instagram', '#HighlandLon', '1 bài Reels uống thử, nêu 3 điểm thích.', CURRENT_TIMESTAMP),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'EngGo', 'Giới thiệu app học tiếng Anh', 800000, 'VND', 20, 5, 'PAUSED', 'YouTube', '#EngGoChallenge', 'Video >= 60s trải nghiệm app trong 7 ngày.', CURRENT_TIMESTAMP),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'CrunchCo', 'Snack taste test', 120000, 'PHP', 40, 8, 'ACTIVE', 'TikTok', '#CrunchCoPH', '1 short video taste test, mention 2 flavors.', CURRENT_TIMESTAMP),
  ('40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'WorkFlowPH', 'Freelancer tool walkthrough', 250000, 'PHP', 15, 3, 'ACTIVE', 'YouTube', '#WorkFlowPH', 'Walkthrough video, min 90s, show 3 features.', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reward_rule (id, campaign_id, trigger_type, pricing_type, flat_amount_minor, cap_type, cap_slots, created_at)
VALUES
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'CONTENT_APPROVED', 'FLAT', 500000, 'SLOTS_X_PRICE', 50, CURRENT_TIMESTAMP),
  ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'CONTENT_APPROVED', 'FLAT', 350000, 'SLOTS_X_PRICE', 30, CURRENT_TIMESTAMP),
  ('41000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'CONTENT_APPROVED', 'FLAT', 800000, 'SLOTS_X_PRICE', 20, CURRENT_TIMESTAMP),
  ('41000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 'CONTENT_APPROVED', 'FLAT', 120000, 'SLOTS_X_PRICE', 40, CURRENT_TIMESTAMP),
  ('41000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000005', 'CONTENT_APPROVED', 'FLAT', 250000, 'SLOTS_X_PRICE', 15, CURRENT_TIMESTAMP)
ON CONFLICT (campaign_id) DO NOTHING;
