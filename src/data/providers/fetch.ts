export interface ProviderFetchConfig {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
  headers?: HeadersInit;
}

export class ProviderHttpError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(`${provider} ${status}`);
    this.name = "ProviderHttpError";
  }
}

function composeSignal(timeoutMs: number, external?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Provider request timed out", "TimeoutError")), timeoutMs);
  const abortFromExternal = () => controller.abort(external?.reason);
  if (external) {
    if (external.aborted) abortFromExternal();
    else external.addEventListener("abort", abortFromExternal, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", abortFromExternal);
    },
  };
}

export async function fetchProviderJson(
  provider: string,
  url: string,
  config: ProviderFetchConfig = {},
): Promise<unknown> {
  const retries = config.retries ?? 2;
  const timeoutMs = config.timeoutMs ?? 10_000;
  const retryDelayMs = config.retryDelayMs ?? 250;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const { signal, cleanup } = composeSignal(timeoutMs, config.signal);
    try {
      const res = await fetch(url, {
        signal,
        headers: { accept: "application/json", ...config.headers },
      });
      if (!res.ok) throw new ProviderHttpError(provider, res.status, url);
      return (await res.json()) as unknown;
    } catch (err) {
      lastError = err;
      if (attempt < retries && !(config.signal?.aborted)) {
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * retryDelayMs));
      }
    } finally {
      cleanup();
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${provider} fetch failed`);
}
