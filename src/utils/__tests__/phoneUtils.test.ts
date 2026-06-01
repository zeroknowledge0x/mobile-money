import { formatPhoneForProvider, validatePhoneProviderMatch } from "../phoneUtils";

describe("formatPhoneForProvider", () => {
  it("normalizes Airtel Cameroon numbers to national format", () => {
    expect(formatPhoneForProvider("+237****0000", "airtel")).toBe("670000000");
    expect(formatPhoneForProvider("237670000000", "airtel")).toBe("670000000");
    expect(formatPhoneForProvider("670000000", "airtel")).toBe("670000000");
  });

  it("keeps E.164 format for other providers", () => {
    expect(formatPhoneForProvider("+237****0000", "mtn")).toBe("+237****0000");
  });

  it("formats Tanzania Tigo numbers to E.164", () => {
    expect(formatPhoneForProvider("+25565123456", "tigo")).toBe("+25565123456");
    expect(formatPhoneForProvider("25565123456", "tigo")).toBe("+25565123456");
    expect(formatPhoneForProvider("065123456", "tigo")).toBe("+25565123456");
  });

  it("formats Tanzania Vodacom numbers to E.164", () => {
    expect(formatPhoneForProvider("+25574123456", "vodacom")).toBe("+25574123456");
    expect(formatPhoneForProvider("25574123456", "vodacom")).toBe("+25574123456");
    expect(formatPhoneForProvider("074123456", "vodacom")).toBe("+25574123456");
  });
});

describe("validatePhoneProviderMatch", () => {
  it("validates MTN Cameroon prefixes", () => {
    expect(validatePhoneProviderMatch("+237670000000", "mtn")).toEqual({ valid: true });
    expect(validatePhoneProviderMatch("+237680000000", "mtn")).toEqual({ valid: true });
    expect(validatePhoneProviderMatch("+237660000000", "mtn")).toEqual({
      valid: false,
      error: "Phone number +237660000000 does not belong to the MTN network.",
    });
  });

  it("validates Airtel Cameroon prefixes", () => {
    expect(validatePhoneProviderMatch("+237660000000", "airtel")).toEqual({ valid: true });
    expect(validatePhoneProviderMatch("+237670000000", "airtel")).toEqual({
      valid: false,
      error: "Phone number +237670000000 does not belong to the AIRTEL network.",
    });
  });

  it("validates Tanzania Tigo prefixes", () => {
    // Tigo Tanzania: 065x, 067x, 071x
    expect(validatePhoneProviderMatch("+25565123456", "tigo")).toEqual({ valid: true });
    expect(validatePhoneProviderMatch("+25567123456", "tigo")).toEqual({ valid: true });
    expect(validatePhoneProviderMatch("+25571123456", "tigo")).toEqual({ valid: true });
    // Should reject Vodacom numbers
    expect(validatePhoneProviderMatch("+25574123456", "tigo")).toEqual({
      valid: false,
      error: "Phone number +25574123456 does not belong to the TIGO network.",
    });
  });

  it("validates Tanzania Vodacom prefixes", () => {
    // Vodacom Tanzania: 074x, 075x, 076x
    expect(validatePhoneProviderMatch("+25574123456", "vodacom")).toEqual({ valid: true });
    expect(validatePhoneProviderMatch("+25575123456", "vodacom")).toEqual({ valid: true });
    expect(validatePhoneProviderMatch("+25576123456", "vodacom")).toEqual({ valid: true });
    // Should reject Tigo numbers
    expect(validatePhoneProviderMatch("+25565123456", "vodacom")).toEqual({
      valid: false,
      error: "Phone number +25565123456 does not belong to the VODACOM network.",
    });
  });

  it("rejects unsupported providers", () => {
    expect(validatePhoneProviderMatch("+25565123456", "unknown")).toEqual({
      valid: false,
      error: "Unsupported provider: unknown",
    });
  });
});
