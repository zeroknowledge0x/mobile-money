import { formatPhoneForProvider, validatePhoneProviderMatch } from "../phoneUtils";

describe("formatPhoneForProvider", () => {
  it("normalizes Airtel Cameroon numbers to national format", () => {
    expect(formatPhoneForProvider("+237670000000", "airtel")).toBe("670000000");
    expect(formatPhoneForProvider("237670000000", "airtel")).toBe("670000000");
    expect(formatPhoneForProvider("670000000", "airtel")).toBe("670000000");
  });

  it("keeps E.164 format for other providers", () => {
    expect(formatPhoneForProvider("+237670000000", "mtn")).toBe("+237670000000");
  });
});

describe("Tanzania provider validation", () => {
  it("validates Vodacom Tanzania prefixes (74x, 75x, 76x)", () => {
    expect(validatePhoneProviderMatch("+255740123456", "vodacom").valid).toBe(true);
    expect(validatePhoneProviderMatch("+255750999888", "vodacom").valid).toBe(true);
    expect(validatePhoneProviderMatch("+255760111222", "vodacom").valid).toBe(true);
    expect(validatePhoneProviderMatch("255740123456", "vodacom").valid).toBe(true);
    // Invalid: Tigo number rejected on Vodacom
    expect(validatePhoneProviderMatch("+255650123456", "vodacom").valid).toBe(false);
    expect(validatePhoneProviderMatch("+255690123456", "vodacom").valid).toBe(false);
    // Invalid: non-Tanzania prefix
    expect(validatePhoneProviderMatch("+256770123456", "vodacom").valid).toBe(false);
  });

  it("validates Tigo Tanzania prefixes (65x-69x)", () => {
    expect(validatePhoneProviderMatch("+255650123456", "tigo").valid).toBe(true);
    expect(validatePhoneProviderMatch("+255660123456", "tigo").valid).toBe(true);
    expect(validatePhoneProviderMatch("+255670123456", "tigo").valid).toBe(true);
    expect(validatePhoneProviderMatch("+255680123456", "tigo").valid).toBe(true);
    expect(validatePhoneProviderMatch("+255690123456", "tigo").valid).toBe(true);
    // Invalid: Vodacom number rejected on Tigo
    expect(validatePhoneProviderMatch("+255740123456", "tigo").valid).toBe(false);
  });

  it("formats Vodacom Tanzania numbers in E.164", () => {
    expect(formatPhoneForProvider("+255740123456", "vodacom")).toBe("+255740123456");
    expect(formatPhoneForProvider("255740123456", "vodacom")).toBe("+255740123456");
  });

  it("formats Tigo Tanzania numbers in E.164", () => {
    expect(formatPhoneForProvider("+255650123456", "tigo")).toBe("+255650123456");
  });
});
