import {
  formatPhoneForProvider,
  validatePhoneProviderMatch,
  isTanzaniaNumber,
  validateTanzaniaPhoneNumber,
  validateTanzaniaProviderMatch,
  TANZANIA_PROVIDER_PREFIXES,
} from "../phoneUtils";

describe("formatPhoneForProvider", () => {
  it("normalizes Airtel Cameroon numbers to national format", () => {
    expect(formatPhoneForProvider("+237****0000", "airtel")).toBe("670000000");
    expect(formatPhoneForProvider("237670000000", "airtel")).toBe("670000000");
    expect(formatPhoneForProvider("670000000", "airtel")).toBe("670000000");
  });

  it("keeps E.164 format for other providers", () => {
    expect(formatPhoneForProvider("+237****0000", "mtn")).toBe("+237****0000");
  });
});

describe("phoneUtils", () => {
  describe("validatePhoneProviderMatch", () => {
    it("should validate MTN Uganda numbers", () => {
      const result = validatePhoneProviderMatch("+256****4567", "mtn");
      expect(result.valid).toBe(true);
    });

    it("should reject mismatched provider", () => {
      const result = validatePhoneProviderMatch("+256****4567", "airtel");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("does not belong to");
    });
  });

  describe("isTanzaniaNumber", () => {
    it("should identify Tanzania numbers with + prefix", () => {
      expect(isTanzaniaNumber("+255****4567")).toBe(true);
    });

    it("should identify Tanzania numbers without + prefix", () => {
      expect(isTanzaniaNumber("255751234567")).toBe(true);
    });

    it("should reject non-Tanzania numbers", () => {
      expect(isTanzaniaNumber("+256****4567")).toBe(false);
      expect(isTanzaniaNumber("+237****4567")).toBe(false);
    });
  });

  describe("validateTanzaniaPhoneNumber", () => {
    describe("Vodacom Tanzania", () => {
      const vodacomNumbers = [
        "+255****4567",
        "+255****4567",
        "+255****4567",
        "+255****4567",
      ];

      vodacomNumbers.forEach((phone) => {
        it(`should validate Vodacom number ${phone}`, () => {
          const result = validateTanzaniaPhoneNumber(phone);
          expect(result.valid).toBe(true);
          expect(result.operator).toBe("vodacom");
          expect(result.normalized).toBe(phone);
        });
      });
    });

    describe("Tigo (Mixx by Yas) Tanzania", () => {
      const tigoNumbers = ["+255****4567", "+255****4567", "+255****4567"];

      tigoNumbers.forEach((phone) => {
        it(`should validate Tigo number ${phone}`, () => {
          const result = validateTanzaniaPhoneNumber(phone);
          expect(result.valid).toBe(true);
          expect(result.operator).toBe("tigo");
        });
      });
    });

    describe("Airtel Tanzania", () => {
      const airtelNumbers = ["+255****4567", "+255****4567"];

      airtelNumbers.forEach((phone) => {
        it(`should validate Airtel number ${phone}`, () => {
          const result = validateTanzaniaPhoneNumber(phone);
          expect(result.valid).toBe(true);
          expect(result.operator).toBe("airtel");
        });
      });
    });

    describe("Halotel Tanzania", () => {
      const halotelNumbers = ["+255****4567", "+255****4567"];

      halotelNumbers.forEach((phone) => {
        it(`should validate Halotel number ${phone}`, () => {
          const result = validateTanzaniaPhoneNumber(phone);
          expect(result.valid).toBe(true);
          expect(result.operator).toBe("halotel");
        });
      });
    });

    describe("TTCL Tanzania", () => {
      it("should validate TTCL number", () => {
        const result = validateTanzaniaPhoneNumber("+255****4567");
        expect(result.valid).toBe(true);
        expect(result.operator).toBe("ttcl");
      });
    });

    describe("Local format", () => {
      it("should accept local format 0751234567", () => {
        const result = validateTanzaniaPhoneNumber("0751234567");
        expect(result.valid).toBe(true);
        expect(result.operator).toBe("vodacom");
        expect(result.normalized).toBe("+255****4567");
      });

      it("should accept local format 0681234567", () => {
        const result = validateTanzaniaPhoneNumber("0681234567");
        expect(result.valid).toBe(true);
        expect(result.operator).toBe("airtel");
        expect(result.normalized).toBe("+255****4567");
      });
    });

    describe("Error cases", () => {
      it("should reject numbers with invalid length (too short)", () => {
        const result = validateTanzaniaPhoneNumber("+255****2345");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("must be");
      });

      it("should reject numbers with invalid length (too long)", () => {
        const result = validateTanzaniaPhoneNumber("+255****7890");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("must be");
      });

      it("should reject non-numeric characters", () => {
        const result = validateTanzaniaPhoneNumber("+25575abc4567");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("only digits");
      });

      it("should reject numbers with invalid prefix", () => {
        const result = validateTanzaniaPhoneNumber("+255****4567");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("not a recognized");
      });

      it("should reject numbers with wrong country code", () => {
        const result = validateTanzaniaPhoneNumber("+256****4567");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Expected Tanzania country code");
      });
    });
  });

  describe("validateTanzaniaProviderMatch", () => {
    it("should match Vodacom number with vodacom provider", () => {
      const result = validateTanzaniaProviderMatch("+255****4567", "vodacom");
      expect(result.valid).toBe(true);
    });

    it("should match Airtel Tanzania number with airtel provider", () => {
      const result = validateTanzaniaProviderMatch("+255****4567", "airtel");
      expect(result.valid).toBe(true);
    });

    it("should match Tigo number with tigo provider", () => {
      const result = validateTanzaniaProviderMatch("+255****4567", "tigo");
      expect(result.valid).toBe(true);
    });

    it("should reject Vodacom number with airtel provider", () => {
      const result = validateTanzaniaProviderMatch("+255****4567", "airtel");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("VODACOM");
      expect(result.error).toContain("AIRTEL");
    });

    it("should reject Airtel Tanzania number with vodacom provider", () => {
      const result = validateTanzaniaProviderMatch("+255****4567", "vodacom");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("AIRTEL");
      expect(result.error).toContain("VODACOM");
    });

    it("should reject invalid Tanzania numbers", () => {
      const result = validateTanzaniaProviderMatch("+255****4567", "vodacom");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not a recognized");
    });

    it("should work with local format", () => {
      const result = validateTanzaniaProviderMatch("0751234567", "vodacom");
      expect(result.valid).toBe(true);
    });
  });

  describe("TANZANIA_PROVIDER_PREFIXES", () => {
    it("should have all expected operators", () => {
      expect(TANZANIA_PROVIDER_PREFIXES).toHaveProperty("vodacom");
      expect(TANZANIA_PROVIDER_PREFIXES).toHaveProperty("tigo");
      expect(TANZANIA_PROVIDER_PREFIXES).toHaveProperty("airtel");
      expect(TANZANIA_PROVIDER_PREFIXES).toHaveProperty("halotel");
      expect(TANZANIA_PROVIDER_PREFIXES).toHaveProperty("ttcl");
    });

    it("should have correct number of prefixes per operator", () => {
      expect(TANZANIA_PROVIDER_PREFIXES.vodacom).toHaveLength(4);
      expect(TANZANIA_PROVIDER_PREFIXES.tigo).toHaveLength(3);
      expect(TANZANIA_PROVIDER_PREFIXES.airtel).toHaveLength(2);
      expect(TANZANIA_PROVIDER_PREFIXES.halotel).toHaveLength(2);
      expect(TANZANIA_PROVIDER_PREFIXES.ttcl).toHaveLength(1);
    });
  });
});
