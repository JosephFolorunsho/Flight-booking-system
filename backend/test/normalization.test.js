const normalizer = require("../src/utils/normalizer");

describe("US-08: Data Normalization Acceptance Criteria", () => {
  describe("Field Mapping to Internal Schema", () => {
    test("should map Aviationstack fields using actual normalizer output shape", () => {
      const rawFlight = {
        flight: { iata: "AA123", icao: "AAL123", number: "123" },
        airline: { iata: "AA", icao: "AAL", name: "American Airlines" },
        departure: {
          iata: "JFK",
          scheduled: "2026-04-15T10:00:00Z",
          timezone: "America/New_York",
          terminal: "T1",
          gate: "A1",
        },
        arrival: {
          iata: "LAX",
          scheduled: "2026-04-15T13:00:00Z",
          timezone: "America/Los_Angeles",
          terminal: "T2",
          gate: "B2",
        },
        flight_status: "scheduled",
      };

      const normalized = normalizer.normalizeAviationstackFlight(rawFlight);

      expect(normalized).toEqual(
        expect.objectContaining({
          source: "aviationstack",
          // current implementation keeps flight.number as flightNumber
          flightNumber: "123",
          flightIcao: "AAL123",
          airlineIata: "AA",
          departureAirport: "JFK",
          arrivalAirport: "LAX",
          status: "scheduled",
          duration: 180,
        }),
      );
      expect(normalized).toHaveProperty("rawData");
      expect(normalized).toHaveProperty("fetchedAt");
    });

    test("should map AirLabs fields using actual normalizer output shape", () => {
      const rawFlight = {
        flight_iata: "UA456",
        flight_icao: "UAL456",
        flight_number: "456",
        airline_iata: "UA",
        airline_icao: "UAL",
        airline_name: "United Airlines",
        dep_iata: "ORD",
        dep_time: "2026-04-15T14:00:00Z",
        dep_timezone: "America/Chicago",
        dep_terminal: "T3",
        dep_gate: "C3",
        arr_iata: "SFO",
        arr_time: "2026-04-15T16:30:00Z",
        arr_timezone: "America/Los_Angeles",
        arr_terminal: "T4",
        arr_gate: "D4",
        status: "active",
        duration: 150,
      };

      const normalized = normalizer.normalizeAirlabsFlight(rawFlight);

      expect(normalized).toEqual(
        expect.objectContaining({
          source: "airlabs",
          // current implementation keeps flight_number as flightNumber
          flightNumber: "456",
          flightIcao: "UAL456",
          airlineIata: "UA",
          departureAirport: "ORD",
          arrivalAirport: "SFO",
          status: "active",
          duration: 150,
        }),
      );
    });
  });

  describe("Timestamps Converted to ISO 8601 Format", () => {
    test("should convert valid timestamp to ISO 8601", () => {
      expect(normalizer.normalizeTimestamp("2026-04-15T10:00:00Z")).toBe(
        "2026-04-15T10:00:00.000Z",
      );
    });

    test("should return null for invalid timestamp", () => {
      expect(normalizer.normalizeTimestamp("invalid-date")).toBeNull();
    });

    test("should return null for null/undefined timestamp", () => {
      expect(normalizer.normalizeTimestamp(null)).toBeNull();
      expect(normalizer.normalizeTimestamp(undefined)).toBeNull();
    });
  });

  describe("Airport and Airline Codes Standardized", () => {
    test("should accept valid IATA codes in validation", () => {
      const validFlight = {
        flightNumber: "123",
        airlineIata: "AA",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: "2026-04-15T10:00:00.000Z",
        arrivalTime: "2026-04-15T13:00:00.000Z",
      };

      expect(normalizer.validateFlight(validFlight)).toBe(true);
    });

    test("should reject malformed IATA codes in validation", () => {
      const invalidFlight = {
        flightNumber: "123",
        airlineIata: "aa",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: "2026-04-15T10:00:00.000Z",
        arrivalTime: "2026-04-15T13:00:00.000Z",
      };

      expect(normalizer.validateFlight(invalidFlight)).toBe(false);
    });

    test("should standardize status values", () => {
      expect(normalizer.normalizeStatus("DEPARTED")).toBe("active");
      expect(normalizer.normalizeStatus("ARRIVED")).toBe("landed");
      expect(normalizer.normalizeStatus("unknown_status")).toBe("unknown");
    });
  });

  describe("No Null or Undefined Critical Fields", () => {
    test("should reject flights with missing critical fields", () => {
      const incompleteFlight = {
        flightNumber: null,
        airlineIata: "AA",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: "2026-04-15T10:00:00.000Z",
        arrivalTime: "2026-04-15T13:00:00.000Z",
      };

      expect(normalizer.validateFlight(incompleteFlight)).toBe(false);
    });

    test("should accept flights with all critical fields present", () => {
      const completeFlight = {
        flightNumber: "123",
        airlineIata: "AA",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: "2026-04-15T10:00:00.000Z",
        arrivalTime: "2026-04-15T13:00:00.000Z",
      };

      expect(normalizer.validateFlight(completeFlight)).toBe(true);
    });
  });

  describe("Data Validation and Duration Handling", () => {
    test("should reject invalid ISO 8601 timestamps", () => {
      const badTimestampFlight = {
        flightNumber: "123",
        airlineIata: "AA",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: "invalid-timestamp",
        arrivalTime: "2026-04-15T13:00:00.000Z",
      };

      expect(normalizer.validateFlight(badTimestampFlight)).toBe(false);
    });

    test("should return null for negative duration", () => {
      expect(
        normalizer.calculateDuration(
          "2026-04-15T13:00:00Z",
          "2026-04-15T10:00:00Z",
        ),
      ).toBeNull();
    });

    test("should allow exactly 24 hours and reject over 24 hours", () => {
      expect(
        normalizer.calculateDuration(
          "2026-04-15T10:00:00Z",
          "2026-04-16T10:00:00Z",
        ),
      ).toBe(1440);

      expect(
        normalizer.calculateDuration(
          "2026-04-15T10:00:00Z",
          "2026-04-16T10:01:00Z",
        ),
      ).toBeNull();
    });
  });

  describe("Malformed Data Rejection", () => {
    test("should return null for corrupted Aviationstack data", () => {
      const corrupted = {
        flight: null,
        airline: { iata: "AA" },
        departure: { iata: "JFK" },
        arrival: { iata: "LAX" },
      };

      expect(normalizer.normalizeAviationstackFlight(corrupted)).toBeNull();
    });

    test("should return null for corrupted AirLabs data", () => {
      const corrupted = {
        flight_number: "123",
        airline_iata: "AA",
        dep_iata: "JFK",
        // missing arr_iata and timestamps required for validation
      };

      expect(normalizer.normalizeAirlabsFlight(corrupted)).toBeNull();
    });
  });

  describe("Airport Data Normalization", () => {
    test("should normalize Aviationstack airport data", () => {
      const normalized = normalizer.normalizeAviationstackAirport({
        iata_code: "JFK",
        icao_code: "KJFK",
        airport_name: "John F. Kennedy International Airport",
        city_name: "New York",
        country_name: "United States",
        country_code: "US",
        latitude: "40.6413",
        longitude: "-73.7781",
        timezone: "America/New_York",
      });

      expect(normalized).toEqual(
        expect.objectContaining({
          iataCode: "JFK",
          icaoCode: "KJFK",
          city: "New York",
          latitude: 40.6413,
          longitude: -73.7781,
          source: "aviationstack",
        }),
      );
    });

    test("should normalize AirLabs airport data", () => {
      const normalized = normalizer.normalizeAirlabsAirport({
        iata_code: "LAX",
        icao_code: "KLAX",
        name: "Los Angeles International Airport",
        city: "Los Angeles",
        country: "United States",
        country_code: "US",
        lat: "33.9425",
        lng: "-118.4081",
        timezone: "America/Los_Angeles",
      });

      expect(normalized).toEqual(
        expect.objectContaining({
          iataCode: "LAX",
          icaoCode: "KLAX",
          city: "Los Angeles",
          latitude: 33.9425,
          longitude: -118.4081,
          source: "airlabs",
        }),
      );
    });
  });
});
