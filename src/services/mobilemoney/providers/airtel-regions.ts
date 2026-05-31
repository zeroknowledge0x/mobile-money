/**
 * Airtel Money region configuration.
 *
 * Maps African regions to their supported country codes and currencies.
 * Used to auto-resolve the correct currency from a country code and to
 * validate country↔currency pairs before sending API requests.
 */

export type AirtelRegion = "central" | "east" | "west";

export interface AirtelRegionConfig {
  countries: string[];
  currencies: string[];
}

export const AIRTEL_REGION_MAP: Record<AirtelRegion, AirtelRegionConfig> = {
  central: {
    countries: ["CM", "GA", "CG", "TD", "CF", "GQ"],
    currencies: ["XAF"],
  },
  east: {
    countries: ["TZ", "KE", "UG", "RW", "MW", "MG", "ZM"],
    currencies: ["TZS", "KES", "UGX", "RWF", "MWK", "MGA", "ZMW"],
  },
  west: {
    countries: ["NG", "GH", "SN", "CI", "BF", "ML", "NE", "TG", "BJ", "GN"],
    currencies: ["NGN", "GHS", "XOF"],
  },
};

/**
 * Resolve the region for a given country code.
 * Returns undefined if the country is not in any known region.
 */
export function resolveAirtelRegion(country: string): AirtelRegion | undefined {
  const upper = country.toUpperCase();
  for (const [region, cfg] of Object.entries(AIRTEL_REGION_MAP)) {
    if (cfg.countries.includes(upper)) {
      return region as AirtelRegion;
    }
  }
  return undefined;
}

/**
 * Validate that a currency is expected for a given country.
 * Returns an error message string if invalid, or undefined if valid.
 */
export function validateCountryCurrency(
  country: string,
  currency: string,
): string | undefined {
  const region = resolveAirtelRegion(country);
  if (!region) {
    return undefined; // Unknown country — skip validation
  }

  const expected = AIRTEL_REGION_MAP[region].currencies;
  if (!expected.includes(currency.toUpperCase())) {
    return (
      `Currency "${currency}" is not valid for Airtel country "${country}" (region: ${region}). ` +
      `Expected one of: ${expected.join(", ")}`
    );
  }
  return undefined;
}
