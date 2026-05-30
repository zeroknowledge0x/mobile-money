import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export type MobileProvider = "mtn" | "airtel" | "orange";
type PhoneOutputFormat = "e164" | "national";

interface ProviderPhoneFormatConfig {
  defaultRegion: CountryCode;
  output: PhoneOutputFormat;
}

/**
 * Standard mapping of prefixes to Mobile Network Operators.
 * These are common prefixes for regions like Uganda/Rwanda/Cameroon/Ghana/Tanzania.
 */
const PROVIDER_PREFIXES: Record<MobileProvider, string[]> = {
  mtn: ["23767", "23768", "25677", "25678", "23324", "23354", "23355", "23359"],
  airtel: [
    "23766",
    "25670",
    "25675",
    "23326",
    "23356",
    "23357",
    // Tanzania Airtel prefixes
    "25568",
    "25569",
  ],
  orange: ["23765", "23769", "22507", "22177"],
};

const PROVIDER_PHONE_FORMATS: Record<MobileProvider, ProviderPhoneFormatConfig> = {
  mtn: {
    defaultRegion: "CM",
    output: "e164",
  },
  airtel: {
    defaultRegion: (process.env.AIRTEL_PHONE_REGION as CountryCode) || "CM",
    output: "national",
  },
  orange: {
    defaultRegion: "CM",
    output: "e164",
  },
};

function parseFlexiblePhoneNumber(
  phoneNumber: string,
  defaultRegion: CountryCode,
) {
  const trimmed = phoneNumber.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  const candidates = [trimmed];

  if (digitsOnly && !trimmed.startsWith("+")) {
    candidates.push(`+${digitsOnly}`);
  }

  if (digitsOnly.startsWith("00")) {
    candidates.push(`+${digitsOnly.slice(2)}`);
  }

  for (const candidate of candidates) {
    const parsed = parsePhoneNumberFromString(candidate, defaultRegion);
    if (parsed?.isValid()) {
      return parsed;
    }
  }

  return null;
}

/**
 * Tanzania Mobile Network Operator prefixes.
 * Country code: +255
 *
 * Vodacom Tanzania: 075x, 076x, 077x, 078x
 * Tigo (Mixx by Yas): 065x, 067x, 071x
 * Airtel Tanzania: 068x, 069x
 * Halotel: 062x, 063x
 * TTCL: 073x
 */
export const TANZANIA_PROVIDER_PREFIXES: Record<string, string[]> = {
  vodacom: ["25575", "25576", "25577", "25578"],
  tigo: ["25565", "25567", "25571"],
  airtel: ["25568", "25569"],
  halotel: ["25562", "25563"],
  ttcl: ["25573"],
};

/** All valid Tanzania mobile prefixes combined */
const ALL_TANZANIA_PREFIXES: string[] = Object.values(
  TANZANIA_PROVIDER_PREFIXES,
).flat();

/**
 * Tanzania phone number length constraints.
 * Tanzania numbers: +255 followed by 9 digits (total 12 digits with country code).
 * Local format: 0 followed by 9 digits (10 digits total).
 */
const TANZANIA_TOTAL_DIGITS_WITH_CC = 12; // +255 XXX XXX XXX
const TANZANIA_LOCAL_DIGITS = 10; // 0XX XXX XXX

/**
 * Validates if a phone number belongs to the specified provider.
 * @param phoneNumber E.164 formatted number (e.g., +25677...)
 * @param provider The provider selected in the request
 */
export function validatePhoneProviderMatch(
  phoneNumber: string,
  provider: string,
): { valid: boolean; error?: string } {
  const sanitized = phoneNumber.replace(/^\+/, "");
  const targetProvider = provider.toLowerCase() as MobileProvider;

  const prefixes = PROVIDER_PREFIXES[targetProvider];
  if (!prefixes) {
    return { valid: false, error: `Unsupported provider: ${provider}` };
  }

  const isMatch = prefixes.some((prefix) => sanitized.startsWith(prefix));

  if (!isMatch) {
    return {
      valid: false,
      error: `Phone number ${phoneNumber} does not belong to the ${provider.toUpperCase()} network.`,
    };
  }

  return { valid: true };
}

/**
 * Format a phone number according to provider-specific payload requirements.
 * Airtel payouts in particular may require a national-format MSISDN in some
 * regions, so we normalize user input before building the request payload.
 */
export function formatPhoneForProvider(
  phoneNumber: string,
  provider: string,
): string {
  const targetProvider = provider.toLowerCase() as MobileProvider;
  const config = PROVIDER_PHONE_FORMATS[targetProvider];

  if (!config) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const parsed = parseFlexiblePhoneNumber(phoneNumber, config.defaultRegion);
  if (!parsed) {
    throw new Error(`Invalid phone number for ${provider}: ${phoneNumber}`);
  }

  return config.output === "national" ? parsed.nationalNumber : parsed.number;
}

