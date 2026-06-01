/**
 * GeoIP-Based API Routing Worker — Unit Tests
 *
 * Tests region resolution, continent mapping, config parsing,
 * and edge cases.
 */

// ---------------------------------------------------------------------------
// Helper functions (mirrors src/index.ts logic)
// ---------------------------------------------------------------------------

const CONTINENT_MAP: Record<string, string> = {
  US: "NA", CA: "NA", MX: "NA",
  GB: "EU", DE: "EU", FR: "EU", IT: "EU", ES: "EU", NL: "EU",
  JP: "AS", CN: "AS", KR: "AS", IN: "AS", SG: "AS",
  BR: "SA", AR: "SA", CL: "SA", CO: "SA",
  AU: "OC", NZ: "OC",
  NG: "AF", ZA: "AF", KE: "AF",
  AE: "ME", SA: "ME", IL: "ME", TR: "ME",
};

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

function parseRegionMap(json?: string): Record<string, string> {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("resolveRegion", () => {
  const regionMap = {
    US: "https://us.api.example.com",
    EU: "https://eu.api.example.com",
    AS: "https://as.api.example.com",
    DEFAULT: "https://api.example.com",
  };

  it("matches direct country code", () => {
    const result = resolveRegion("US", regionMap);
    expect(result).toEqual({ url: "https://us.api.example.com", region: "US" });
  });

  it("matches continent when country not in map", () => {
    // DE is not in regionMap directly, but maps to EU continent
    const result = resolveRegion("DE", regionMap);
    expect(result).toEqual({ url: "https://eu.api.example.com", region: "EU" });
  });

  it("matches continent for Asian countries", () => {
    const result = resolveRegion("JP", regionMap);
    expect(result).toEqual({ url: "https://as.api.example.com", region: "AS" });
  });

  it("falls back to DEFAULT when no country/continent match", () => {
    const result = resolveRegion("XX", regionMap);
    expect(result).toEqual({ url: "https://api.example.com", region: "DEFAULT" });
  });

  it("returns null when no match and no DEFAULT", () => {
    const noDefault = { US: "https://us.api.example.com" };
    expect(resolveRegion("XX", noDefault)).toBeNull();
  });

  it("prefers direct country match over continent", () => {
    const mapWithCountry = {
      DE: "https://de.api.example.com",
      EU: "https://eu.api.example.com",
    };
    const result = resolveRegion("DE", mapWithCountry);
    expect(result).toEqual({ url: "https://de.api.example.com", region: "DE" });
  });

  it("handles empty region map", () => {
    expect(resolveRegion("US", {})).toBeNull();
  });

  it("resolves South American countries", () => {
    const result = resolveRegion("BR", regionMap);
    // BR maps to SA continent, but SA is not in regionMap, so falls to DEFAULT
    expect(result).toEqual({ url: "https://api.example.com", region: "DEFAULT" });
  });

  it("resolves African countries", () => {
    const mapWithAf = { ...regionMap, AF: "https://af.api.example.com" };
    const result = resolveRegion("NG", mapWithAf);
    expect(result).toEqual({ url: "https://af.api.example.com", region: "AF" });
  });

  it("resolves Middle Eastern countries", () => {
    const mapWithMe = { ...regionMap, ME: "https://me.api.example.com" };
    const result = resolveRegion("AE", mapWithMe);
    expect(result).toEqual({ url: "https://me.api.example.com", region: "ME" });
  });

  it("resolves Oceanian countries", () => {
    const mapWithOc = { ...regionMap, OC: "https://oc.api.example.com" };
    const result = resolveRegion("AU", mapWithOc);
    expect(result).toEqual({ url: "https://oc.api.example.com", region: "OC" });
  });
});

describe("parseRegionMap", () => {
  it("parses valid JSON", () => {
    const json = '{"US":"https://us.api.com","EU":"https://eu.api.com"}';
    expect(parseRegionMap(json)).toEqual({
      US: "https://us.api.com",
      EU: "https://eu.api.com",
    });
  });

  it("returns empty object for undefined", () => {
    expect(parseRegionMap(undefined)).toEqual({});
  });

  it("returns empty object for invalid JSON", () => {
    expect(parseRegionMap("not-json")).toEqual({});
    expect(parseRegionMap("")).toEqual({});
  });

  it("handles DEFAULT key", () => {
    const json = '{"DEFAULT":"https://api.example.com"}';
    expect(parseRegionMap(json)).toEqual({ DEFAULT: "https://api.example.com" });
  });
});
