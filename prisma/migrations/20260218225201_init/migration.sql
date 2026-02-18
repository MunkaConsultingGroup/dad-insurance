-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "smokerStatus" TEXT NOT NULL,
    "healthClass" TEXT NOT NULL,
    "coverageAmount" INTEGER NOT NULL,
    "termLength" INTEGER NOT NULL,
    "ratesShown" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL,
    "consentText" TEXT NOT NULL,
    "consentAt" DATETIME NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "webhookSent" BOOLEAN NOT NULL DEFAULT false,
    "webhookSentAt" DATETIME,
    "buyerId" TEXT
);
