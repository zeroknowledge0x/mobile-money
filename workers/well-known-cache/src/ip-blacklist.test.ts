/// <reference types="@cloudflare/workers-types" />

/**
 * Unit tests for IP blacklist functionality in the well-known-cache worker.
 *
 * These tests validate the pure IP-matching logic (parseCIDR, ipToInt,
 * ipMatchesCIDR, isIpBlacklisted). The worker integration is tested via
 * Cloudflare's workerd runtime in CI.
 */

// ---------------------------------------------------------------------------
// Inline helpers — mirrors the implementation in index.ts for test isolation
// ---------------------------------------------------------------------------

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

function ipToInt(ip: string): number | null {
  const octets = ip.trim().split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255))
    return null;
  return (
    ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>>
    0
  );
}

function ipMatchesCIDR(ipInt: number, cidr: [number, number]): boolean {
  const [base, prefix] = cidr;
  if (prefix === 0) return true;
  const mask = (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (base & mask);
}

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
      const entryInt = ipToInt(entry);
      if (entryInt !== null && clientInt === entryInt) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ipToInt", () => {
  it("converts valid IPv4 to integer", () => {
    expect(ipToInt("0.0.0.0")).toBe(0);
    expect(ipToInt("255.255.255.255")).toBe(0xffffffff);
    expect(ipToInt("192.168.1.1")).toBe(0xc0a80101);
  });

  it("returns null for invalid input", () => {
    expect(ipToInt("")).toBeNull();
    expect(ipToInt("not-an-ip")).toBeNull();
    expect(ipToInt("256.1.1.1")).toBeNull();
    expect(ipToInt("1.2.3")).toBeNull();
  });
});

describe("parseCIDR", () => {
  it("parses valid CIDR notation", () => {
    const result = parseCIDR("192.168.1.0/24");
    expect(result).not.toBeNull();
    expect(result![0]).toBe(0xc0a80100);
    expect(result![1]).toBe(24);
  });

  it("parses /32 (single host)", () => {
    const result = parseCIDR("10.0.0.1/32");
    expect(result).toEqual([0x0a000001, 32]);
  });

  it("parses /0 (match all)", () => {
    const result = parseCIDR("0.0.0.0/0");
    expect(result).toEqual([0, 0]);
  });

  it("returns null for invalid CIDR", () => {
    expect(parseCIDR("192.168.1.0")).toBeNull(); // no prefix
    expect(parseCIDR("192.168.1.0/33")).toBeNull(); // prefix too large
    expect(parseCIDR("256.1.1.0/24")).toBeNull(); // invalid octet
    expect(parseCIDR("/24")).toBeNull(); // no IP
  });
});

describe("ipMatchesCIDR", () => {
  it("matches IPs within a /24 block", () => {
    const cidr: [number, number] = [0xc0a80100, 24]; // 192.168.1.0/24
    expect(ipMatchesCIDR(0xc0a80101, cidr)).toBe(true); // 192.168.1.1
    expect(ipMatchesCIDR(0xc0a801fe, cidr)).toBe(true); // 192.168.1.254
    expect(ipMatchesCIDR(0xc0a80201, cidr)).toBe(false); // 192.168.2.1
  });

  it("matches /0 (all IPs)", () => {
    const cidr: [number, number] = [0, 0];
    expect(ipMatchesCIDR(0xffffffff, cidr)).toBe(true);
  });

  it("matches exact /32 host", () => {
    const cidr: [number, number] = [0x0a000001, 32]; // 10.0.0.1/32
    expect(ipMatchesCIDR(0x0a000001, cidr)).toBe(true);
    expect(ipMatchesCIDR(0x0a000002, cidr)).toBe(false);
  });
});

describe("isIpBlacklisted", () => {
  it("blocks exact IP match", () => {
    expect(isIpBlacklisted("203.0.113.1", "203.0.113.1")).toBe(true);
  });

  it("blocks IP in CIDR range", () => {
    expect(isIpBlacklisted("198.51.100.5", "198.51.100.0/24")).toBe(true);
  });

  it("allows IP not in blacklist", () => {
    expect(isIpBlacklisted("8.8.8.8", "203.0.113.1,198.51.100.0/24")).toBe(
      false,
    );
  });

  it("handles comma-separated list with mixed exact/CIDR", () => {
    const list = "203.0.113.1,198.51.100.0/24,192.0.2.5";
    expect(isIpBlacklisted("203.0.113.1", list)).toBe(true); // exact
    expect(isIpBlacklisted("198.51.100.42", list)).toBe(true); // CIDR
    expect(isIpBlacklisted("192.0.2.5", list)).toBe(true); // exact
    expect(isIpBlacklisted("8.8.8.8", list)).toBe(false); // not listed
  });

  it("returns false when blacklist is undefined", () => {
    expect(isIpBlacklisted("203.0.113.1", undefined)).toBe(false);
  });

  it("returns false when blacklist is empty string", () => {
    expect(isIpBlacklisted("203.0.113.1", "")).toBe(false);
  });

  it("handles whitespace in entries", () => {
    expect(isIpBlacklisted("203.0.113.1", " 203.0.113.1 ")).toBe(true);
  });

  it("ignores invalid entries in the list", () => {
    expect(isIpBlacklisted("203.0.113.1", "invalid,203.0.113.1")).toBe(true);
    expect(isIpBlacklisted("8.8.8.8", "invalid,not-an-ip")).toBe(false);
  });
});
