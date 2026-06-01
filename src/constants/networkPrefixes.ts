export type MobileNetworkName = "MTN" | "AIRTEL" | "ORANGE" | "TIGO" | "VODACOM";

/**
 * Common network prefixes for target mobile money providers.
 * Keys are normalized numeric prefixes used to identify a destination network.
 */
export const NETWORK_PREFIXES: Record<string, MobileNetworkName> = {
  // Cameroon
  "23765": "ORANGE",
  "23766": "AIRTEL",
  "23767": "MTN",
  "23768": "MTN",
  "23769": "ORANGE",

  // Uganda
  "25670": "AIRTEL",
  "25675": "AIRTEL",
  "25677": "MTN",
  "25678": "MTN",

  // Ghana
  "23324": "MTN",
  "23326": "AIRTEL",
  "23354": "MTN",
  "23355": "MTN",
  "23356": "AIRTEL",
  "23357": "AIRTEL",
  "23359": "MTN",

  // Ivory Coast
  "22507": "ORANGE",

  // Senegal
  "22177": "ORANGE",

  // Tanzania — Vodacom
  "25574": "VODACOM",
  "25575": "VODACOM",
  "25576": "VODACOM",

  // Tanzania — Tigo
  "25565": "TIGO",
  "25566": "TIGO",
  "25567": "TIGO",
  "25571": "TIGO",
};
