// Health endpoint for monitoring (internal backend route). Reports process and
// database connectivity without leaking any internal detail (spec: sanitized
// errors; no stack traces).

import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let db: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
  } catch {
    db = "down";
  }

  const healthy = db === "up";
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      db,
      time: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