/**
 * Checks if a phone number is a Tanzania number (+255 prefix).
 * @param phoneNumber E.164 formatted number (e.g., +25575...)
 */
export function isTanzaniaNumber(phoneNumber: string): boolean {
  const sanitized = phoneNumber.replace(/^\+/, "");
  return sanitized.startsWith("255");
}

/**
 * Validates a Tanzania phone number format and identifies the operator.
 *
 * Accepts:
 * - E.164 format: +255XXXXXXXXX
 * - Local format with leading zero: 0XXXXXXXXX
 *
 * Rejects:
 * - Wrong length (must be 9 digits after country code)
 * - Invalid prefix (not a recognized Tanzania MNO prefix)
 *
 * @param phoneNumber Phone number in E.164 or local format
 * @returns Validation result with operator name if valid
 */
export function validateTanzaniaPhoneNumber(phoneNumber: string): {
  valid: boolean;
  operator?: string;
  normalized?: string;
  error?: string;
} {
  // Strip whitespace and leading +
  let sanitized = phoneNumber.replace(/^\+/, "").trim();

  // Handle local format (0XX XXX XXX → 255XX XXX XXX)
  if (sanitized.startsWith("0") && sanitized.length === TANZANIA_LOCAL_DIGITS) {
    sanitized = "255" + sanitized.substring(1);
  }

  // Reject non-numeric characters
  if (!/^\d+$/.test(sanitized)) {
    return {
      valid: false,
      error: `Tanzania phone number must contain only digits. Got: ${phoneNumber}`,
    };
  }

  // Validate length: +255 followed by 9 digits
  if (sanitized.length !== TANZANIA_TOTAL_DIGITS_WITH_CC) {
    return {
      valid: false,
      error: `Tanzania phone number must be ${TANZANIA_TOTAL_DIGITS_WITH_CC} digits (including country code 255) or ${TANZANIA_LOCAL_DIGITS} digits in local format. Got ${sanitized.length} digits: ${phoneNumber}`,
    };
  }

  // Validate country code
  if (!sanitized.startsWith("255")) {
    return {
      valid: false,
      error: `Expected Tanzania country code 255. Got: ${phoneNumber}`,
    };
  }

  // Validate prefix against known Tanzania MNO prefixes
  const matchedOperator = Object.entries(TANZANIA_PROVIDER_PREFIXES).find(
    ([, prefixes]) =>
      prefixes.some((prefix) => sanitized.startsWith(prefix)),
  );

  if (!matchedOperator) {
    // Extract the prefix for error message (first 5 digits = country code + operator code)
    const prefix = sanitized.substring(0, 5);
    const validPrefixes = ALL_TANZANIA_PREFIXES.map((p) => p.substring(3)).join(
      ", ",
    );
    return {
      valid: false,
      error: `Tanzania phone number prefix ${prefix} is not a recognized mobile operator prefix. Valid prefixes: ${validPrefixes}`,
    };
  }

  const [operator] = matchedOperator;

  return {
    valid: true,
    operator,
    normalized: `+${sanitized}`,
  };
}

/**
 * Validates Tanzania phone number matches the expected provider.
 *
 * Maps Tanzania operators to platform providers:
 * - vodacom, tigo, halotel, ttcl → treated as generic mobile
 * - airtel → maps to "airtel" provider
 *
 * @param phoneNumber E.164 formatted Tanzania number
 * @param provider The expected provider
 * @returns Validation result
 */
export function validateTanzaniaProviderMatch(
  phoneNumber: string,
  provider: string,
): { valid: boolean; error?: string } {
  const result = validateTanzaniaPhoneNumber(phoneNumber);

  if (!result.valid) {
    return { valid: false, error: result.error };
  }

  const operator = result.operator!.toLowerCase();
  const expectedProvider = provider.toLowerCase();

  // Direct match for Airtel
  if (expectedProvider === "airtel" && operator === "airtel") {
    return { valid: true };
  }

  // For other Tanzania operators (Vodacom, Tigo, etc.), accept if provider matches or is generic
  if (["vodacom", "tigo", "halotel", "ttcl"].includes(operator)) {
    // These are Tanzania-specific operators; allow if provider is one of them
    if (expectedProvider === operator) {
      return { valid: true };
    }
    // Also allow if provider is generic "mobile" or the platform doesn't distinguish
    return {
      valid: false,
      error: `Phone number belongs to ${operator.toUpperCase()} Tanzania, but expected ${expectedProvider.toUpperCase()}.`,
    };
  }

  return {
    valid: false,
    error: `Unknown Tanzania operator for ${phoneNumber}.`,
  };
}
