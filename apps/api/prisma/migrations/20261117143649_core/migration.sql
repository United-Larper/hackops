-- CreateTable
CREATE TABLE "Hackathon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "organizer" TEXT,
    "mode" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "registrationClosesAt" DATETIME,
    "submissionDueAt" DATETIME,
    "judgingAt" DATETIME,
    "prizeAmount" INTEGER,
    "prizeCurrency" TEXT,
    "teamSizeMax" INTEGER,
    "eligibility" TEXT,
    "prizeTracks" TEXT NOT NULL DEFAULT '[]',
    "stage" TEXT NOT NULL DEFAULT 'discovered',
    "decisionNote" TEXT,
    "result" TEXT,
    "resultNote" TEXT,
    "retroWentWell" TEXT,
    "retroToChange" TEXT,
    "ownerId" TEXT,
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Hackathon_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Hackathon_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "githubUrl" TEXT,
    "linkedinUrl" TEXT,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "preferredRoles" TEXT NOT NULL DEFAULT '[]',
    "organisation" TEXT,
    "tshirtSize" TEXT,
    "dietary" TEXT
);

-- CreateTable
CREATE TABLE "Assignment" (
    "hackathonId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "accountable" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("hackathonId", "memberId"),
    CONSTRAINT "Assignment_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hackathonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "assigneeId" TEXT,
    "dueAt" DATETIME,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Task_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tech" TEXT NOT NULL DEFAULT '[]',
    "repoUrl" TEXT,
    "demoUrl" TEXT,
    "videoUrl" TEXT,
    "slidesUrl" TEXT,
    "devpostUrl" TEXT
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hackathonId" TEXT NOT NULL,
    "memberId" TEXT,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Activity_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'team',
    "name" TEXT NOT NULL,
    "pitch" TEXT,
    "preferredTech" TEXT NOT NULL DEFAULT '[]',
    "preferredCats" TEXT NOT NULL DEFAULT '[]',
    "homeCity" TEXT NOT NULL DEFAULT 'Kuala Lumpur'
);

-- CreateTable
CREATE TABLE "_CategoryToHackathon" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CategoryToHackathon_A_fkey" FOREIGN KEY ("A") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CategoryToHackathon_B_fkey" FOREIGN KEY ("B") REFERENCES "Hackathon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Hackathon_stage_idx" ON "Hackathon"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "Hackathon_source_sourceId_key" ON "Hackathon"("source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Task_hackathonId_idx" ON "Task"("hackathonId");

-- CreateIndex
CREATE INDEX "Activity_hackathonId_createdAt_idx" ON "Activity"("hackathonId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryToHackathon_AB_unique" ON "_CategoryToHackathon"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryToHackathon_B_index" ON "_CategoryToHackathon"("B");
