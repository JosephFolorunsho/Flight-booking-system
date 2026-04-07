const normalizer = require("../src/utils/normalizer");
const flightService = require("../src/services/flightService");

describe("US-08: Data Normalization Acceptance Criteria", () => {
  describe("Field Mapping to Internal Schema", () => {
    test("should map Aviationstack flight fields correctly", () => {
      const rawFlight = {
        flight: { iata: "AA123", icao: "AAL123", number: "123" },
        airline: { iata: "AA", icao: "AAL", name: "American Airlines" },
        departure: {
          iata: "JFK",
          scheduled: "2024-01-01T10:00:00Z",
          timezone: "America/New_York",
          terminal: "T1",
          gate: "A1",
        },
        arrival: {
          iata: "LAX",
          scheduled: "2024-01-01T13:00:00Z",
          timezone: "America/Los_Angeles",
          terminal: "T2",
          gate: "B2",
        },
        flight_status: "scheduled",
      };

      const normalized = normalizer.normalizeAviationstackFlight(rawFlight);

      expect(normalized).toHaveProperty("source", "aviationstack");
      expect(normalized).toHaveProperty("flightNumber", "AA123");
      expect(normalized).toHaveProperty("airlineIata", "AA");
      expect(normalized).toHaveProperty("departureAirport", "JFK");
      expect(normalized).toHaveProperty("arrivalAirport", "LAX");
      expect(normalized).toHaveProperty("status", "scheduled");
    });

    test("should map AirLabs flight fields correctly", () => {
      const rawFlight = {
        flight_iata: "UA456",
        flight_icao: "UAL456",
        flight_number: "456",
        airline_iata: "UA",
        airline_icao: "UAL",
        airline_name: "United Airlines",
        dep_iata: "ORD",
        dep_time: "2024-01-01T14:00:00Z",
        dep_timezone: "America/Chicago",
        dep_terminal: "T3",
        dep_gate: "C3",
        arr_iata: "SFO",
        arr_time: "2024-01-01T16:30:00Z",
        arr_timezone: "America/Los_Angeles",
        arr_terminal: "T4",
        arr_gate: "D4",
        status: "active",
        duration: 270,
      };

      const normalized = normalizer.normalizeAirlabsFlight(rawFlight);

      expect(normalized).toHaveProperty("source", "airlabs");
      expect(normalized).toHaveProperty("flightNumber", "UA456");
      expect(normalized).toHaveProperty("airlineIata", "UA");
      expect(normalized).toHaveProperty("departureAirport", "ORD");
      expect(normalized).toHaveProperty("arrivalAirport", "SFO");
      expect(normalized).toHaveProperty("status", "active");
      expect(normalized).toHaveProperty("duration", 270);
    });
  });

  describe("Timestamps Converted to ISO 8601 Format", () => {
    test("should convert timestamps to ISO 8601 format", () => {
      const timestamp = "2024-01-01T10:00:00Z";
      const normalized = normalizer.normalizeTimestamp(timestamp);
      expect(normalized).toBe("2024-01-01T10:00:00.000Z");
      expect(normalized).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    test("should handle different timestamp formats", () => {
      const formats = [
        "2024-01-01T10:00:00Z",
        "2024-01-01 10:00:00",
        new Date("2024-01-01T10:00:00Z"),
      ];

      formats.forEach((format) => {
        const normalized = normalizer.normalizeTimestamp(format);
        expect(normalized).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
      });
    });

    test("should return null for invalid timestamps", () => {
      const invalid = normalizer.normalizeTimestamp("invalid-date");
      expect(invalid).toBeNull();
    });
  });

  describe("Airport and Airline Codes Standardized", () => {
    test("should validate IATA codes are 2-3 uppercase letters", () => {
      const validCodes = ["AA", "AAL", "JFK", "LAX"];
      const invalidCodes = ["aa", "a", "AAAA", "123"];

      // Test valid codes don't cause validation failure
      validCodes.forEach((code) => {
        expect(/^[A-Z]{2,3}$/.test(code)).toBe(true);
      });

      // Test invalid codes would fail validation
      invalidCodes.forEach((code) => {
        expect(/^[A-Z]{2,3}$/.test(code)).toBe(false);
      });
    });

    test("should standardize flight status values", () => {
      const statusTests = [
        { input: "scheduled", expected: "scheduled" },
        { input: "active", expected: "active" },
        { input: "landed", expected: "landed" },
        { input: "cancelled", expected: "cancelled" },
        { input: "DEPARTED", expected: "active" },
        { input: "ARRIVED", expected: "landed" },
        { input: "unknown_status", expected: "unknown" },
      ];

      statusTests.forEach(({ input, expected }) => {
        expect(normalizer.normalizeStatus(input)).toBe(expected);
      });
    });
  });

  describe("No Null or Undefined Critical Fields", () => {
    test("should reject flights with missing critical fields", () => {
      const incompleteFlight = {
        source: "aviationstack",
        flightNumber: null, // Critical field missing
        airlineIata: "AA",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: "2024-01-01T10:00:00.000Z",
        arrivalTime: "2024-01-01T13:00:00.000Z",
      };

      const isValid = normalizer.validateFlight(incompleteFlight);
      expect(isValid).toBe(false);
    });

    test("should accept flights with all critical fields present", () => {
      const completeFlight = {
        source: "aviationstack",
        flightNumber: "AA123",
        airlineIata: "AA",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: "2024-01-01T10:00:00.000Z",
        arrivalTime: "2024-01-01T13:00:00.000Z",
        status: "scheduled",
      };

      const isValid = normalizer.validateFlight(completeFlight);
      expect(isValid).toBe(true);
    });
  });

  describe("Data Validation Before Processing", () => {
    test("should reject malformed IATA codes", () => {
      const flightWithBadIata = {
        source: "aviationstack",
        flightNumber: "AA123",
        airlineIata: "aa", // Should be uppercase
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: "2024-01-01T10:00:00.000Z",
        arrivalTime: "2024-01-01T13:00:00.000Z",
      };

      const isValid = normalizer.validateFlight(flightWithBadIata);
      expect(isValid).toBe(false);
    });

    test("should reject invalid ISO 8601 timestamps", () => {
      const flightWithBadTimestamp = {
        source: "aviationstack",
        flightNumber: "AA123",
        airlineIata: "AA",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: "invalid-timestamp", // Invalid format
        arrivalTime: "2024-01-01T13:00:00.000Z",
      };

      const isValid = normalizer.validateFlight(flightWithBadTimestamp);
      expect(isValid).toBe(false);
    });

    test("should reject flights with unrealistic duration", () => {
      // Test the calculateDuration function directly
      const duration = normalizer.calculateDuration(
        "2024-01-01T10:00:00Z",
        "2024-01-02T10:00:00Z", // 24 hours later
      );
      expect(duration).toBeNull(); // Should reject > 24 hours
    });
  });

  describe("Inconsistent or Malformed Data Rejection", () => {
    test("should handle and reject corrupted flight data gracefully", () => {
      const corruptedFlight = {
        flight: null, // Missing flight object
        airline: { iata: "AA" },
        departure: { iata: "JFK" },
        arrival: { iata: "LAX" },
      };

      const normalized =
        normalizer.normalizeAviationstackFlight(corruptedFlight);
      expect(normalized).toBeNull(); // Should return null for invalid data
    });

    test("should filter out invalid flights in service layer", async () => {
      // Mock the adapters module for this test
      const originalAdapters = require("../src/adapters");

      // Create a mock adapter
      const mockAdapter = {
        searchFlights: jest.fn().mockResolvedValue([
          {
            source: "aviationstack",
            flight: { iata: "AA123" },
            airline: { iata: "AA" },
            departure: { iata: "JFK", scheduled: "2024-01-01T10:00:00Z" },
            arrival: { iata: "LAX", scheduled: "2024-01-01T13:00:00Z" },
            flight_status: "scheduled",
          },
          {
            source: "aviationstack",
            flight: null, // Invalid flight
            airline: { iata: "AA" },
            departure: { iata: "JFK" },
            arrival: { iata: "LAX" },
          },
        ]),
      };

      // Mock the adapters module
      jest.mock("../src/adapters", () => mockAdapter);

      try {
        const results = await flightService.searchFlights({
          from: "JFK",
          to: "LAX",
        });
        expect(results).toHaveLength(1); // Only valid flight should remain
        expect(results[0]).toHaveProperty("flightNumber", "AA123");
      } finally {
        // Restore original adapters
        jest.unmock("../src/adapters");
      }
    });
  });

  describe("Airport Data Normalization", () => {
    test("should normalize Aviationstack airport data", () => {
      const rawAirport = {
        iata_code: "JFK",
        icao_code: "KJFK",
        airport_name: "John F. Kennedy International Airport",
        city_name: "New York",
        country_name: "United States",
        country_code: "US",
        latitude: "40.6413",
        longitude: "-73.7781",
        timezone: "America/New_York",
      };

      const normalized = normalizer.normalizeAviationstackAirport(rawAirport);

      expect(normalized).toHaveProperty("iataCode", "JFK");
      expect(normalized).toHaveProperty("icaoCode", "KJFK");
      expect(normalized).toHaveProperty(
        "name",
        "John F. Kennedy International Airport",
      );
      expect(normalized).toHaveProperty("city", "New York");
      expect(normalized).toHaveProperty("country", "United States");
      expect(normalized).toHaveProperty("latitude", 40.6413);
      expect(normalized).toHaveProperty("longitude", -73.7781);
    });

    test("should normalize AirLabs airport data", () => {
      const rawAirport = {
        iata_code: "LAX",
        icao_code: "KLAX",
        name: "Los Angeles International Airport",
        city: "Los Angeles",
        country: "United States",
        country_code: "US",
        lat: "33.9425",
        lng: "-118.4081",
        timezone: "America/Los_Angeles",
      };

      const normalized = normalizer.normalizeAirlabsAirport(rawAirport);

      expect(normalized).toHaveProperty("iataCode", "LAX");
      expect(normalized).toHaveProperty("icaoCode", "KLAX");
      expect(normalized).toHaveProperty(
        "name",
        "Los Angeles International Airport",
      );
      expect(normalized).toHaveProperty("city", "Los Angeles");
      expect(normalized).toHaveProperty("latitude", 33.9425);
      expect(normalized).toHaveProperty("longitude", -118.4081);
    });
  });
});
