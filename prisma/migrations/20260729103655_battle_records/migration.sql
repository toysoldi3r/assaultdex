-- CreateTable
CREATE TABLE "BattleRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL DEFAULT '',
    "result" TEXT NOT NULL,
    "turns" INTEGER NOT NULL,
    "replay" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'imported',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "BattleRecord_createdAt_idx" ON "BattleRecord"("createdAt");
