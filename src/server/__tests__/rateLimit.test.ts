import { describe, expect, it } from "vitest";
import { RateLimiter } from "../rateLimit";

describe("RateLimiter", () => {
  it("allows up to the limit within a window, then blocks", () => {
    const now = 1000;
    const rl = new RateLimiter(3, 1000, () => now);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(true);
    const blocked = rl.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window elapses", () => {
    let now = 0;
    const rl = new RateLimiter(1, 1000, () => now);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
    now = 1001;
    expect(rl.check("a").allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const now = 0;
    const rl = new RateLimiter(1, 1000, () => now);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("b").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
  });

  it("sweeps expired windows", () => {
    let now = 0;
    const rl = new RateLimiter(1, 1000, () => now);
    rl.check("a");
    now = 2000;
    rl.sweep();
    // After sweep the key is fresh again.
    expect(rl.check("a").allowed).toBe(true);
  });
});
