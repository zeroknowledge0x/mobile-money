import logger from "../../utils/logger";
import {
  getProvidersStatus,
  ProviderName,
  StatusColor,
} from "../providerStatusService";

/**
 * Provider Failover Service
 *
 * Implements automated failover routing for mobile money providers.
 * Uses a mapping array configuration to define primary → fallback chains,
 * integrated with real-time provider health data from providerStatusService.
 *
 * Addresses: sublime247/mobile-money#1038
 */

export type ExtendedProviderName = ProviderName | "vodacom" | "tigo";

export interface FailoverRoute {
  /** Primary provider to attempt first */
  primary: ExtendedProviderName;
  /** Ordered list of fallback providers (tried in sequence) */
  fallbacks: ExtendedProviderName[];
  /** Maximum number of failover attempts before giving up */
  maxAttempts: number;
}

export interface ProviderHealthScore {
  provider: ExtendedProviderName;
  status: StatusColor;
  successRate: number;
  avgDurationMs: number | null;
  /** Composite score 0–100 (higher = healthier) */
  score: number;
}

/**
 * Default failover mapping configuration.
 * Each entry defines the primary provider and its ordered fallback chain.
 *
 * Operators can override via env: PROVIDER_FAILOVER_MAP='{"vodacom":["mtn","airtel"],"mtn":["airtel","orange"]}'
 */
const DEFAULT_FAILOVER_MAP: Record<ExtendedProviderName, ExtendedProviderName[]> = {
  vodacom: ["mtn", "airtel", "orange"],
  mtn: ["airtel", "orange", "vodacom"],
  airtel: ["mtn", "orange", "vodacom"],
  orange: ["mtn", "airtel", "vodacom"],
  tigo: ["vodacom", "mtn", "airtel"],
};

/**
 * Health thresholds for provider selection.
 * Providers below these thresholds are deprioritized in the failover chain.
 */
const HEALTH_THRESHOLDS = {
  /** Providers with status "red" are considered unhealthy */
  minSuccessRate: 0.7,
  /** Maximum acceptable average response time (ms) */
  maxAvgDurationMs: 10_000,
} as const;

function loadFailoverMap(): Record<ExtendedProviderName, ExtendedProviderName[]> {
  const envMap = process.env.PROVIDER_FAILOVER_MAP;
  if (envMap) {
    try {
      const parsed = JSON.parse(envMap) as Record<string, ExtendedProviderName[]>;
      // Merge with defaults — env overrides only specified keys
      return { ...DEFAULT_FAILOVER_MAP, ...parsed };
    } catch (err) {
      logger.warn({ err }, "Failed to parse PROVIDER_FAILOVER_MAP, using defaults");
    }
  }
  return DEFAULT_FAILOVER_MAP;
}

/**
 * Build a health-scored provider list from real-time provider status data.
 * Providers are scored 0–100 based on success rate and response time.
 */
async function getProviderHealthScores(): Promise<
  Map<ExtendedProviderName, ProviderHealthScore>
> {
  const scores = new Map<ExtendedProviderName, ProviderHealthScore>();

  try {
    const statusResult = await getProvidersStatus();

    for (const ps of statusResult.providers) {
      // Composite score: 70% success rate + 30% speed (inverted — lower duration = higher score)
      const speedScore =
        ps.avgDurationMs !== null
          ? Math.max(0, 1 - ps.avgDurationMs / HEALTH_THRESHOLDS.maxAvgDurationMs) * 100
          : 50; // neutral if no data

      const score = ps.successRate * 70 + speedScore * 0.3;

      scores.set(ps.provider, {
        provider: ps.provider,
        status: ps.status,
        successRate: ps.successRate,
        avgDurationMs: ps.avgDurationMs,
        score,
      });
    }
  } catch (err) {
    logger.warn({ err }, "Failed to fetch provider health data, using neutral scores");
  }

  // Ensure all known providers have an entry (neutral score if no data)
  const allProviders: ExtendedProviderName[] = [
    "vodacom",
    "mtn",
    "airtel",
    "orange",
    "tigo",
  ];
  for (const p of allProviders) {
    if (!scores.has(p)) {
      scores.set(p, {
        provider: p,
        status: "yellow",
        successRate: 0.5,
        avgDurationMs: null,
        score: 35,
      });
    }
  }

  return scores;
}

