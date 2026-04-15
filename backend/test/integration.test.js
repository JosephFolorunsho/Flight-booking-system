/**
 * SkyRoute Integration Test Suite (updated to match actual implementation)
 * Total tests: 21
 */

jest.mock("axios");
jest.mock("../src/utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const express = require("express");
const request = require("supertest");
const axios = require("axios");

process.env.NODE_ENV = "test";
process.env.AVIATIONSTACK_API_KEY = "test_aviationstack_key";
process.env.AIRLABS_API_KEY = "test_airlabs_key";

const mockAviationstackResponse = {
  data: {
    data: [
      {
        flight: { iata: "BA115" },
        airline: { name: "British Airways", iata: "BA" },
        departure: { iata: "LHR", scheduled: "2026-04-15T08:00:00+00:00" },
        arrival: { iata: "JFK", scheduled: "2026-04-15T11:30:00-04:00" },
        flight_status: "scheduled",
      },
    ],
  },
};

const mockAirlabsResponse = {
  data: {
    response: [
      {
        flight_iata: "AA100",
        airline_iata: "AA",
        dep_iata: "LHR",
        arr_iata: "JFK",
        dep_time: "2026-04-15T09:00:00Z",
        arr_time: "2026-04-15T12:00:00Z",
        status: "scheduled",
      },
    ],
  },
};

// ============================================
// 1) Adapter Tests (5)
// ============================================
describe("Adapter Layer", () => {
  const aviationstackAdapter = require("../src/adapters/aviationstackAdapter");
  const airlabsAdapter = require("../src/adapters/airlabsAdapter");

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AVIATIONSTACK_API_KEY = "test_aviationstack_key";
    process.env.AIRLABS_API_KEY = "test_airlabs_key";
  });

  test("1. Aviationstack adapter returns mapped flight rows with source", async () => {
    axios.get.mockResolvedValueOnce(mockAviationstackResponse);

    const flights = await aviationstackAdapter.fetchFlights("LHR", "JFK");

    expect(flights).toHaveLength(1);
    expect(flights[0]).toEqual(
      expect.objectContaining({
        source: "aviationstack",
        flight_number: "BA115",
        origin: "LHR",
        destination: "JFK",
      }),
    );
  });

  test("2. AirLabs adapter returns mapped flight rows with source", async () => {
    axios.get.mockResolvedValueOnce(mockAirlabsResponse);

    const flights = await airlabsAdapter.fetchFlights("LHR", "JFK");

    expect(flights).toHaveLength(1);
    expect(flights[0]).toEqual(
      expect.objectContaining({
        source: "airlabs",
        flight_number: "AA100",
        origin: "LHR",
        destination: "JFK",
      }),
    );
  });

  test("3. Aviationstack adapter returns [] on API failure", async () => {
    axios.get.mockRejectedValueOnce(new Error("403 Forbidden"));
    await expect(aviationstackAdapter.fetchFlights("LHR", "JFK")).resolves.toEqual(
      [],
    );
  });

  test("4. AirLabs adapter returns [] on API failure", async () => {
    axios.get.mockRejectedValueOnce(new Error("Network Error"));
    await expect(airlabsAdapter.fetchFlights("LHR", "JFK")).resolves.toEqual([]);
  });

  test("5. Adapters return [] when API keys are missing", async () => {
    const apiConfig = require("../src/config/apiConfig");
    const oldAv = apiConfig.aviationstack.apiKey;
    const oldAl = apiConfig.airlabs.apiKey;

    apiConfig.aviationstack.apiKey = "";
    apiConfig.airlabs.apiKey = "";

    const [avFlights, alFlights] = await Promise.all([
      aviationstackAdapter.fetchFlights("LHR", "JFK"),
      airlabsAdapter.fetchFlights("LHR", "JFK"),
    ]);

    expect(avFlights).toEqual([]);
    expect(alFlights).toEqual([]);

    apiConfig.aviationstack.apiKey = oldAv;
    apiConfig.airlabs.apiKey = oldAl;
  });
});

