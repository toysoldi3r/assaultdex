import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "../db";

describe("resolveDatabaseUrl", () => {
  it("uses the local SQLite database when development configuration is absent", () => {
    expect(resolveDatabaseUrl({ NODE_ENV: "development" })).toBe("file:./dev.db");
  });

  it("uses an explicitly configured database URL", () => {
    expect(
      resolveDatabaseUrl({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://assaultdex:secret@example.test:5432/assaultdex",
      }),
    ).toBe("postgresql://assaultdex:secret@example.test:5432/assaultdex");
  });

  it("does not provide a local fallback in production", () => {
    expect(resolveDatabaseUrl({ NODE_ENV: "production" })).toBeUndefined();
  });
});
