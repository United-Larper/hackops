-- AlterTable
ALTER TABLE "MemberSecret" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "MemberSecret" ADD COLUMN "totpLastStep" INTEGER;
