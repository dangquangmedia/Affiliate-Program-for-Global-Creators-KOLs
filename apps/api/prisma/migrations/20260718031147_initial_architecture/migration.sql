-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('CREATOR', 'LOCAL_OPS', 'LOCAL_FINANCE', 'LOCAL_ADMIN', 'GLOBAL_ADMIN');

-- CreateEnum
CREATE TYPE "KycCaseState" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_CHANGES', 'RESUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KycFieldState" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'NEEDS_CHANGES', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewTargetType" AS ENUM ('KYC_CASE', 'KYC_FIELD', 'CONTENT_SUBMISSION', 'SUBMISSION_VERSION');

-- CreateEnum
CREATE TYPE "ReviewDecisionType" AS ENUM ('CLAIMED', 'ACCEPTED', 'NEEDS_CHANGES', 'REJECTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RewardTrigger" AS ENUM ('CONTENT_APPROVED', 'PAID_ORDER', 'QUALIFIED_LEAD', 'APP_INSTALL', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "RewardCalculation" AS ENUM ('CONTENT_FLAT', 'SALE_PERCENT', 'LEAD_FLAT', 'INSTALL_FLAT', 'RECURRING_FLAT', 'RECURRING_PERCENT');

-- CreateEnum
CREATE TYPE "CampaignState" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ParticipationState" AS ENUM ('JOINED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContentState" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_CHANGES', 'REJECTED', 'RESUBMITTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "EarningState" AS ENUM ('PENDING', 'CONFIRMED', 'AVAILABLE', 'PAID', 'REVERSED');

-- CreateEnum
CREATE TYPE "SnapshotKind" AS ENUM ('TERMS', 'REWARD', 'COMMISSION', 'TAX', 'FX', 'ROUNDING');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "BatchState" AS ENUM ('DRAFT', 'REVIEWING', 'APPROVED', 'LOCKED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "ReconciliationDecision" AS ENUM ('PENDING', 'APPROVED', 'ANOMALY', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "OtpState" AS ENUM ('OTP_PENDING', 'VERIFIED', 'EXPIRED', 'ATTEMPTS_EXCEEDED');

-- CreateEnum
CREATE TYPE "PayoutState" AS ENUM ('RESERVED', 'QUEUED', 'PROCESSING', 'PAID', 'FAILED_FINAL', 'UNKNOWN', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayoutAttemptState" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED_FINAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('ATTEMPTED', 'SUCCEEDED', 'DENIED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExternalEventStatus" AS ENUM ('RECEIVED', 'APPLIED', 'DUPLICATE', 'CONFLICT', 'FAILED');

-- CreateTable
CREATE TABLE "app_user" (
    "id" UUID NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_provider" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "provider_subject_hash" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "mfa_level" VARCHAR(20) NOT NULL DEFAULT 'BASE',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country" (
    "id" UUID NOT NULL,
    "code" CHAR(2) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "currency_exponent" SMALLINT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_config" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "locale" VARCHAR(16) NOT NULL,
    "fallback_locale" VARCHAR(16) NOT NULL DEFAULT 'en',
    "config_json" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "active_from" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_country_profile" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "preferred_locale" VARCHAR(16) NOT NULL,
    "status" "ProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "bank_reference_encrypted" TEXT,
    "tax_reference_encrypted" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "creator_country_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_assignment" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "country_id" UUID,
    "role" "RoleCode" NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_case" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "state" "KycCaseState" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "kyc_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_field_version" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "field_key" VARCHAR(80) NOT NULL,
    "version" INTEGER NOT NULL,
    "value_ref" TEXT,
    "value_hash" VARCHAR(128),
    "state" "KycFieldState" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_field_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_decision" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "target_type" "ReviewTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "target_version" INTEGER,
    "decision" "ReviewDecisionType" NOT NULL,
    "reason_code" VARCHAR(80),
    "reason_text" TEXT,
    "kyc_case_id" UUID,
    "kyc_field_version_id" UUID,
    "submission_id" UUID,
    "submission_version_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "status" "CatalogStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "terms_version" INTEGER NOT NULL,
    "terms_json" JSONB NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "CatalogStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_rule" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "trigger" "RewardTrigger" NOT NULL,
    "calculation" "RewardCalculation" NOT NULL,
    "amount_minor" BIGINT,
    "rate" DECIMAL(20,10),
    "version" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "state" "CampaignState" NOT NULL DEFAULT 'DRAFT',
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "slot_cap" INTEGER,
    "budget_minor" BIGINT,
    "currency" CHAR(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_localization" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "locale" VARCHAR(16) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "brief" TEXT NOT NULL,
    "terms_copy" TEXT NOT NULL,

    CONSTRAINT "campaign_localization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participation" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "state" "ParticipationState" NOT NULL DEFAULT 'JOINED',
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participation_snapshot" (
    "id" UUID NOT NULL,
    "participation_id" UUID NOT NULL,
    "offer_version" INTEGER NOT NULL,
    "terms_snapshot" JSONB NOT NULL,
    "reward_snapshot" JSONB NOT NULL,
    "commission_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participation_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_asset" (
    "id" UUID NOT NULL,
    "participation_id" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "public_value" TEXT NOT NULL,
    "value_hash" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_submission" (
    "id" UUID NOT NULL,
    "participation_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "state" "ContentState" NOT NULL DEFAULT 'DRAFT',
    "active_version" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_version" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content_ref" TEXT NOT NULL,
    "content_hash" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earning" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "source_type" VARCHAR(60) NOT NULL,
    "source_id" UUID NOT NULL,
    "submission_version_id" UUID,
    "state" "EarningState" NOT NULL DEFAULT 'PENDING',
    "gross_minor" BIGINT NOT NULL,
    "tax_minor" BIGINT NOT NULL,
    "net_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "earning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earning_snapshot" (
    "id" UUID NOT NULL,
    "earning_id" UUID NOT NULL,
    "kind" "SnapshotKind" NOT NULL,
    "rule_version" VARCHAR(80) NOT NULL,
    "value_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "earning_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entry" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "transaction_key" VARCHAR(128) NOT NULL,
    "effect_key" VARCHAR(180) NOT NULL,
    "account" VARCHAR(80) NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "earning_id" UUID,
    "payout_request_id" UUID,
    "reverses_entry_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_batch" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "period_start" TIMESTAMPTZ(3) NOT NULL,
    "period_end" TIMESTAMPTZ(3) NOT NULL,
    "state" "BatchState" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 0,
    "locked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_line" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "earning_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "decision" "ReconciliationDecision" NOT NULL DEFAULT 'PENDING',
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reason_code" VARCHAR(80),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_intent" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "state" "OtpState" NOT NULL DEFAULT 'OTP_PENDING',
    "otp_hash" VARCHAR(128) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_intent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_request" (
    "id" UUID NOT NULL,
    "intent_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "state" "PayoutState" NOT NULL DEFAULT 'RESERVED',
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reserved_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(3),
    "paid_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_attempt" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "provider" VARCHAR(60) NOT NULL,
    "provider_request_key" VARCHAR(160) NOT NULL,
    "state" "PayoutAttemptState" NOT NULL DEFAULT 'QUEUED',
    "response_code" VARCHAR(80),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(3),

    CONSTRAINT "payout_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_event" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "country_id" UUID,
    "correlation_id" VARCHAR(128) NOT NULL,
    "action" VARCHAR(120) NOT NULL,
    "aggregate_type" VARCHAR(80),
    "aggregate_id" UUID,
    "outcome" "AuditOutcome" NOT NULL,
    "reason_code" VARCHAR(80),
    "before_redacted" JSONB,
    "after_redacted" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_record" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "scope" VARCHAR(100) NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "request_hash" VARCHAR(128) NOT NULL,
    "response_status" INTEGER,
    "response_body" JSONB,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_event" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "provider" VARCHAR(60) NOT NULL,
    "external_event_id" VARCHAR(180) NOT NULL,
    "payload_hash" VARCHAR(128) NOT NULL,
    "status" "ExternalEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "aggregate_type" VARCHAR(80),
    "aggregate_id" UUID,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMPTZ(3),

    CONSTRAINT "external_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "identity_provider_user_id_idx" ON "identity_provider"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "identity_provider_provider_provider_subject_hash_key" ON "identity_provider"("provider", "provider_subject_hash");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_hash_key" ON "session"("token_hash");

-- CreateIndex
CREATE INDEX "session_user_id_expires_at_idx" ON "session"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "country_code_key" ON "country"("code");

-- CreateIndex
CREATE INDEX "country_config_country_id_active_idx" ON "country_config"("country_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "country_config_country_id_version_key" ON "country_config"("country_id", "version");

-- CreateIndex
CREATE INDEX "creator_country_profile_country_id_status_created_at_idx" ON "creator_country_profile"("country_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "creator_country_profile_user_id_country_id_key" ON "creator_country_profile"("user_id", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_country_profile_id_country_id_key" ON "creator_country_profile"("id", "country_id");

-- CreateIndex
CREATE INDEX "role_assignment_country_id_role_idx" ON "role_assignment"("country_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "role_assignment_user_id_country_id_role_key" ON "role_assignment"("user_id", "country_id", "role");

-- CreateIndex
CREATE INDEX "kyc_case_country_id_state_created_at_id_idx" ON "kyc_case"("country_id", "state", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_case_id_country_id_key" ON "kyc_case"("id", "country_id");

-- CreateIndex
CREATE INDEX "kyc_field_version_case_id_field_key_state_idx" ON "kyc_field_version"("case_id", "field_key", "state");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_field_version_case_id_field_key_version_key" ON "kyc_field_version"("case_id", "field_key", "version");

-- CreateIndex
CREATE INDEX "review_decision_country_id_target_type_target_id_created_at_idx" ON "review_decision"("country_id", "target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "product_partner_id_status_idx" ON "product"("partner_id", "status");

-- CreateIndex
CREATE INDEX "offer_product_id_status_idx" ON "offer"("product_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reward_rule_offer_id_version_key" ON "reward_rule"("offer_id", "version");

-- CreateIndex
CREATE INDEX "campaign_country_id_state_starts_at_ends_at_idx" ON "campaign"("country_id", "state", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_id_country_id_key" ON "campaign"("id", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_localization_campaign_id_locale_key" ON "campaign_localization"("campaign_id", "locale");

-- CreateIndex
CREATE INDEX "participation_country_id_state_joined_at_idx" ON "participation"("country_id", "state", "joined_at");

-- CreateIndex
CREATE UNIQUE INDEX "participation_profile_id_campaign_id_key" ON "participation"("profile_id", "campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "participation_id_country_id_key" ON "participation"("id", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "participation_snapshot_participation_id_key" ON "participation_snapshot"("participation_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_asset_participation_id_type_key" ON "tracking_asset"("participation_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_asset_type_value_hash_key" ON "tracking_asset"("type", "value_hash");

-- CreateIndex
CREATE INDEX "content_submission_country_id_state_created_at_id_idx" ON "content_submission"("country_id", "state", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "content_submission_id_country_id_key" ON "content_submission"("id", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "submission_version_submission_id_version_key" ON "submission_version"("submission_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "earning_source_id_key" ON "earning"("source_id");

-- CreateIndex
CREATE UNIQUE INDEX "earning_submission_version_id_key" ON "earning"("submission_version_id");

-- CreateIndex
CREATE INDEX "earning_country_id_profile_id_state_created_at_idx" ON "earning"("country_id", "profile_id", "state", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "earning_source_type_source_id_key" ON "earning"("source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "earning_id_country_id_key" ON "earning"("id", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "earning_snapshot_earning_id_kind_key" ON "earning_snapshot"("earning_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entry_effect_key_key" ON "ledger_entry"("effect_key");

-- CreateIndex
CREATE INDEX "ledger_entry_country_id_transaction_key_idx" ON "ledger_entry"("country_id", "transaction_key");

-- CreateIndex
CREATE INDEX "ledger_entry_country_id_earning_id_idx" ON "ledger_entry"("country_id", "earning_id");

-- CreateIndex
CREATE INDEX "ledger_entry_country_id_payout_request_id_idx" ON "ledger_entry"("country_id", "payout_request_id");

-- CreateIndex
CREATE INDEX "reconciliation_batch_country_id_state_created_at_idx" ON "reconciliation_batch"("country_id", "state", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_batch_id_country_id_key" ON "reconciliation_batch"("id", "country_id");

-- CreateIndex
CREATE INDEX "reconciliation_line_country_id_decision_idx" ON "reconciliation_line"("country_id", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_line_batch_id_earning_id_key" ON "reconciliation_line"("batch_id", "earning_id");

-- CreateIndex
CREATE INDEX "payout_intent_country_id_profile_id_state_created_at_idx" ON "payout_intent"("country_id", "profile_id", "state", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payout_intent_id_country_id_key" ON "payout_intent"("id", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "payout_request_intent_id_key" ON "payout_request"("intent_id");

-- CreateIndex
CREATE INDEX "payout_request_country_id_profile_id_state_created_at_idx" ON "payout_request"("country_id", "profile_id", "state", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payout_request_id_country_id_key" ON "payout_request"("id", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "payout_request_intent_id_country_id_key" ON "payout_request"("intent_id", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "payout_attempt_request_id_sequence_key" ON "payout_attempt"("request_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "payout_attempt_provider_provider_request_key_key" ON "payout_attempt"("provider", "provider_request_key");

-- CreateIndex
CREATE INDEX "audit_event_country_id_created_at_id_idx" ON "audit_event"("country_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "audit_event_aggregate_type_aggregate_id_created_at_idx" ON "audit_event"("aggregate_type", "aggregate_id", "created_at");

-- CreateIndex
CREATE INDEX "idempotency_record_expires_at_idx" ON "idempotency_record"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_record_actor_user_id_scope_key_key" ON "idempotency_record"("actor_user_id", "scope", "key");

-- CreateIndex
CREATE INDEX "external_event_country_id_status_received_at_idx" ON "external_event"("country_id", "status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "external_event_provider_external_event_id_key" ON "external_event"("provider", "external_event_id");

-- AddForeignKey
ALTER TABLE "identity_provider" ADD CONSTRAINT "identity_provider_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_config" ADD CONSTRAINT "country_config_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_country_profile" ADD CONSTRAINT "creator_country_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_country_profile" ADD CONSTRAINT "creator_country_profile_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_case" ADD CONSTRAINT "kyc_case_profile_id_country_id_fkey" FOREIGN KEY ("profile_id", "country_id") REFERENCES "creator_country_profile"("id", "country_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_case" ADD CONSTRAINT "kyc_case_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_field_version" ADD CONSTRAINT "kyc_field_version_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "kyc_case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_decision" ADD CONSTRAINT "review_decision_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_decision" ADD CONSTRAINT "review_decision_kyc_case_id_fkey" FOREIGN KEY ("kyc_case_id") REFERENCES "kyc_case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_decision" ADD CONSTRAINT "review_decision_kyc_field_version_id_fkey" FOREIGN KEY ("kyc_field_version_id") REFERENCES "kyc_field_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_decision" ADD CONSTRAINT "review_decision_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "content_submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_decision" ADD CONSTRAINT "review_decision_submission_version_id_fkey" FOREIGN KEY ("submission_version_id") REFERENCES "submission_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_rule" ADD CONSTRAINT "reward_rule_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_localization" ADD CONSTRAINT "campaign_localization_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation" ADD CONSTRAINT "participation_profile_id_country_id_fkey" FOREIGN KEY ("profile_id", "country_id") REFERENCES "creator_country_profile"("id", "country_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation" ADD CONSTRAINT "participation_campaign_id_country_id_fkey" FOREIGN KEY ("campaign_id", "country_id") REFERENCES "campaign"("id", "country_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation" ADD CONSTRAINT "participation_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation_snapshot" ADD CONSTRAINT "participation_snapshot_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "participation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_asset" ADD CONSTRAINT "tracking_asset_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "participation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_submission" ADD CONSTRAINT "content_submission_participation_id_country_id_fkey" FOREIGN KEY ("participation_id", "country_id") REFERENCES "participation"("id", "country_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_submission" ADD CONSTRAINT "content_submission_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_version" ADD CONSTRAINT "submission_version_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "content_submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earning" ADD CONSTRAINT "earning_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earning" ADD CONSTRAINT "earning_submission_version_id_fkey" FOREIGN KEY ("submission_version_id") REFERENCES "submission_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earning_snapshot" ADD CONSTRAINT "earning_snapshot_earning_id_fkey" FOREIGN KEY ("earning_id") REFERENCES "earning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_earning_id_fkey" FOREIGN KEY ("earning_id") REFERENCES "earning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_payout_request_id_fkey" FOREIGN KEY ("payout_request_id") REFERENCES "payout_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_reverses_entry_id_fkey" FOREIGN KEY ("reverses_entry_id") REFERENCES "ledger_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_batch" ADD CONSTRAINT "reconciliation_batch_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_line" ADD CONSTRAINT "reconciliation_line_batch_id_country_id_fkey" FOREIGN KEY ("batch_id", "country_id") REFERENCES "reconciliation_batch"("id", "country_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_line" ADD CONSTRAINT "reconciliation_line_earning_id_country_id_fkey" FOREIGN KEY ("earning_id", "country_id") REFERENCES "earning"("id", "country_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_intent" ADD CONSTRAINT "payout_intent_profile_id_country_id_fkey" FOREIGN KEY ("profile_id", "country_id") REFERENCES "creator_country_profile"("id", "country_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_intent" ADD CONSTRAINT "payout_intent_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_request" ADD CONSTRAINT "payout_request_intent_id_country_id_fkey" FOREIGN KEY ("intent_id", "country_id") REFERENCES "payout_intent"("id", "country_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_request" ADD CONSTRAINT "payout_request_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_attempt" ADD CONSTRAINT "payout_attempt_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "payout_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_record" ADD CONSTRAINT "idempotency_record_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_event" ADD CONSTRAINT "external_event_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
