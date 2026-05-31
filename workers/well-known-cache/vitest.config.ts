import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: {
          configPath: "../../wrangler.toml",
        },
        miniflare: {
          // Use in-memory cache for local testing (no real Cloudflare cache)
          cachePersist: false,
          // Bindings for local testing
          vars: {
            STELLAR_TOML_MAX_AGE: "3600",
            STELLAR_TOML_STALE_WHILE_REVALIDATE: "86400",
            DEFAULT_MAX_AGE: "300",
            DEFAULT_STALE_WHILE_REVALIDATE: "3600",
          },
        },
      },
    },
  },
});
