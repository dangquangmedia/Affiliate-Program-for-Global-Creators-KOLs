-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ParticipationState" ADD VALUE 'EXPIRED';
ALTER TYPE "ParticipationState" ADD VALUE 'WAITLISTED';

-- AlterTable
ALTER TABLE "campaign" ADD COLUMN     "ends_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "participation" ADD COLUMN     "fix_deadline_at" TIMESTAMPTZ(3),
ADD COLUMN     "strike_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "submit_deadline_at" TIMESTAMPTZ(3),
ADD COLUMN     "waitlisted_at" TIMESTAMPTZ(3),
ALTER COLUMN "snapshot_reward_minor" DROP NOT NULL,
ALTER COLUMN "snapshot_currency" DROP NOT NULL,
ALTER COLUMN "snapshot_trigger_type" DROP NOT NULL,
ALTER COLUMN "snapshot_pricing_type" DROP NOT NULL;
