/// <reference types="@cloudflare/workers-types" />

interface Env {
  STELLAR_TOML_MAX_AGE: string;
  STELLAR_TOML_STALE_WHILE_REVALIDATE: string;
  DEFAULT_MAX_AGE: string;
  DEFAULT_STALE_WHILE_REVALIDATE: string;
  /** Comma-separated list of IPs or CIDRs to block (e.g. "192.168.1.0/24,10.0.0.1") */
  IP_BLACKLIST?: string;
}

// ---------------------------------------------------------------------------
// IP Blacklist — edge-level blocking before requests reach the origin
// ---------------------------------------------------------------------------

/**
 * Parse a CIDR string (e.g. "192.168.1.0/24") into a [baseInt, maskBits] tuple.
 * Returns null if the CIDR is invalid.
 */
function parseCIDR(cidr: string): [number, number] | null {
  const parts = cidr.trim().split("/");
  if (parts.length !== 2) return null;
  const octets = parts[0].split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255))
    return null;
  const prefix = parseInt(parts[1], 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;
  const ipInt =
    ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>>
    0;
  return [ipInt, prefix];
}

/**
 * Convert a dotted-quad IPv4 string to an unsigned 32-bit integer.
 * Returns null if the string is not a valid IPv4 address.
 */
function ipToInt(ip: string): number | null {
  const octets = ip.trim().split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255))
    return null;
  return (
    ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>>
    0
  );
}

/**
 * Check whether an IPv4 address matches a CIDR block.
 * Supports both exact IPs (parsed as /32) and CIDR notation.
 */
function ipMatchesCIDR(ipInt: number, cidr: [number, number]): boolean {
  const [base, prefix] = cidr;
  if (prefix === 0) return true; // /0 matches everything
  const mask = (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (base & mask);
}

/**
 * Parse the IP_BLACKLIST env var and check if the client IP should be blocked.
 * Supports:
 *   - Exact IPs: "192.168.1.1"
 *   - CIDR ranges: "192.168.1.0/24"
 *   - Comma-separated lists: "192.168.1.0/24,10.0.0.1,172.16.0.0/12"
 */
function isIpBlacklisted(
  clientIp: string,
  blacklistEnv: string | undefined,
): boolean {
  if (!blacklistEnv) return false;
  const entries = blacklistEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const clientInt = ipToInt(clientIp);
  if (clientInt === null) return false;

  for (const entry of entries) {
    if (entry.includes("/")) {
      const cidr = parseCIDR(entry);
      if (cidr && ipMatchesCIDR(clientInt, cidr)) return true;
    } else {
      // Exact IP match
      const entryInt = ipToInt(entry);
      if (entryInt !== null && clientInt === entryInt) return true;
    }
  }
  return false;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface ErrorResponse {
  status: number;
  error: string;
  message: string;
  timestamp: string;
}

function errorResponse(status: number, error: string, message: string): Response {
  const body: ErrorResponse = {
    status,
    error,
    message,
    timestamp: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function cacheControlFor(pathname: string): string {
  return pathname.endsWith("/stellar.toml")
    ? "public, max-age=3600, stale-while-revalidate=86400"
    : "public, max-age=300, stale-while-revalidate=3600";
}

interface RequestMetrics {
  method: string;
  pathname: string;
  cacheStatus: "HIT" | "MISS" | "BYPASS";
  statusCode: number;
  latencyMs: number;
  responseBytes: number;
  timestamp: string;
  userAgent: string;
}

function logMetrics(metrics: RequestMetrics): void {
  console.log(
    JSON.stringify({
      level: "info",
      type: "edge_request_metrics",
      ...metrics,
    })
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Edge IP blacklist — block before any processing
    const clientIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";
    if (clientIp && isIpBlacklisted(clientIp, env.IP_BLACKLIST)) {
      console.warn(
        JSON.stringify({
          level: "warn",
          type: "ip_blacklist_block",
          ip: clientIp,
          pathname: new URL(request.url).pathname,
          timestamp: new Date().toISOString(),
        }),
      );
      return errorResponse(
        403,
        "Forbidden",
        "Access denied: your IP is blacklisted.",
      );
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (!["GET", "HEAD"].includes(request.method)) {
      return errorResponse(
        405,
        "Method Not Allowed",
        `HTTP method ${request.method} is not supported. Use GET or HEAD.`
      );
    }

    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return errorResponse(400, "Bad Request", "Invalid request URL.");
    }

    try {
      const cache = caches.default;

      const cached = await cache.match(request);
      if (cached) {
        const res = new Response(cached.body, cached);
        res.headers.set("cf-cache-status", "HIT");
        for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
        return res;
      }

      const origin = await fetch(request);
      if (!origin.ok) {
        return errorResponse(
          origin.status,
          origin.statusText || "Upstream Error",
          `Origin server returned ${origin.status} for ${url.pathname}.`
        );
      }

      const res = new Response(origin.body, origin);
      res.headers.set("Cache-Control", cacheControlFor(url.pathname));
      res.headers.set("cf-cache-status", "MISS");
      for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);

      await cache.put(request, res.clone());
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      return errorResponse(502, "Bad Gateway", `Failed to fetch origin: ${message}`);
    }
  },
} satisfies ExportedHandler<Env>;
