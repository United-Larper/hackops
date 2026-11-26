-- Logins match emails case-insensitively; blanks become NULL so the unique index allows them.
UPDATE "Member" SET "email" = NULLIF(lower(trim("email")), '') WHERE "email" IS NOT NULL;

-- CreateTable
CREATE TABLE "MemberSecret" (
    "memberId" TEXT NOT NULL PRIMARY KEY,
    "passwordHash" TEXT,
    "fillToken" TEXT,
    CONSTRAINT "MemberSecret_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Team" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'team',
    "name" TEXT NOT NULL,
    "pitch" TEXT,
    "preferredTech" TEXT NOT NULL DEFAULT '[]',
    "preferredCats" TEXT NOT NULL DEFAULT '[]',
    "homeCity" TEXT NOT NULL DEFAULT 'Kuala Lumpur'
);
INSERT INTO "new_Team" ("homeCity", "id", "name", "pitch", "preferredCats", "preferredTech") SELECT "homeCity", "id", "name", "pitch", "preferredCats", "preferredTech" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MemberSecret_fillToken_key" ON "MemberSecret"("fillToken");

-- CreateIndex
CREATE INDEX "Session_memberId_idx" ON "Session"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

