-- AlterTable: add box flag to Team (unbounded holding list vs 6-member team).
ALTER TABLE "Team" ADD COLUMN "isBox" BOOLEAN NOT NULL DEFAULT false;
