-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pokemon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "types" TEXT NOT NULL,
    "baseStats" TEXT NOT NULL,
    "abilities" TEXT NOT NULL DEFAULT '[]',
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
INSERT INTO "new_Pokemon" ("baseStats", "createdAt", "dataVersion", "externalId", "id", "moves", "name", "normalizationVersion", "provider", "retrievedAt", "slug", "types", "updateStatus", "updatedAt") SELECT "baseStats", "createdAt", "dataVersion", "externalId", "id", "moves", "name", "normalizationVersion", "provider", "retrievedAt", "slug", "types", "updateStatus", "updatedAt" FROM "Pokemon";
DROP TABLE "Pokemon";
ALTER TABLE "new_Pokemon" RENAME TO "Pokemon";
CREATE UNIQUE INDEX "Pokemon_slug_key" ON "Pokemon"("slug");
CREATE INDEX "Pokemon_name_idx" ON "Pokemon"("name");
CREATE UNIQUE INDEX "Pokemon_provider_externalId_key" ON "Pokemon"("provider", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
