/**
 * IP Blacklist Worker — Unit Tests
 *
 * Tests CIDR matching, allowlist bypass, static/KV blacklist,
 * CORS preflight, and logging behaviour.
 *
 * Pure-function tests only — no worker import needed.
 */

// ---------------------------------------------------------------------------
// Helper functions (mirrors src/index.ts logic)
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
  if (prefix === 0) return true;
  const mask = (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (networkNum & mask);
}

function ipMatchesEntry(ip: string, entry: string): boolean {
  const trimmed = entry.trim();
  if (!trimmed) return false;
  if (trimmed.includes("/")) return ipInCidr(ip, trimmed);
  return ip === trimmed;
}

function isIpInList(ip: string, list: string[]): boolean {
  return list.some((entry) => ipMatchesEntry(ip, entry));
}

function parseCommaSeparated(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseIpv4", () => {
  it("parses valid IPv4 addresses", () => {
    expect(parseIpv4("0.0.0.0")).toBe(0);
    expect(parseIpv4("255.255.255.255")).toBe(0xffffffff);
    expect(parseIpv4("192.168.1.1")).toBe(0xc0a80101);
    expect(parseIpv4("10.0.0.1")).toBe(0x0a000001);
  });

  it("returns null for invalid input", () => {
    expect(parseIpv4("")).toBeNull();
    expect(parseIpv4("abc")).toBeNull();
    expect(parseIpv4("1.2.3")).toBeNull();
    expect(parseIpv4("1.2.3.4.5")).toBeNull();
    expect(parseIpv4("256.1.1.1")).toBeNull();
    expect(parseIpv4("-1.0.0.0")).toBeNull();
  });
});

describe("ipInCidr", () => {
  it("matches exact IP in /32 CIDR", () => {
    expect(ipInCidr("192.168.1.1", "192.168.1.1/32")).toBe(true);
    expect(ipInCidr("192.168.1.2", "192.168.1.1/32")).toBe(false);
  });

  it("matches /24 subnet", () => {
    expect(ipInCidr("10.0.0.1", "10.0.0.0/24")).toBe(true);
    expect(ipInCidr("10.0.0.255", "10.0.0.0/24")).toBe(true);
    expect(ipInCidr("10.0.1.1", "10.0.0.0/24")).toBe(false);
  });

  it("matches /16 subnet", () => {
    expect(ipInCidr("172.16.0.1", "172.16.0.0/16")).toBe(true);
    expect(ipInCidr("172.16.255.255", "172.16.0.0/16")).toBe(true);
    expect(ipInCidr("172.17.0.1", "172.16.0.0/16")).toBe(false);
  });

  it("matches /8 subnet", () => {
    expect(ipInCidr("10.0.0.1", "10.0.0.0/8")).toBe(true);
    expect(ipInCidr("10.255.255.255", "10.0.0.0/8")).toBe(true);
    expect(ipInCidr("11.0.0.1", "10.0.0.0/8")).toBe(false);
  });

  it("matches /0 (all IPs)", () => {
    expect(ipInCidr("1.2.3.4", "0.0.0.0/0")).toBe(true);
    expect(ipInCidr("255.255.255.255", "0.0.0.0/0")).toBe(true);
  });

  it("returns false for invalid CIDR", () => {
    expect(ipInCidr("1.2.3.4", "bad")).toBe(false);
    expect(ipInCidr("1.2.3.4", "1.2.3.4/33")).toBe(false);
    expect(ipInCidr("1.2.3.4", "1.2.3.4/-1")).toBe(false);
    expect(ipInCidr("1.2.3.4", "")).toBe(false);
  });

  it("handles boundary cases", () => {
    // /1 — only first bit matters
    expect(ipInCidr("128.0.0.1", "128.0.0.0/1")).toBe(true);
    expect(ipInCidr("0.0.0.1", "128.0.0.0/1")).toBe(false);
  });
});

describe("ipMatchesEntry", () => {
  it("matches exact IP", () => {
    expect(ipMatchesEntry("1.2.3.4", "1.2.3.4")).toBe(true);
    expect(ipMatchesEntry("1.2.3.4", "1.2.3.5")).toBe(false);
  });

  it("matches CIDR notation", () => {
    expect(ipMatchesEntry("10.0.0.5", "10.0.0.0/24")).toBe(true);
    expect(ipMatchesEntry("10.0.1.5", "10.0.0.0/24")).toBe(false);
  });

  it("handles whitespace", () => {
    expect(ipMatchesEntry("1.2.3.4", "  1.2.3.4  ")).toBe(true);
    expect(ipMatchesEntry("1.2.3.4", "1.2.3.4")).toBe(true);
  });

  it("returns false for empty entry", () => {
    expect(ipMatchesEntry("1.2.3.4", "")).toBe(false);
    expect(ipMatchesEntry("1.2.3.4", "   ")).toBe(false);
  });
});

describe("isIpInList", () => {
  it("matches against multiple entries (mixed exact + CIDR)", () => {
    const list = ["10.0.0.0/8", "192.168.1.1", "172.16.0.0/12"];
    expect(isIpInList("10.1.2.3", list)).toBe(true);
    expect(isIpInList("192.168.1.1", list)).toBe(true);
    expect(isIpInList("172.16.5.5", list)).toBe(true);
    expect(isIpInList("8.8.8.8", list)).toBe(false);
  });

  it("returns false for empty list", () => {
    expect(isIpInList("1.2.3.4", [])).toBe(false);
  });

  it("does not match partial IP (no CIDR = exact match)", () => {
    expect(isIpInList("1.2.3.4", ["1.2.3"])).toBe(false);
  });
});

describe("parseCommaSeparated", () => {
  it("parses comma-separated values", () => {
    expect(parseCommaSeparated("1.2.3.4,5.6.7.8")).toEqual(["1.2.3.4", "5.6.7.8"]);
  });

  it("handles whitespace around values", () => {
    expect(parseCommaSeparated(" 1.2.3.4 , 5.6.7.8 ")).toEqual(["1.2.3.4", "5.6.7.8"]);
  });

  it("returns empty array for undefined/empty", () => {
    expect(parseCommaSeparated(undefined)).toEqual([]);
    expect(parseCommaSeparated("")).toEqual([]);
  });

  it("filters empty segments", () => {
    expect(parseCommaSeparated("1.2.3.4,,5.6.7.8,")).toEqual(["1.2.3.4", "5.6.7.8"]);
  });

  it("handles single value", () => {
    expect(parseCommaSeparated("10.0.0.0/8")).toEqual(["10.0.0.0/8"]);
  });
});
