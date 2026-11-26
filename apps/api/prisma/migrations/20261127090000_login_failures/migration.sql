-- CreateTable
CREATE TABLE "LoginFailure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "LoginFailure_email_at_idx" ON "LoginFailure"("email", "at");

-- CreateIndex
CREATE INDEX "LoginFailure_address_at_idx" ON "LoginFailure"("address", "at");

