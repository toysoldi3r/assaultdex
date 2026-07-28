// Provider adapter contract. Every external data source implements this
// server-side (spec: "External data must use server-side provider adapters").
// The contract names the cross-cutting concerns the spec requires each adapter
// to handle: auth, timeouts, pagination, rate limits, retries, caching,
// failure handling, and normalization.

export interface FetchOptions {
  /** Pagination cursor/offset (provider-specific meaning). */
  cursor?: string;
  /** Max items per page. */
  limit?: number;
  /** Abort signal for timeout/cancellation. */
  signal?: AbortSignal;
}

export interface RawPage<Raw> {
  items: Raw[];
  /** Next cursor, or null when exhausted. */
  nextCursor: string | null;
  dataVersion: string;
}

export interface ProviderAdapter<Raw, Domain> {
  readonly provider: string;
  /** Fetch a page of raw items (handles auth, timeout, retries, rate limits). */
  fetchPage(options?: FetchOptions): Promise<RawPage<Raw>>;
  /** Validate a single raw item (throws on invalid input). */
  validate(raw: unknown): Raw;
  /** Normalize a validated raw item into the domain type with provenance. */
  normalize(raw: Raw, dataVersion: string): Domain;
}