// ============================================
// 2) Normalizer Tests (6)
// ============================================
describe("Normalizer Utilities", () => {
  const normalizer = require("../src/utils/normalizer");

  test("6. normalizeAviationstackFlight maps valid record", () => {
    const result = normalizer.normalizeAviationstackFlight({
      source: "aviationstack",
      flight: { iata: "BA115", number: "115", icao: "BAW115" },
      airline: { name: "British Airways", iata: "BA", icao: "BAW" },
      departure: { iata: "LHR", scheduled: "2026-04-15T08:00:00Z" },
      arrival: { iata: "JFK", scheduled: "2026-04-15T15:30:00Z" },
      flight_status: "scheduled",
    });

    expect(result).not.toBeNull();
    expect(result).toEqual(
      expect.objectContaining({
        source: "aviationstack",
        flightNumber: "115",
        departureAirport: "LHR",
        arrivalAirport: "JFK",
      }),
    );
  });

  test("7. normalizeAirlabsFlight maps valid record", () => {
    const result = normalizer.normalizeAirlabsFlight({
      source: "airlabs",
      flight_iata: "AA100",
      flight_number: "100",
      airline_iata: "AA",
      dep_iata: "LHR",
      arr_iata: "JFK",
      dep_time: "2026-04-15T09:00:00Z",
      arr_time: "2026-04-15T12:00:00Z",
      status: "scheduled",
    });

    expect(result).not.toBeNull();
    expect(result).toEqual(
      expect.objectContaining({
        source: "airlabs",
        flightNumber: "100",
        airlineIata: "AA",
      }),
    );
  });

  test("8. normalizeTimestamp handles valid and invalid values", () => {
    expect(normalizer.normalizeTimestamp("2026-04-15T08:00:00Z")).toBe(
      "2026-04-15T08:00:00.000Z",
    );
    expect(normalizer.normalizeTimestamp("bad-date")).toBeNull();
  });

  test("9. normalizeStatus maps aliases to internal values", () => {
    expect(normalizer.normalizeStatus("departed")).toBe("active");
    expect(normalizer.normalizeStatus("arrived")).toBe("landed");
    expect(normalizer.normalizeStatus("unknown-anything")).toBe("unknown");
  });

  test("10. calculateDuration returns minutes and rejects >24h", () => {
    expect(
      normalizer.calculateDuration(
        "2026-04-15T08:00:00Z",
        "2026-04-15T10:30:00Z",
      ),
    ).toBe(150);

    expect(
      normalizer.calculateDuration(
        "2026-04-15T08:00:00Z",
        "2026-04-16T08:01:00Z",
      ),
    ).toBeNull();
  });

  test("11. validateFlight accepts complete record and rejects malformed IATA", () => {
    expect(
      normalizer.validateFlight({
        flightNumber: "115",
        airlineIata: "BA",
        departureAirport: "LHR",
        arrivalAirport: "JFK",
        departureTime: "2026-04-15T08:00:00.000Z",
        arrivalTime: "2026-04-15T15:30:00.000Z",
      }),
    ).toBe(true);

    expect(
      normalizer.validateFlight({
        flightNumber: "115",
        airlineIata: "ba",
        departureAirport: "LHR",
        arrivalAirport: "JFK",
        departureTime: "2026-04-15T08:00:00.000Z",
        arrivalTime: "2026-04-15T15:30:00.000Z",
      }),
    ).toBe(false);
  });
});

// ============================================
// 3) Flight Service Orchestration Tests (5)
// ============================================
describe("Flight Service", () => {
  const loadFlightService = ({
    cacheGet = jest.fn(),
    cacheSet = jest.fn(),
    cacheKey = "LHR_JFK_2026-04-15",
    adapterResult = [],
    adapterReject = null,
    normalizeAv = (f) => f,
    normalizeAl = (f) => f,
  } = {}) => {
    jest.resetModules();

    const adaptersSearchFlights = adapterReject
      ? jest.fn().mockRejectedValue(adapterReject)
      : jest.fn().mockResolvedValue(adapterResult);

    jest.doMock("../src/adapters", () => ({
      searchFlights: adaptersSearchFlights,
    }));

    jest.doMock("../src/utils/normalizer", () => ({
      normalizeAviationstackFlight: jest.fn(normalizeAv),
      normalizeAirlabsFlight: jest.fn(normalizeAl),
    }));

    // Virtual mock because source file uses ./cacheService, but implementation file is cacheservice.js
    jest.doMock(
      "../src/services/cacheService",
      () => ({
        get: cacheGet,
        set: cacheSet,
        generateCacheKey: jest.fn(() => cacheKey),
        pool: { query: jest.fn().mockResolvedValue({ rows: [] }) },
      }),
      { virtual: true },
    );

    const flightService = require("../src/services/flightService");

    return { flightService, adaptersSearchFlights, cacheGet, cacheSet };
  };

  test("12. returns cached data immediately on cache hit", async () => {
    const cached = [{ flightNumber: "BA115" }];
    const { flightService, adaptersSearchFlights, cacheSet } = loadFlightService({
      cacheGet: jest.fn().mockResolvedValue(cached),
    });

    const result = await flightService.searchFlights({
      origin: "LHR",
      destination: "JFK",
      date: "2026-04-15",
    });

    expect(result).toEqual(cached);
    expect(adaptersSearchFlights).not.toHaveBeenCalled();
    expect(cacheSet).not.toHaveBeenCalled();
  });

  test("13. normalizes aviationstack + airlabs results on cache miss", async () => {
    const rawFlights = [
      { source: "aviationstack", id: 1 },
      { source: "airlabs", id: 2 },
    ];
    const { flightService, cacheSet } = loadFlightService({
      cacheGet: jest.fn().mockResolvedValue(null),
      cacheSet: jest.fn().mockResolvedValue(true),
      adapterResult: rawFlights,
      normalizeAv: (f) => ({ flightNumber: `AV-${f.id}` }),
      normalizeAl: (f) => ({ flightNumber: `AL-${f.id}` }),
    });

    const result = await flightService.searchFlights({ origin: "LHR", destination: "JFK" });

    expect(result).toEqual([{ flightNumber: "AV-1" }, { flightNumber: "AL-2" }]);
    expect(cacheSet).toHaveBeenCalledTimes(1);
  });

  test("14. filters out null normalized entries", async () => {
    const { flightService } = loadFlightService({
      cacheGet: jest.fn().mockResolvedValue(null),
      adapterResult: [
        { source: "aviationstack", id: 1 },
        { source: "airlabs", id: 2 },
      ],
      normalizeAv: () => null,
      normalizeAl: () => ({ flightNumber: "AL-2" }),
    });

    const result = await flightService.searchFlights({ origin: "LHR", destination: "JFK" });

    expect(result).toEqual([{ flightNumber: "AL-2" }]);
  });

  test("15. does not write to cache when normalized list is empty", async () => {
    const cacheSet = jest.fn();
    const { flightService } = loadFlightService({
      cacheGet: jest.fn().mockResolvedValue(null),
      cacheSet,
      adapterResult: [{ source: "aviationstack", id: 1 }],
      normalizeAv: () => null,
    });

    const result = await flightService.searchFlights({ origin: "LHR", destination: "JFK" });

    expect(result).toEqual([]);
    expect(cacheSet).not.toHaveBeenCalled();
  });

  test("16. uses cache fallback query when adapters throw", async () => {
    const fallbackRows = [{ response_data: [{ flightNumber: "FALLBACK" }] }];

    const cacheGet = jest.fn().mockResolvedValue(null);
    const cacheSet = jest.fn();
    const fallbackQuery = jest.fn().mockResolvedValue({ rows: fallbackRows });

    const { flightService } = (() => {
      jest.resetModules();

      jest.doMock("../src/adapters", () => ({
        searchFlights: jest.fn().mockRejectedValue(new Error("api down")),
      }));
      jest.doMock("../src/utils/normalizer", () => ({
        normalizeAviationstackFlight: jest.fn(),
        normalizeAirlabsFlight: jest.fn(),
      }));
      jest.doMock(
        "../src/services/cacheService",
        () => ({
          get: cacheGet,
          set: cacheSet,
          generateCacheKey: jest.fn(() => "LHR_JFK_ANY"),
          pool: { query: fallbackQuery },
        }),
        { virtual: true },
      );

      return { flightService: require("../src/services/flightService") };
    })();

    const result = await flightService.searchFlights({ origin: "LHR", destination: "JFK" });

    expect(result).toEqual([{ flightNumber: "FALLBACK" }]);
    expect(fallbackQuery).toHaveBeenCalled();
  });
});

