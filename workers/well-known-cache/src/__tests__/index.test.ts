import { describe, it, expect, beforeEach } from "vitest";
import worker from "../index";

/**
 * Local testing mocks for the well-known-cache Cloudflare Worker.
 *
 * Uses vitest-pool-workers to provide a simulated Cloudflare Workers runtime
 * with in-memory cache, allowing developers to test worker logic locally
 * without publishing to Cloudflare networks.
 */

// Mock environment bindings
const env = {
  STELLAR_TOML_MAX_AGE: "3600",
  STELLAR_TOML_STALE_WHILE_REVALIDATE: "86400",
  DEFAULT_MAX_AGE: "300",
  DEFAULT_STALE_WHILE_REVALIDATE: "3600",
};

// Helper to create mock fetch responses for the origin server
function mockOriginFetch(responseBody: string, status = 200, contentType = "text/plain") {
  return async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    return new Response(responseBody, {
      status,
      headers: { "Content-Type": contentType },
    });
  };
}

describe("well-known-cache worker", () => {
  describe("CORS preflight (OPTIONS)", () => {
    it("returns 204 with CORS headers for OPTIONS requests", async () => {
      const req = new Request("https://example.com/.well-known/stellar.toml", {
        method: "OPTIONS",
      });
      const res = await worker.fetch(req, env);

      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(res.headers.get("Access-Control-Allow-Methods")).toBe("GET, HEAD, OPTIONS");
      expect(res.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
    });
  });

  describe("method validation", () => {
    it("returns 405 for POST requests", async () => {
      const req = new Request("https://example.com/.well-known/stellar.toml", {
        method: "POST",
        body: JSON.stringify({ test: true }),
      });
      const res = await worker.fetch(req, env);
      const body = await res.json() as { status: number; error: string };

      expect(res.status).toBe(405);
      expect(body.status).toBe(405);
      expect(body.error).toBe("Method Not Allowed");
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("returns 405 for PUT requests", async () => {
      const req = new Request("https://example.com/.well-known/stellar.toml", {
        method: "PUT",
      });
      const res = await worker.fetch(req, env);
      const body = await res.json() as { status: number; error: string };

      expect(res.status).toBe(405);
      expect(body.error).toBe("Method Not Allowed");
    });

    it("returns 405 for DELETE requests", async () => {
      const req = new Request("https://example.com/.well-known/stellar.toml", {
        method: "DELETE",
      });
      const res = await worker.fetch(req, env);
      const body = await res.json() as { status: number; error: string };

      expect(res.status).toBe(405);
      expect(body.error).toBe("Method Not Allowed");
    });

    it("allows GET requests", async () => {
      const req = new Request("https://example.com/.well-known/stellar.toml", {
        method: "GET",
      });
      // fetch will succeed via the pool-workers runtime
      const res = await worker.fetch(req, env);

      // Should not be 405
      expect(res.status).not.toBe(405);
    });

    it("allows HEAD requests", async () => {
      const req = new Request("https://example.com/.well-known/stellar.toml", {
        method: "HEAD",
      });
      const res = await worker.fetch(req, env);

      expect(res.status).not.toBe(405);
    });
  });

  describe("cache behavior", () => {
    it("returns MISS on first request and HIT on subsequent request", async () => {
      const url = "https://example.com/.well-known/stellar.toml";

      // First request — cache MISS
      const req1 = new Request(url, { method: "GET" });
      const res1 = await worker.fetch(req1, env);
      expect(res1.headers.get("cf-cache-status")).toBe("MISS");

      // Second request — cache HIT (from Cloudflare edge cache)
      const req2 = new Request(url, { method: "GET" });
      const res2 = await worker.fetch(req2, env);
      expect(res2.headers.get("cf-cache-status")).toBe("HIT");
    });

    it("sets correct Cache-Control for stellar.toml", async () => {
      const req = new Request("https://example.com/.well-known/stellar.toml", {
        method: "GET",
      });
      const res = await worker.fetch(req, env);

      expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
      expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate=86400");
    });

    it("sets correct Cache-Control for non-stellar.toml paths", async () => {
      const req = new Request("https://example.com/.well-known/openid-configuration", {
        method: "GET",
      });
      const res = await worker.fetch(req, env);

      expect(res.headers.get("Cache-Control")).toContain("max-age=300");
      expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate=3600");
    });
  });

  describe("CORS headers on responses", () => {
    it("includes CORS headers on GET responses", async () => {
      const req = new Request("https://example.com/.well-known/stellar.toml", {
        method: "GET",
      });
      const res = await worker.fetch(req, env);

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(res.headers.get("Access-Control-Allow-Methods")).toBe("GET, HEAD, OPTIONS");
    });

    it("includes CORS headers on error responses", async () => {
      const req = new Request("https://example.com/.well-known/stellar.toml", {
        method: "POST",
      });
      const res = await worker.fetch(req, env);

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(res.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("error handling", () => {
    it("returns JSON error body with timestamp for 405 errors", async () => {
      const req = new Request("https://example.com/.well-known/stellar.toml", {
        method: "PATCH",
      });
      const res = await worker.fetch(req, env);
      const body = await res.json() as {
        status: number;
        error: string;
        message: string;
        timestamp: string;
      };

      expect(body.status).toBe(405);
      expect(body.error).toBe("Method Not Allowed");
      expect(body.message).toContain("PATCH");
      expect(body.timestamp).toBeDefined();
      // Verify timestamp is a valid ISO date
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });
  });

  describe("metrics logging", () => {
    it("logs request metrics on successful fetch", async () => {
      // This test verifies the worker doesn't throw during metrics logging
      const req = new Request("https://example.com/.well-known/stellar.toml", {
        method: "GET",
        headers: { "User-Agent": "test-agent/1.0" },
      });
      const res = await worker.fetch(req, env);

      // If we get here without throwing, metrics logging succeeded
      expect(res.status).toBeLessThan(500);
    });
  });
});
