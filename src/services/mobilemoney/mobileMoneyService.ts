import { executeWithCircuitBreaker } from "../../utils/circuitBreaker";
import {
  providerFailoverAlerts,
  providerFailoverTotal,
  transactionErrorsTotal,
  transactionTotal,
} from "../../utils/metrics";
import logger from "../../utils/logger";
import {
  getFailoverChain,
  shouldFailover,
  ExtendedProviderName,
} from "./providerFailoverService";

export type ProviderTransactionStatus =
  | "completed"
  | "failed"
  | "pending"
  | "unknown";

export interface BatchPayoutItem {
  referenceId: string;
  phoneNumber: string;
  amount: string;
}

export interface BatchPayoutResult {
  referenceId: string;
  success: boolean;
  error?: string;
  providerReference?: string;
}

export interface MobileMoneyProvider {
  requestPayment(
    phoneNumber: string,
    amount: string,
  ): Promise<{ success: boolean; data?: unknown; error?: unknown }>;
  sendPayout(
    phoneNumber: string,
    amount: string,
  ): Promise<{ success: boolean; data?: unknown; error?: unknown }>;
  sendBatchPayout?(
    items: BatchPayoutItem[],
  ): Promise<{
    success: boolean;
    results: BatchPayoutResult[];
    error?: unknown;
  }>;
  getTransactionStatus(
    referenceId: string,
  ): Promise<{ status: ProviderTransactionStatus }>;
}

// The source TypeScript implementation is currently unavailable in this clone,
// but the compiled CommonJS artifact is committed and used throughout the app.
// Re-export it here so TypeScript consumers can continue importing the module.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { MobileMoneyService } = require("./mobileMoneyService.js");

/**
 * Execute a provider operation with automatic health-based failover chain.
 *
 * This wrapper enhances the base MobileMoneyService with intelligent failover:
 * 1. Checks provider health before attempting the operation
 * 2. If unhealthy, skips to the next provider in the failover chain
 * 3. On failure, tries each fallback provider in order (sorted by health)
 * 4. Records failover metrics for monitoring
 *
 * @param service - MobileMoneyService instance
 * @param op - Operation type: "requestPayment" | "sendPayout"
 * @param provider - Primary provider to try first
 * @param phoneNumber - Customer phone number
 * @param amount - Transaction amount
 * @returns Result from the first successful provider, or failure from the last
 */
export async function executeWithFailoverChain(
  service: InstanceType<typeof MobileMoneyService>,
  op: "requestPayment" | "sendPayout",
  provider: ExtendedProviderName,
  phoneNumber: string,
  amount: string,
): Promise<{
  success: boolean;
  provider?: string;
  data?: unknown;
  error?: unknown;
}> {
  // Check if the primary provider is unhealthy — skip to failover if so
  const primaryUnhealthy = await shouldFailover(provider);
  const failoverChain = await getFailoverChain(provider);

  // Build the full try order: [healthy primary?, ...failovers]
  const tryOrder: ExtendedProviderName[] = primaryUnhealthy
    ? failoverChain
    : [provider, ...failoverChain.filter((p) => p !== provider)];

  logger.info(
    {
      op,
      primaryProvider: provider,
      primaryUnhealthy,
      tryOrder,
    },
    "Executing operation with failover chain",
  );

  let lastError: unknown = null;

  for (const currentProvider of tryOrder) {
    try {
      // Use the base service's requestPayment/sendPayout directly
      // These already use circuit breaker internally
      const result =
        op === "requestPayment"
          ? await service.requestPayment(currentProvider, phoneNumber, amount)
          : await service.sendPayout(currentProvider, phoneNumber, amount);

      if (result.success) {
        if (currentProvider !== provider) {
          logger.info(
            { from: provider, to: currentProvider, op },
            "Failover successful",
          );
          providerFailoverTotal.inc({
            type: op === "requestPayment" ? "payment" : "payout",
            from_provider: provider,
            to_provider: currentProvider,
            reason: primaryUnhealthy
              ? "primary_unhealthy"
              : "primary_failed",
          });
        }
        return {
          success: true,
          provider: currentProvider,
          data: (result as { data?: unknown }).data,
        };
      }

      lastError = (result as { error?: unknown }).error;
      logger.warn(
        { provider: currentProvider, op, error: lastError },
        "Provider operation failed, trying next in chain",
      );
    } catch (err) {
      lastError = err;
      logger.warn(
        { provider: currentProvider, op, error: err },
        "Provider threw error, trying next in chain",
      );
    }
  }

  // All providers exhausted
  logger.error(
    { op, primaryProvider: provider, tryOrder, lastError },
    "All providers in failover chain exhausted",
  );

  return {
    success: false,
    provider,
    error: lastError,
  };
}

export { MobileMoneyService };