// ============================================
// 4) Controller Tests (3)
// ============================================
describe("Flight Controller", () => {
  let controller;
  let flightService;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock("../src/services/flightService", () => ({
      searchFlights: jest.fn(),
    }));
    controller = require("../src/controllers/flightController");
    flightService = require("../src/services/flightService");
  });

  test("17. validateSearchParams catches missing/invalid fields", () => {
    const result = controller.validateSearchParams({ origin: "LH", destination: "" });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "origin must be a 3-letter IATA code",
        "destination is required",
      ]),
    );
  });

  test("18. searchFlights returns 200 structured response for valid body", async () => {
    flightService.searchFlights.mockResolvedValue([{ flightNumber: "BA115" }]);

    const req = { query: {}, body: { origin: "lhr", destination: "jfk", date: "2026-04-15" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.searchFlights(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          flights: [{ flightNumber: "BA115" }],
          meta: expect.objectContaining({ origin: "LHR", destination: "JFK" }),
        }),
      }),
    );
  });

  test("19. searchFlights returns 400 for invalid params", async () => {
    const req = { query: {}, body: { origin: "AB", destination: "1" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.searchFlights(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: "Invalid search parameters" }),
    );
  });
});

// ============================================
// 5) Endpoint Tests (2)
// ============================================
describe("Search Endpoint", () => {
  test("20. POST /api/flights/search delegates to controller", async () => {
    jest.resetModules();

    const searchFlights = jest.fn((req, res) => {
      res.status(200).json({ success: true, from: "controller", body: req.body });
    });

    jest.doMock("../src/controllers/flightController", () => ({ searchFlights }));

    const routes = require("../src/routes/flightRoutes");
    const app = express();
    app.use(express.json());
    app.use("/api/flights", routes);

    const response = await request(app)
      .post("/api/flights/search")
      .send({ origin: "LHR", destination: "JFK" })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        from: "controller",
        body: { origin: "LHR", destination: "JFK" },
      }),
    );
  });

  test("21. GET /api/flights/search delegates query params to controller", async () => {
    jest.resetModules();

    const searchFlights = jest.fn((req, res) => {
      res.status(200).json({ success: true, query: req.query });
    });

    jest.doMock("../src/controllers/flightController", () => ({ searchFlights }));

    const routes = require("../src/routes/flightRoutes");
    const app = express();
    app.use(express.json());
    app.use("/api/flights", routes);

    const response = await request(app)
      .get("/api/flights/search?origin=LHR&destination=JFK")
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        query: { origin: "LHR", destination: "JFK" },
      }),
    );
  });
});
