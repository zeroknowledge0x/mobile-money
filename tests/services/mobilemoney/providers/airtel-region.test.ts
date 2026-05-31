import {
  resolveAirtelRegion,
  validateCountryCurrency,
  AIRTEL_REGION_MAP,
} from "../../../../src/services/mobilemoney/providers/airtel-regions";

// ============================================================================
// Region Resolution Tests
// ============================================================================

describe("resolveAirtelRegion", () => {
  it("resolves Central Africa countries to 'central'", () => {
    expect(resolveAirtelRegion("CM")).toBe("central");
    expect(resolveAirtelRegion("GA")).toBe("central");
    expect(resolveAirtelRegion("TD")).toBe("central");
  });

  it("resolves East Africa countries to 'east'", () => {
    expect(resolveAirtelRegion("TZ")).toBe("east");
    expect(resolveAirtelRegion("KE")).toBe("east");
    expect(resolveAirtelRegion("UG")).toBe("east");
    expect(resolveAirtelRegion("RW")).toBe("east");
  });

  it("resolves West Africa countries to 'west'", () => {
    expect(resolveAirtelRegion("NG")).toBe("west");
    expect(resolveAirtelRegion("GH")).toBe("west");
  });

  it("is case-insensitive", () => {
    expect(resolveAirtelRegion("tz")).toBe("east");
    expect(resolveAirtelRegion("cm")).toBe("central");
  });

  it("returns undefined for unknown countries", () => {
    expect(resolveAirtelRegion("US")).toBeUndefined();
    expect(resolveAirtelRegion("ZZ")).toBeUndefined();
  });
});

// ============================================================================
// Currency Validation Tests
// ============================================================================

describe("validateCountryCurrency", () => {
  it("accepts valid Central Africa pair (CM/XAF)", () => {
    expect(validateCountryCurrency("CM", "XAF")).toBeUndefined();
  });

  it("accepts valid East Africa pair (TZ/TZS)", () => {
    expect(validateCountryCurrency("TZ", "TZS")).toBeUndefined();
  });

  it("accepts valid East Africa pair (KE/KES)", () => {
    expect(validateCountryCurrency("KE", "KES")).toBeUndefined();
  });

  it("rejects mismatched pair (TZ/XAF)", () => {
    const error = validateCountryCurrency("TZ", "XAF");
    expect(error).toBeDefined();
    expect(error).toContain("TZS");
  });

  it("rejects mismatched pair (CM/TZS)", () => {
    const error = validateCountryCurrency("CM", "TZS");
    expect(error).toBeDefined();
    expect(error).toContain("XAF");
  });

  it("returns undefined for unknown country (skips validation)", () => {
    expect(validateCountryCurrency("US", "USD")).toBeUndefined();
  });
});

// ============================================================================
// Region Map Tests
// ============================================================================

describe("AIRTEL_REGION_MAP", () => {
  it("contains all expected regions", () => {
    expect(Object.keys(AIRTEL_REGION_MAP)).toEqual(
      expect.arrayContaining(["central", "east", "west"]),
    );
  });

  it("East Africa region includes TZS and KES", () => {
    expect(AIRTEL_REGION_MAP.east.currencies).toContain("TZS");
    expect(AIRTEL_REGION_MAP.east.currencies).toContain("KES");
    expect(AIRTEL_REGION_MAP.east.countries).toContain("TZ");
    expect(AIRTEL_REGION_MAP.east.countries).toContain("KE");
  });

  it("Central Africa region includes XAF", () => {
    expect(AIRTEL_REGION_MAP.central.currencies).toContain("XAF");
    expect(AIRTEL_REGION_MAP.central.countries).toContain("CM");
  });
});
