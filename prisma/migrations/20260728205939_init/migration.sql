-- CreateTable
CREATE TABLE "Pokemon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "types" TEXT NOT NULL,
    "baseStats" TEXT NOT NULL,
    "moves" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "retrievedAt" DATETIME NOT NULL,
    "dataVersion" TEXT NOT NULL,
    "normalizationVersion" TEXT NOT NULL,
    "updateStatus" TEXT NOT NULL DEFAULT 'current',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "collectionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Team_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT,
    "snapshot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamVersion_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Pokemon_slug_key" ON "Pokemon"("slug");

-- CreateIndex
CREATE INDEX "Pokemon_name_idx" ON "Pokemon"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Pokemon_provider_externalId_key" ON "Pokemon"("provider", "externalId");

-- CreateIndex
CREATE INDEX "Team_collectionId_idx" ON "Team"("collectionId");

-- CreateIndex
CREATE INDEX "TeamVersion_teamId_idx" ON "TeamVersion"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamVersion_teamId_versionNumber_key" ON "TeamVersion"("teamId", "versionNumber");
