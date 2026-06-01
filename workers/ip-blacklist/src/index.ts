/// <reference types="@cloudflare/workers-types" />

/**
 * IP Blacklist Edge Worker
 *
 * Blocks requests from blacklisted IPs before they reach the main backend.
 * Supports static IP/CIDR lists via environment variables and dynamic
 * management via Cloudflare KV namespace.
 *
 * Environment variables:
 *   BLOCKED_IPS       — Comma-separated IPs or CIDRs (e.g. "1.2.3.4,5.6.0.0/16")
 *   ALLOWED_IPS       — Comma-separated IPs that bypass all checks (whitelist)
 *   IP_BLACKLIST_KV   — (optional) KV namespace binding for dynamic blacklist
 *   BLOCK_RESPONSE    — "403" (default) or "444" (nginx-style drop)
 *   LOG_BLOCKED       — "true" to log blocked requests (default "true")
 */

interface Env {
  BLOCKED_IPS?: string;
  ALLOWED_IPS?: string;
  IP_BLACKLIST_KV?: KVNamespace;
  BLOCK_RESPONSE?: string;
  LOG_BLOCKED?: string;
}

interface BlockRecord {
  ip: string;
  reason: string;
  timestamp: string;
  path: string;
  userAgent: string;
}

// ---------------------------------------------------------------------------
// CIDR matching
// ---------------------------------------------------------------------------

function parseIpv4(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  const bytes = parts.map(Number);
  if (bytes.some((b) => isNaN(b) || b < 0 || b > 255)) return null;
  return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.trim().split("/");
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const ipNum = parseIpv4(ip);
  const networkNum = parseIpv4(network);
  if (ipNum === null || networkNum === null) return false;

  if (prefix === 0) return true; // 0.0.0.0/0 matches everything

  const mask = (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (networkNum & mask);
}

function ipMatchesEntry(ip: string, entry: string): boolean {
  const trimmed = entry.trim();
  if (!trimmed) return false;
  if (trimmed.includes("/")) return ipInCidr(ip, trimmed);
  return ip === trimmed;
}

// ---------------------------------------------------------------------------
// Blacklist / allowlist resolution
// ---------------------------------------------------------------------------

function parseCommaSeparated(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isIpInList(ip: string, list: string[]): boolean {
  return list.some((entry) => ipMatchesEntry(ip, entry));
}

async function isBlacklistedKv(ip: string, kv?: KVNamespace): Promise<boolean> {
  if (!kv) return false;
  const value = await kv.get(`blocked:${ip}`);
  return value !== null;
}

async function isBlacklisted(
  ip: string,
  staticList: string[],
  kv?: KVNamespace
): Promise<{ blocked: boolean; reason: string }> {
  // Direct IP match in static list
  if (isIpInList(ip, staticList)) {
    return { blocked: true, reason: "static_blacklist" };
  }

  // KV-based dynamic blacklist
  if (await isBlacklistedKv(ip, kv)) {
    return { blocked: true, reason: "kv_blacklist" };
  }

  return { blocked: false, reason: "" };
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function blockResponse(statusCode: number, ip: string): Response {
  const body = JSON.stringify(
    {
      status: statusCode,
      error: "Forbidden",
      message: "Your IP address has been blocked.",
      ip,
      timestamp: new Date().toISOString(),
    },
    null,
    2
  );

  return new Response(body, {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "X-Blocked-By": "ip-blacklist-worker",
      ...CORS_HEADERS,
    },
  });
}

function logBlock(record: BlockRecord): void {
  console.log(
    JSON.stringify({
      level: "warn",
      type: "ip_blocked",
      ...record,
    })
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

    const clientIp =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
      "unknown";

    const blockedStatusCode = parseInt(env.BLOCK_RESPONSE || "403", 10) || 403;
    const shouldLog = env.LOG_BLOCKED !== "false";

    // 1. Allowlist bypass — trusted IPs skip all checks
    const allowedList = parseCommaSeparated(env.ALLOWED_IPS);
    if (isIpInList(clientIp, allowedList)) {
      return fetch(request);
    }

    // 2. Check blacklist
    const blockedList = parseCommaSeparated(env.BLOCKED_IPS);
    const { blocked, reason } = await isBlacklisted(
      clientIp,
      blockedList,
      env.IP_BLACKLIST_KV
    );

    if (blocked) {
      if (shouldLog) {
        const url = new URL(request.url);
        logBlock({
          ip: clientIp,
          reason,
          timestamp: new Date().toISOString(),
          path: url.pathname,
          userAgent: request.headers.get("User-Agent") || "unknown",
        });
      }
      return blockResponse(blockedStatusCode, clientIp);
    }

    // 3. Pass through to origin
    return fetch(request);
  },
} satisfies ExportedHandler<Env>;
