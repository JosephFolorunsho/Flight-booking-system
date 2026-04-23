const validation = require("../../../src/utils/validation");

describe("Validation Utilities", () => {
  describe("validateEmail", () => {
    it("should accept valid emails", () => {
      expect(validation.validateEmail("test@example.com")).toBe(true);
      expect(validation.validateEmail("user+tag@domain.co.uk")).toBe(true);
    });

    it("should reject invalid emails", () => {
      expect(validation.validateEmail("not-an-email")).toBe(false);
      expect(validation.validateEmail("missing@domain")).toBe(false);
      expect(validation.validateEmail("")).toBe(false);
    });
  });

  describe("validatePrice", () => {
    it("should accept valid prices", () => {
      expect(validation.validatePrice(99.99)).toBe(true);
      expect(validation.validatePrice(0.01)).toBe(true);
    });

    it("should reject invalid prices", () => {
      expect(validation.validatePrice(0)).toBe(false);
      expect(validation.validatePrice(-100)).toBe(false);
      expect(validation.validatePrice("not-a-number")).toBe(false);
    });
  });

  describe("validateAirportCode", () => {
    it("should accept valid airport codes", () => {
      expect(validation.validateAirportCode("JFK")).toBe(true);
      expect(validation.validateAirportCode("LAX")).toBe(true);
      expect(validation.validateAirportCode("LHR")).toBe(true);
    });

    it("should reject invalid airport codes", () => {
      expect(validation.validateAirportCode("JFKK")).toBe(false);
      expect(validation.validateAirportCode("jfk")).toBe(false);
      expect(validation.validateAirportCode("J")).toBe(false);
    });
  });
});