/**
 * Sort the failover chain by provider health — healthiest providers first.
 * Unhealthy providers (red status, success rate < threshold) are pushed to the end.
 */
function sortByHealth(
  providers: ExtendedProviderName[],
  healthScores: Map<ExtendedProviderName, ProviderHealthScore>,
): ExtendedProviderName[] {
  return [...providers].sort((a, b) => {
    const scoreA = healthScores.get(a);
    const scoreB = healthScores.get(b);

    // Unhealthy providers go to the end
    const aHealthy =
      scoreA && scoreA.successRate >= HEALTH_THRESHOLDS.minSuccessRate;
    const bHealthy =
      scoreB && scoreB.successRate >= HEALTH_THRESHOLDS.minSuccessRate;

    if (aHealthy && !bHealthy) return -1;
    if (!aHealthy && bHealthy) return 1;

    // Among equally healthy providers, sort by score descending
    return (scoreB?.score ?? 0) - (scoreA?.score ?? 0);
  });
}

/**
 * Get the failover chain for a given provider, sorted by health.
 *
 * @param provider - The primary provider that failed
 * @returns Ordered array of providers to try (excludes the failed primary)
 */
export async function getFailoverChain(
  provider: ExtendedProviderName,
): Promise<ExtendedProviderName[]> {
  const failoverMap = loadFailoverMap();
  const fallbacks = failoverMap[provider] ?? [];

  if (fallbacks.length === 0) {
    logger.warn({ provider }, "No failover routes configured for provider");
    return [];
  }

  const healthScores = await getProviderHealthScores();
  const sorted = sortByHealth(fallbacks, healthScores);

  logger.info(
    {
      provider,
      failoverChain: sorted,
      healthScores: sorted.map((p) => ({
        provider: p,
        score: healthScores.get(p)?.score.toFixed(1),
        status: healthScores.get(p)?.status,
      })),
    },
    "Computed failover chain for provider",
  );

  return sorted;
}

/**
 * Get the best available provider for a given region/operation.
 * Considers all configured providers and returns the healthiest one.
 *
 * @param exclude - Provider(s) to exclude (e.g., the one that just failed)
 * @returns The best available provider name
 */
export async function getBestAvailableProvider(
  exclude: ExtendedProviderName[] = [],
): Promise<ExtendedProviderName> {
  const healthScores = await getProviderHealthScores();
  const allProviders: ExtendedProviderName[] = [
    "vodacom",
    "mtn",
    "airtel",
    "orange",
    "tigo",
  ];

  const candidates = allProviders.filter((p) => !exclude.includes(p));
  const sorted = sortByHealth(candidates, healthScores);

  const best = sorted[0];
  logger.info(
    {
      best,
      exclude,
      candidates: sorted.map((p) => ({
        provider: p,
        score: healthScores.get(p)?.score.toFixed(1),
      })),
    },
    "Selected best available provider",
  );

  return best;
}

/**
 * Check if a provider should be failed over based on its current health.
 *
 * @param provider - Provider to check
 * @returns true if the provider is unhealthy and should be failed over
 */
export async function shouldFailover(
  provider: ExtendedProviderName,
): Promise<boolean> {
  const healthScores = await getProviderHealthScores();
  const health = healthScores.get(provider);

  if (!health) return false;

  const unhealthy =
    health.status === "red" ||
    health.successRate < HEALTH_THRESHOLDS.minSuccessRate;

  if (unhealthy) {
    logger.warn(
      {
        provider,
        status: health.status,
        successRate: health.successRate,
      },
      "Provider marked unhealthy, failover recommended",
    );
  }

  return unhealthy;
}

/**
 * Get a human-readable summary of all provider health and failover routes.
 * Useful for admin dashboards and debugging.
 */
export async function getFailoverSummary(): Promise<{
  providers: ProviderHealthScore[];
  routes: Record<string, string[]>;
}> {
  const healthScores = await getProviderHealthScores();
  const failoverMap = loadFailoverMap();

  return {
    providers: Array.from(healthScores.values()),
    routes: failoverMap as Record<string, string[]>,
  };
}
