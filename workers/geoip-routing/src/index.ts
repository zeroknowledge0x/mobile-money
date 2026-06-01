/// <reference types="@cloudflare/workers-types" />

/**
 * GeoIP-Based API Routing Worker
 *
 * Routes incoming requests to the nearest regional backend based on
 * Cloudflare's geo-headers (CF-IPCountry, cf.colo).
 *
 * Environment variables:
 *   REGION_MAP       — JSON mapping country/continent codes to backend URLs
 *                      Example: '{"US":"https://us.api.example.com","EU":"https://eu.api.example.com","DEFAULT":"https://api.example.com"}'
 *   FALLBACK_URL     — Fallback backend URL when no region matches
 *   ROUTE_HEADER     — Header name to set with the selected region (default: "X-Route-Region")
 *   PASS_THROUGH_HEADERS — "true" to forward geo headers to backend (default "true")
 */

interface Env {
  REGION_MAP?: string;
  FALLBACK_URL?: string;
  ROUTE_HEADER?: string;
  PASS_THROUGH_HEADERS?: string;
}

// ---------------------------------------------------------------------------
// Continent mapping (country code → continent/region)
// ---------------------------------------------------------------------------

const CONTINENT_MAP: Record<string, string> = {
  // North America
  US: "NA", CA: "NA", MX: "NA",
  // Europe
  GB: "EU", DE: "EU", FR: "EU", IT: "EU", ES: "EU", NL: "EU", SE: "EU", NO: "EU",
  DK: "EU", FI: "EU", PL: "EU", CZ: "EU", AT: "EU", CH: "EU", BE: "EU", IE: "EU",
  PT: "EU", GR: "EU", RO: "EU", HU: "EU", SK: "EU", BG: "EU", HR: "EU", LT: "EU",
  LV: "EU", EE: "EU", SI: "EU", LU: "EU", MT: "EU", CY: "EU", IS: "EU",
  // Asia
  JP: "AS", CN: "AS", KR: "AS", IN: "AS", SG: "AS", HK: "AS", TW: "AS", TH: "AS",
  VN: "AS", MY: "AS", ID: "AS", PH: "AS", BD: "AS", PK: "AS", LK: "AS", NP: "AS",
  MM: "AS", KH: "AS", LA: "AS", MN: "AS",
  // Middle East
  AE: "ME", SA: "ME", IL: "ME", TR: "ME", QA: "ME", KW: "ME", BH: "ME", OM: "ME",
  JO: "ME", LB: "ME", IQ: "ME", IR: "ME",
  // Africa
  NG: "AF", ZA: "AF", KE: "AF", EG: "AF", GH: "AF", ET: "AF", TZ: "AF", UG: "AF",
  DZ: "AF", MA: "AF", SD: "AF", AO: "AF", MZ: "AF", ZW: "AF",
  // South America
  BR: "SA", AR: "SA", CL: "SA", CO: "SA", PE: "SA", VE: "SA", EC: "SA", BO: "SA",
  PY: "SA", UY: "SA", GY: "SA",
  // Oceania
  AU: "OC", NZ: "OC", FJ: "OC", PG: "OC",
};

// ---------------------------------------------------------------------------
// Region resolution
// ---------------------------------------------------------------------------

interface RegionConfig {
  regionMap: Record<string, string>;
  fallbackUrl: string;
  routeHeader: string;
  passThroughHeaders: boolean;
}

function parseConfig(env: Env): RegionConfig {
  let regionMap: Record<string, string> = {};
  try {
    if (env.REGION_MAP) {
      regionMap = JSON.parse(env.REGION_MAP);
    }
  } catch {
    console.warn("Failed to parse REGION_MAP, using empty map");
  }

  return {
    regionMap,
    fallbackUrl: env.FALLBACK_URL || "",
    routeHeader: env.ROUTE_HEADER || "X-Route-Region",
    passThroughHeaders: env.PASS_THROUGH_HEADERS !== "false",
  };
}

function resolveRegion(
  countryCode: string,
  regionMap: Record<string, string>
): { url: string; region: string } | null {
  // 1. Direct country match
  if (regionMap[countryCode]) {
    return { url: regionMap[countryCode], region: countryCode };
  }

  // 2. Continent match
  const continent = CONTINENT_MAP[countryCode];
  if (continent && regionMap[continent]) {
    return { url: regionMap[continent], region: continent };
  }

  // 3. DEFAULT key
  if (regionMap["DEFAULT"]) {
    return { url: regionMap["DEFAULT"], region: "DEFAULT" };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function errorResponse(status: number, error: string, message: string): Response {
  return new Response(
    JSON.stringify({ status, error, message, timestamp: new Date().toISOString() }, null, 2),
    {
      status,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    }
  );
}

// ---------------------------------------------------------------------------
// Exported handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const config = parseConfig(env);
    const url = new URL(request.url);

    // Extract geo info from Cloudflare headers
    const countryCode = request.headers.get("CF-IPCountry") || "XX";
    const colo = request.headers.get("cf-colo") || "unknown";

    // Resolve target backend
    const resolved = resolveRegion(countryCode, config.regionMap);

    if (!resolved && !config.fallbackUrl) {
      return errorResponse(
        502,
        "No Backend Configured",
        `No region mapping found for country ${countryCode} and no FALLBACK_URL set.`
      );
    }

    const targetUrl = resolved?.url || config.fallbackUrl;
    const targetRegion = resolved?.region || "FALLBACK";

    // Build the proxied URL
    const target = new URL(url.pathname + url.search, targetUrl);

    // Clone request with geo headers
    const headers = new Headers(request.headers);

    if (config.passThroughHeaders) {
      headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");
      headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));
      headers.set("X-Forwarded-Host", url.host);
    }

    // Set routing metadata headers
    headers.set(config.routeHeader, targetRegion);
    headers.set("X-Geo-Country", countryCode);
    headers.set("X-Geo-Colo", colo);

    try {
      const response = await fetch(target.toString(), {
        method: request.method,
        headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
        redirect: "follow",
      });

      // Clone response and add routing headers
      const res = new Response(response.body, response);
      res.headers.set(config.routeHeader, targetRegion);
      res.headers.set("X-Geo-Country", countryCode);
      for (const [k, v] of Object.entries(CORS_HEADERS)) {
        res.headers.set(k, v);
      }

      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return errorResponse(
        502,
        "Backend Unreachable",
        `Failed to reach ${targetRegion} backend (${targetUrl}): ${message}`
      );
    }
  },
} satisfies ExportedHandler<Env>;
