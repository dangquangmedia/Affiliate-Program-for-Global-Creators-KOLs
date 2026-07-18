-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('LOCAL_OPS', 'LOCAL_FINANCE', 'LOCAL_ADMIN', 'GLOBAL_ADMIN');

-- CreateEnum
CREATE TYPE "KycCaseState" AS ENUM ('DRAFT', 'SUBMITTED', 'RESUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KycFieldState" AS ENUM ('EMPTY', 'FILLED', 'ACCEPTED', 'NEEDS_CHANGES');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('CONTENT_APPROVED', 'VIEW_THRESHOLD', 'PAID_ORDER');

-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('FLAT', 'TIERED', 'PERCENT');

-- CreateEnum
CREATE TYPE "CapType" AS ENUM ('SLOTS_X_PRICE', 'POOL');

-- CreateEnum
CREATE TYPE "ParticipationState" AS ENUM ('JOINED', 'CONTENT_SUBMITTED', 'APPROVED', 'REJECTED', 'LEFT');

-- CreateEnum
CREATE TYPE "SubmissionState" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID', 'REVERSED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('EARNING_ACCRUE', 'TAX', 'PAYOUT_RESERVE', 'PAYOUT_PAID', 'PAYOUT_RELEASE', 'REVERSAL');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('OPEN', 'LOCKED');

-- CreateEnum
CREATE TYPE "PayoutState" AS ENUM ('PROCESSING', 'PAID', 'FAILED_RELEASED', 'UNKNOWN_HOLD');

-- CreateEnum
CREATE TYPE "PayoutAttemptResult" AS ENUM ('SUCCESS', 'FAIL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('PAYOUT');

-- CreateTable
CREATE TABLE "app_user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "auth_provider" TEXT NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country" (
    "id" UUID NOT NULL,
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "currency_exponent" SMALLINT NOT NULL,
    "locale" TEXT NOT NULL,
    "fallback_locale" TEXT NOT NULL DEFAULT 'en',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_config" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "tax_percent" INTEGER NOT NULL,
    "min_payout_minor" BIGINT NOT NULL,
    "feature_kyc" BOOLEAN NOT NULL DEFAULT true,
    "feature_payout" BOOLEAN NOT NULL DEFAULT true,
    "feature_cps" BOOLEAN NOT NULL DEFAULT false,
    "config_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "country_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_assignment" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "country_id" UUID,
    "role" "RoleCode" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_country_profile" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "onboarding_state" TEXT NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_country_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_case" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "state" "KycCaseState" NOT NULL DEFAULT 'DRAFT',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "kyc_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_field" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "state" "KycFieldState" NOT NULL DEFAULT 'EMPTY',
    "reason" TEXT,

    CONSTRAINT "kyc_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reward_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "slots_total" INTEGER NOT NULL,
    "slots_taken" INTEGER NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "platform" TEXT NOT NULL,
    "required_hashtag" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_rule" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "trigger_type" "TriggerType" NOT NULL,
    "view_threshold" INTEGER,
    "pricing_type" "PricingType" NOT NULL,
    "flat_amount_minor" BIGINT,
    "percent_bps" INTEGER,
    "cap_type" "CapType" NOT NULL,
    "cap_slots" INTEGER,
    "cap_pool_minor" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participation" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "state" "ParticipationState" NOT NULL DEFAULT 'JOINED',
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot_reward_minor" BIGINT NOT NULL,
    "snapshot_currency" CHAR(3) NOT NULL,
    "snapshot_trigger_type" "TriggerType" NOT NULL,
    "snapshot_pricing_type" "PricingType" NOT NULL,
    "row_version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_submission" (
    "id" UUID NOT NULL,
    "participation_id" UUID NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "supersedes_id" UUID,
    "url" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "hashtag_ok" BOOLEAN NOT NULL,
    "platform_ok" BOOLEAN NOT NULL,
    "state" "SubmissionState" NOT NULL DEFAULT 'SUBMITTED',
    "reject_reason" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "row_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earning" (
    "id" UUID NOT NULL,
    "participation_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "gross_minor" BIGINT NOT NULL,
    "tax_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "EarningStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "earning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entry" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "entry_type" "LedgerEntryType" NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "ref_type" TEXT NOT NULL,
    "ref_id" UUID NOT NULL,
    "reversal_of_id" UUID,
    "earning_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_batch" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'OPEN',
    "locked_by" UUID,
    "locked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_line" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "earning_id" UUID NOT NULL,
    "net_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "anomaly" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_request" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "state" "PayoutState" NOT NULL DEFAULT 'PROCESSING',
    "otp_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_attempt" (
    "id" UUID NOT NULL,
    "payout_request_id" UUID NOT NULL,
    "provider_ref" TEXT NOT NULL,
    "result" "PayoutAttemptResult" NOT NULL,
    "raw" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_code" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_event" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "country_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_auth_provider_provider_subject_key" ON "app_user"("auth_provider", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "country_code_key" ON "country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "country_config_country_id_key" ON "country_config"("country_id");

-- CreateIndex
CREATE INDEX "role_assignment_country_id_role_idx" ON "role_assignment"("country_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "role_assignment_user_id_country_id_role_key" ON "role_assignment"("user_id", "country_id", "role");

-- CreateIndex
CREATE INDEX "creator_country_profile_country_id_idx" ON "creator_country_profile"("country_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_country_profile_user_id_country_id_key" ON "creator_country_profile"("user_id", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_case_profile_id_key" ON "kyc_case"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_field_case_id_key_key" ON "kyc_field"("case_id", "key");

-- CreateIndex
CREATE INDEX "campaign_country_id_status_idx" ON "campaign"("country_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reward_rule_campaign_id_key" ON "reward_rule"("campaign_id");

-- CreateIndex
CREATE INDEX "participation_country_id_state_idx" ON "participation"("country_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "participation_profile_id_campaign_id_key" ON "participation"("profile_id", "campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_submission_participation_id_attempt_no_key" ON "content_submission"("participation_id", "attempt_no");

-- CreateIndex
CREATE UNIQUE INDEX "earning_submission_id_key" ON "earning"("submission_id");

-- CreateIndex
CREATE INDEX "earning_country_id_profile_id_status_idx" ON "earning"("country_id", "profile_id", "status");

-- CreateIndex
CREATE INDEX "ledger_entry_country_id_profile_id_idx" ON "ledger_entry"("country_id", "profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entry_ref_type_ref_id_entry_type_key" ON "ledger_entry"("ref_type", "ref_id", "entry_type");

-- CreateIndex
CREATE INDEX "reconciliation_batch_country_id_status_idx" ON "reconciliation_batch"("country_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_line_earning_id_key" ON "reconciliation_line"("earning_id");

-- CreateIndex
CREATE UNIQUE INDEX "payout_request_idempotency_key_key" ON "payout_request"("idempotency_key");

-- CreateIndex
CREATE INDEX "payout_request_country_id_profile_id_state_idx" ON "payout_request"("country_id", "profile_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "payout_attempt_provider_ref_key" ON "payout_attempt"("provider_ref");

-- CreateIndex
CREATE INDEX "otp_code_user_id_purpose_idx" ON "otp_code"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "audit_event_country_id_created_at_idx" ON "audit_event"("country_id", "created_at");

-- AddForeignKey
ALTER TABLE "country_config" ADD CONSTRAINT "country_config_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_country_profile" ADD CONSTRAINT "creator_country_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_country_profile" ADD CONSTRAINT "creator_country_profile_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_case" ADD CONSTRAINT "kyc_case_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "creator_country_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_field" ADD CONSTRAINT "kyc_field_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "kyc_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_rule" ADD CONSTRAINT "reward_rule_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation" ADD CONSTRAINT "participation_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "creator_country_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation" ADD CONSTRAINT "participation_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation" ADD CONSTRAINT "participation_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_submission" ADD CONSTRAINT "content_submission_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "participation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_submission" ADD CONSTRAINT "content_submission_supersedes_id_fkey" FOREIGN KEY ("supersedes_id") REFERENCES "content_submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earning" ADD CONSTRAINT "earning_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "participation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earning" ADD CONSTRAINT "earning_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "content_submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earning" ADD CONSTRAINT "earning_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earning" ADD CONSTRAINT "earning_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "creator_country_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "creator_country_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "ledger_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_earning_id_fkey" FOREIGN KEY ("earning_id") REFERENCES "earning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_batch" ADD CONSTRAINT "reconciliation_batch_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_line" ADD CONSTRAINT "reconciliation_line_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "reconciliation_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_line" ADD CONSTRAINT "reconciliation_line_earning_id_fkey" FOREIGN KEY ("earning_id") REFERENCES "earning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_request" ADD CONSTRAINT "payout_request_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_request" ADD CONSTRAINT "payout_request_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "creator_country_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_request" ADD CONSTRAINT "payout_request_otp_id_fkey" FOREIGN KEY ("otp_id") REFERENCES "otp_code"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_attempt" ADD CONSTRAINT "payout_attempt_payout_request_id_fkey" FOREIGN KEY ("payout_request_id") REFERENCES "payout_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_code" ADD CONSTRAINT "otp_code_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
