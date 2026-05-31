// Type definitions for the well-known-cache worker environment bindings.
// Auto-generated for local development — update when wrangler.toml changes.

interface Env {
  /** Cache TTL for stellar.toml (seconds) */
  STELLAR_TOML_MAX_AGE: string;
  /** Stale-while-revalidate TTL for stellar.toml (seconds) */
  STELLAR_TOML_STALE_WHILE_REVALIDATE: string;
  /** Cache TTL for other .well-known paths (seconds) */
  DEFAULT_MAX_AGE: string;
  /** Stale-while-revalidate TTL for other .well-known paths (seconds) */
  DEFAULT_STALE_WHILE_REVALIDATE: string;
}
