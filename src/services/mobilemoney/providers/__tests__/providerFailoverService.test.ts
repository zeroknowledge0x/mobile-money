import {
  getFailoverChain,
  shouldFailover,
  getBestAvailableProvider,
  getFailoverSummary,
} from "../providerFailoverService";

// Mock providerStatusService
jest.mock("../../../services/providerStatusService", () => ({
  getProvidersStatus: jest.fn(),
}));

const mockGetProvidersStatus =
  require("../../../services/providerStatusService").getProvidersStatus;

describe("providerFailoverService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PROVIDER_FAILOVER_MAP;
  });

  describe("getFailoverChain", () => {
    it("returns default failover chain for vodacom", async () => {
      mockGetProvidersStatus.mockResolvedValue({
        providers: [
          {
            provider: "mtn",
            status: "green",
            successRate: 0.98,
            avgDurationMs: 200,
            totalCalls: 1000,
            lastCalledAt: new Date().toISOString(),
          },
          {
            provider: "airtel",
            status: "green",
            successRate: 0.95,
            avgDurationMs: 300,
            totalCalls: 800,
            lastCalledAt: new Date().toISOString(),
          },
          {
            provider: "orange",
            status: "yellow",
            successRate: 0.85,
            avgDurationMs: 500,
            totalCalls: 400,
            lastCalledAt: new Date().toISOString(),
          },
        ],
      });

      const chain = await getFailoverChain("vodacom");
      expect(chain).toContain("mtn");
      expect(chain).toContain("airtel");
      expect(chain).toContain("orange");
      expect(chain).not.toContain("vodacom"); // primary excluded from failover
    });

    it("sorts failover chain by health — healthiest first", async () => {
      mockGetProvidersStatus.mockResolvedValue({
        providers: [
          {
            provider: "mtn",
            status: "red",
            successRate: 0.5,
            avgDurationMs: 8000,
            totalCalls: 100,
            lastCalledAt: new Date().toISOString(),
          },
          {
            provider: "airtel",
            status: "green",
            successRate: 0.99,
            avgDurationMs: 150,
            totalCalls: 2000,
            lastCalledAt: new Date().toISOString(),
          },
          {
            provider: "orange",
            status: "green",
            successRate: 0.96,
            avgDurationMs: 250,
            totalCalls: 1500,
            lastCalledAt: new Date().toISOString(),
          },
        ],
      });

      const chain = await getFailoverChain("vodacom");
      // airtel (healthiest) should come before mtn (unhealthy)
      const airtelIdx = chain.indexOf("airtel");
      const mtnIdx = chain.indexOf("mtn");
      expect(airtelIdx).toBeLessThan(mtnIdx);
    });

    it("uses custom failover map from env", async () => {
      process.env.PROVIDER_FAILOVER_MAP = JSON.stringify({
        vodacom: ["orange"],
      });

      mockGetProvidersStatus.mockResolvedValue({
        providers: [
          {
            provider: "orange",
            status: "green",
            successRate: 0.95,
            avgDurationMs: 300,
            totalCalls: 500,
            lastCalledAt: new Date().toISOString(),
          },
        ],
      });

      const chain = await getFailoverChain("vodacom");
      expect(chain).toEqual(["orange"]);
    });

    it("returns empty array for unknown provider with no failover map", async () => {
      process.env.PROVIDER_FAILOVER_MAP = JSON.stringify({});

      mockGetProvidersStatus.mockResolvedValue({ providers: [] });

      const chain = await getFailoverChain("tigo");
      // tigo has default fallbacks, but empty map overrides
      expect(chain).toEqual([]);
    });
  });

  describe("shouldFailover", () => {
    it("returns true for red-status provider", async () => {
      mockGetProvidersStatus.mockResolvedValue({
        providers: [
          {
            provider: "vodacom",
            status: "red",
            successRate: 0.4,
            avgDurationMs: 15000,
            totalCalls: 50,
            lastCalledAt: new Date().toISOString(),
          },
        ],
      });

      const result = await shouldFailover("vodacom");
      expect(result).toBe(true);
    });

    it("returns false for green-status provider", async () => {
      mockGetProvidersStatus.mockResolvedValue({
        providers: [
          {
            provider: "mtn",
            status: "green",
            successRate: 0.98,
            avgDurationMs: 200,
            totalCalls: 1000,
            lastCalledAt: new Date().toISOString(),
          },
        ],
      });

      const result = await shouldFailover("mtn");
      expect(result).toBe(false);
    });

    it("returns true when success rate below threshold", async () => {
      mockGetProvidersStatus.mockResolvedValue({
        providers: [
          {
            provider: "airtel",
            status: "yellow",
            successRate: 0.6, // below 0.7 threshold
            avgDurationMs: 5000,
            totalCalls: 200,
            lastCalledAt: new Date().toISOString(),
          },
        ],
      });

      const result = await shouldFailover("airtel");
      expect(result).toBe(true);
    });

    it("returns false for provider with no data (neutral)", async () => {
      mockGetProvidersStatus.mockResolvedValue({ providers: [] });

      const result = await shouldFailover("vodacom");
      expect(result).toBe(false);
    });
  });

  describe("getBestAvailableProvider", () => {
    it("returns healthiest provider", async () => {
      mockGetProvidersStatus.mockResolvedValue({
        providers: [
          {
            provider: "mtn",
            status: "green",
            successRate: 0.99,
            avgDurationMs: 100,
            totalCalls: 5000,
            lastCalledAt: new Date().toISOString(),
          },
          {
            provider: "airtel",
            status: "green",
            successRate: 0.95,
            avgDurationMs: 200,
            totalCalls: 3000,
            lastCalledAt: new Date().toISOString(),
          },
          {
            provider: "orange",
            status: "yellow",
            successRate: 0.82,
            avgDurationMs: 800,
            totalCalls: 1000,
            lastCalledAt: new Date().toISOString(),
          },
          {
            provider: "vodacom",
            status: "green",
            successRate: 0.97,
            avgDurationMs: 150,
            totalCalls: 4000,
            lastCalledAt: new Date().toISOString(),
          },
          {
            provider: "tigo",
            status: "green",
            successRate: 0.93,
            avgDurationMs: 300,
            totalCalls: 2000,
            lastCalledAt: new Date().toISOString(),
          },
        ],
      });

      const best = await getBestAvailableProvider();
      expect(best).toBe("mtn");
    });

    it("excludes specified providers", async () => {
      mockGetProvidersStatus.mockResolvedValue({
        providers: [
          {
            provider: "mtn",
            status: "green",
            successRate: 0.99,
            avgDurationMs: 100,
            totalCalls: 5000,
            lastCalledAt: new Date().toISOString(),
          },
          {
            provider: "airtel",
            status: "green",
            successRate: 0.95,
            avgDurationMs: 200,
            totalCalls: 3000,
            lastCalledAt: new Date().toISOString(),
          },
          {
            provider: "orange",
            status: "green",
            successRate: 0.9,
            avgDurationMs: 300,
            totalCalls: 2000,
            lastCalledAt: new Date().toISOString(),
          },
          {
            provider: "vodacom",
            status: "green",
            successRate: 0.97,
            avgDurationMs: 150,
            totalCalls: 4000,
            lastCalledAt: new Date().toISOString(),
          },
          {
            provider: "tigo",
            status: "green",
            successRate: 0.93,
            avgDurationMs: 300,
            totalCalls: 2000,
            lastCalledAt: new Date().toISOString(),
          },
        ],
      });

      const best = await getBestAvailableProvider(["mtn", "vodacom"]);
      expect(best).toBe("airtel");
    });
  });

  describe("getFailoverSummary", () => {
    it("returns provider health and route map", async () => {
      mockGetProvidersStatus.mockResolvedValue({
        providers: [
          {
            provider: "mtn",
            status: "green",
            successRate: 0.95,
            avgDurationMs: 300,
            totalCalls: 1000,
            lastCalledAt: new Date().toISOString(),
          },
        ],
      });

      const summary = await getFailoverSummary();
      expect(summary.providers).toBeDefined();
      expect(summary.routes).toBeDefined();
      expect(summary.routes.vodacom).toContain("mtn");
    });
  });
});
