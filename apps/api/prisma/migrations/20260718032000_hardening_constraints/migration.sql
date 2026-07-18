-- G4 hardening: exact-money checks, immutable evidence, and same-country RLS.
-- Global bypass policy is intentionally deferred to a reviewed security-definer path before staging.

ALTER TABLE country
  ADD CONSTRAINT country_code_format CHECK (code ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT country_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT country_currency_exponent_range CHECK (currency_exponent BETWEEN 0 AND 4);

ALTER TABLE campaign
  ADD CONSTRAINT campaign_valid_schedule CHECK (starts_at < ends_at),
  ADD CONSTRAINT campaign_positive_slot_cap CHECK (slot_cap IS NULL OR slot_cap > 0),
  ADD CONSTRAINT campaign_nonnegative_budget CHECK (budget_minor IS NULL OR budget_minor >= 0);

ALTER TABLE reward_rule
  ADD CONSTRAINT reward_value_present CHECK (amount_minor IS NOT NULL OR rate IS NOT NULL),
  ADD CONSTRAINT reward_nonnegative_amount CHECK (amount_minor IS NULL OR amount_minor >= 0),
  ADD CONSTRAINT reward_nonnegative_rate CHECK (rate IS NULL OR rate >= 0);

ALTER TABLE earning
  ADD CONSTRAINT earning_nonnegative_money CHECK (gross_minor >= 0 AND tax_minor >= 0),
  ADD CONSTRAINT earning_net_formula CHECK (net_minor = gross_minor - tax_minor),
  ADD CONSTRAINT earning_currency_format CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE ledger_entry
  ADD CONSTRAINT ledger_positive_amount CHECK (amount_minor > 0),
  ADD CONSTRAINT ledger_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT ledger_reversal_not_self CHECK (reverses_entry_id IS NULL OR reverses_entry_id <> id);

ALTER TABLE reconciliation_batch
  ADD CONSTRAINT reconciliation_valid_period CHECK (period_start < period_end),
  ADD CONSTRAINT reconciliation_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT reconciliation_lock_state CHECK (
    (state IN ('LOCKED', 'EXPORTED') AND locked_at IS NOT NULL)
    OR (state NOT IN ('LOCKED', 'EXPORTED') AND locked_at IS NULL)
  );

ALTER TABLE reconciliation_line
  ADD CONSTRAINT reconciliation_line_nonnegative CHECK (amount_minor >= 0),
  ADD CONSTRAINT reconciliation_line_currency_format CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE payout_request
  ADD CONSTRAINT payout_positive_amount CHECK (amount_minor > 0),
  ADD CONSTRAINT payout_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT payout_release_paid_exclusive CHECK (released_at IS NULL OR paid_at IS NULL);

ALTER TABLE role_assignment
  ADD CONSTRAINT role_country_shape CHECK (
    (role = 'GLOBAL_ADMIN' AND country_id IS NULL)
    OR (role <> 'GLOBAL_ADMIN' AND country_id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION deny_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; create a linked correction instead', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER ledger_entry_append_only
  BEFORE UPDATE OR DELETE ON ledger_entry
  FOR EACH ROW EXECUTE FUNCTION deny_append_only_mutation();

CREATE TRIGGER audit_event_append_only
  BEFORE UPDATE OR DELETE ON audit_event
  FOR EACH ROW EXECUTE FUNCTION deny_append_only_mutation();

CREATE TRIGGER review_decision_append_only
  BEFORE UPDATE OR DELETE ON review_decision
  FOR EACH ROW EXECUTE FUNCTION deny_append_only_mutation();

CREATE OR REPLACE FUNCTION current_app_country_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.country_id', true), '')::uuid
$$;

-- Missing app.country_id yields no rows and rejects writes. Runtime uses SET LOCAL per transaction.
ALTER TABLE creator_country_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_country_profile FORCE ROW LEVEL SECURITY;
CREATE POLICY creator_country_profile_country ON creator_country_profile
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

ALTER TABLE kyc_case ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_case FORCE ROW LEVEL SECURITY;
CREATE POLICY kyc_case_country ON kyc_case
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

ALTER TABLE review_decision ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_decision FORCE ROW LEVEL SECURITY;
CREATE POLICY review_decision_country ON review_decision
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

ALTER TABLE campaign ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign FORCE ROW LEVEL SECURITY;
CREATE POLICY campaign_country ON campaign
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

ALTER TABLE participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE participation FORCE ROW LEVEL SECURITY;
CREATE POLICY participation_country ON participation
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

ALTER TABLE content_submission ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_submission FORCE ROW LEVEL SECURITY;
CREATE POLICY content_submission_country ON content_submission
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

ALTER TABLE earning ENABLE ROW LEVEL SECURITY;
ALTER TABLE earning FORCE ROW LEVEL SECURITY;
CREATE POLICY earning_country ON earning
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

ALTER TABLE ledger_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entry FORCE ROW LEVEL SECURITY;
CREATE POLICY ledger_entry_country ON ledger_entry
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

ALTER TABLE reconciliation_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_batch FORCE ROW LEVEL SECURITY;
CREATE POLICY reconciliation_batch_country ON reconciliation_batch
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

ALTER TABLE reconciliation_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_line FORCE ROW LEVEL SECURITY;
CREATE POLICY reconciliation_line_country ON reconciliation_line
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

ALTER TABLE payout_intent ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_intent FORCE ROW LEVEL SECURITY;
CREATE POLICY payout_intent_country ON payout_intent
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

ALTER TABLE payout_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_request FORCE ROW LEVEL SECURITY;
CREATE POLICY payout_request_country ON payout_request
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

ALTER TABLE audit_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_event FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_event_country ON audit_event
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

ALTER TABLE external_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_event FORCE ROW LEVEL SECURITY;
CREATE POLICY external_event_country ON external_event
  USING (country_id = current_app_country_id())
  WITH CHECK (country_id = current_app_country_id());

