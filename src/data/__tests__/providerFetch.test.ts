import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProviderJson, ProviderHttpError } from "../providers/fetch";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = originalFetch;
});

describe("fetchProviderJson", () => {
  it("combines caller cancellation with provider timeout", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason ?? new Error("aborted")));
      }),
    ) as typeof fetch;

    const assertion = expect(fetchProviderJson("test", "https://example.test/data", { timeoutMs: 50, retries: 0 })).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });

  it("reports provider HTTP failures with status context", async () => {
    globalThis.fetch = vi.fn(async () => new Response("nope", { status: 503 })) as typeof fetch;
    await expect(fetchProviderJson("test", "https://example.test/data", { retries: 0 })).rejects.toBeInstanceOf(ProviderHttpError);
  });
});
