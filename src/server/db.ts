// Prisma client singleton. Only this layer talks to the database.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

interface DatabaseEnvironment {
  DATABASE_URL?: string;
  NODE_ENV?: string;
}

export function resolveDatabaseUrl(
  env: DatabaseEnvironment = process.env,
): string | undefined {
  // Local development remains runnable when the optional .env file was not copied.
  // Production must always supply its own persistent database URL.
  return env.DATABASE_URL ?? (env.NODE_ENV === "production" ? undefined : "file:./dev.db");
}

const datasourceUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
