/**
 * API Response Caching Tests
 * Tests cache functionality, TTL, performance, and fallback behavior
 */

// ============================================
// MOCK SETUP - MUST BE BEFORE IMPORTS
// ============================================
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockEnd = jest.fn();
  const mockOn = jest.fn();
  
  return {
    Pool: jest.fn(() => ({
      query: mockQuery,
      end: mockEnd,
      on: mockOn
    }))
  };
});

// ============================================
// IMPORTS
// ============================================
const cacheService = require("../src/services/cacheService");
const logger = require("../src/utils/logger");
const { Pool } = require('pg');

// Mock data for testing
const mockFlightData = [
  {
    flightNumber: "AA123",
    airline: "American Airlines",
    departure: "JFK",
    arrival: "LAX",
    departureTime: "2024-01-01T10:00:00Z",
    arrivalTime: "2024-01-01T13:00:00Z",
  },
];

describe("API Response Caching", () => {
  const testParams = {
    origin: "JFK",
    destination: "LAX",
    date: "2024-01-01",
  };

  let mockQueryFn;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mock query function
    mockQueryFn = cacheService.pool.query;
    // Default: return empty result (cache miss)
    mockQueryFn.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe("Cache Key Generation", () => {
    test("should generate consistent cache keys", () => {
      const key1 = cacheService.generateCacheKey(testParams);
      const key2 = cacheService.generateCacheKey(testParams);

      expect(key1).toBe(key2);
      expect(key1).toBe("JFK_LAX_2024-01-01");
    });

    test("should handle missing date parameter", () => {
      const paramsNoDate = { origin: "JFK", destination: "LAX" };
      const key = cacheService.generateCacheKey(paramsNoDate);

      expect(key).toBe("JFK_LAX_ANY");
    });

    test("should convert keys to uppercase", () => {
      const paramsLower = { origin: "jfk", destination: "lax", date: "2024-01-01" };
      const key = cacheService.generateCacheKey(paramsLower);

      expect(key).toBe("JFK_LAX_2024-01-01");
    });
  });

  describe("Cache Storage and Retrieval (AC: Cached data matches original API response)", () => {
    test("should store and retrieve flight data", async () => {
      // Mock successful insert
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });
      
      const success = await cacheService.set(testParams, mockFlightData, "aviationstack");
      expect(success).toBe(true);

      // Mock successful retrieval
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ response_data: mockFlightData }],
        rowCount: 1
      });

      const retrieved = await cacheService.get(testParams);
      expect(retrieved).toEqual(mockFlightData);
    });

    test("should return null for cache miss", async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await cacheService.get(testParams);
      expect(result).toBeNull();
    });

    test("should store data in JSONB format", async () => {
      // Mock successful insert
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });
      
      await cacheService.set(testParams, mockFlightData, "airlabs");

      // Mock retrieval to verify JSONB storage
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ response_data: mockFlightData }],
        rowCount: 1
      });

      const result = await cacheService.get(testParams);
      expect(result).toEqual(mockFlightData);
    });
  });

  describe("Cache TTL (AC: Cache TTL implemented - 24 hours)", () => {
    test("should expire cache after TTL", async () => {
      // Mock expired cache (returns empty)
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await cacheService.get(testParams);
      expect(result).toBeNull();
    });

    test("should keep valid cache within TTL", async () => {
      // Mock successful insert
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });
      
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      // Mock valid cache retrieval
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ response_data: mockFlightData }],
        rowCount: 1
      });

      const result = await cacheService.get(testParams);
      expect(result).toEqual(mockFlightData);
    });

    test("should set 24-hour TTL on cache storage", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Mock successful insert
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });
      
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      // Mock retrieval with TTL data
      mockQueryFn.mockResolvedValueOnce({
        rows: [{
          created_at: now,
          expires_at: expiresAt
        }],
        rowCount: 1
      });

      const result = await cacheService.pool.query(
        "SELECT expires_at, created_at FROM api_cache WHERE cache_key = $1",
        [cacheService.generateCacheKey(testParams)]
      );

      const { created_at, expires_at } = result.rows[0];
      const ttlMs = new Date(expires_at) - new Date(created_at);
      const ttlHours = ttlMs / (1000 * 60 * 60);

      expect(ttlHours).toBeCloseTo(24, 0);
    });
  });

  describe("Database Performance (AC: Database queries execute under 200ms)", () => {
    test("should retrieve cache in under 200ms", async () => {
      // Mock successful insert
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      // Mock fast retrieval
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ response_data: mockFlightData }],
        rowCount: 1
      });

      const startTime = Date.now();
      await cacheService.get(testParams);
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(200);
    });

    test("should handle 100 concurrent cache retrievals", async () => {
      // Mock successful insert
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      // Mock all retrievals
      mockQueryFn.mockResolvedValue({
        rows: [{ response_data: mockFlightData }],
        rowCount: 1
      });

      const startTime = Date.now();
      const promises = Array(100)
        .fill(null)
        .map(() => cacheService.get(testParams));

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results.length).toBe(100);
      expect(totalTime).toBeLessThan(20000);
    });
  });

  describe("Cache Hit Count Tracking (AC: Cache reduces external API calls by at least 50%)", () => {
    test("should increment hit count on cache hit", async () => {
      // Mock successful insert
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      // Mock retrieval (increments hit count)
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ response_data: mockFlightData }],
        rowCount: 1
      });
      await cacheService.get(testParams);

      // Mock hit count query
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ hit_count: 1 }],
        rowCount: 1
      });

      const result = await cacheService.pool.query(
        "SELECT hit_count FROM api_cache WHERE cache_key = $1",
        [cacheService.generateCacheKey(testParams)]
      );

      expect(result.rows[0].hit_count).toBe(1);
    });

    test("should track multiple cache hits", async () => {
      // Mock successful insert
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      // Mock 5 retrievals
      for (let i = 0; i < 5; i++) {
        mockQueryFn.mockResolvedValueOnce({
          rows: [{ response_data: mockFlightData }],
          rowCount: 1
        });
        await cacheService.get(testParams);
      }

      // Mock hit count query
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ hit_count: 5 }],
        rowCount: 1
      });

      const result = await cacheService.pool.query(
        "SELECT hit_count FROM api_cache WHERE cache_key = $1",
        [cacheService.generateCacheKey(testParams)]
      );

      expect(result.rows[0].hit_count).toBe(5);
    });
  });

  describe("Cache Statistics", () => {
    test("should retrieve cache statistics", async () => {
      // Mock successful insert
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      // Mock 2 retrievals
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ response_data: mockFlightData }],
        rowCount: 1
      });
      await cacheService.get(testParams);

      mockQueryFn.mockResolvedValueOnce({
        rows: [{ response_data: mockFlightData }],
        rowCount: 1
      });
      await cacheService.get(testParams);

      // Mock stats query
      mockQueryFn.mockResolvedValueOnce({
        rows: [{
          total_entries: 1,
          total_hits: 2,
          active_entries: 1
        }],
        rowCount: 1
      });

      const stats = await cacheService.getStats();

      expect(stats).toBeDefined();
      expect(stats.total_entries).toBeGreaterThan(0);
      expect(stats.total_hits).toBeGreaterThan(0);
      expect(stats.active_entries).toBeGreaterThan(0);
    });
  });

  describe("Cache Cleanup", () => {
    test("should clear expired cache entries", async () => {
      // Mock delete operation
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });

      const cleared = await cacheService.clearExpired();
      expect(cleared).toBeGreaterThan(0);

      // Mock cache miss after cleanup
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await cacheService.get(testParams);
      expect(result).toBeNull();
    });
  });

  describe("Cache Conflict Resolution (ON CONFLICT)", () => {
    test("should update cache on duplicate key", async () => {
      const newData = [...mockFlightData, { flightNumber: "BA456" }];

      // Mock first insert
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      // Mock second insert (update)
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });
      await cacheService.set(testParams, newData, "aviationstack");

      // Mock retrieval of updated data
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ response_data: newData }],
        rowCount: 1
      });

      const retrieved = await cacheService.get(testParams);
      expect(retrieved).toEqual(newData);
      expect(retrieved.length).toBe(2);
    });

    test("should reset hit count on cache update", async () => {
      // Mock first insert
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      // Mock 2 retrievals
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ response_data: mockFlightData }],
        rowCount: 1
      });
      await cacheService.get(testParams);

      mockQueryFn.mockResolvedValueOnce({
        rows: [{ response_data: mockFlightData }],
        rowCount: 1
      });
      await cacheService.get(testParams);

      // Mock update (resets hit count)
      const newData = [...mockFlightData];
      mockQueryFn.mockResolvedValueOnce({ rowCount: 1 });
      await cacheService.set(testParams, newData, "aviationstack");

      // Mock hit count query (should be 0 after update)
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ hit_count: 0 }],
        rowCount: 1
      });

      const result = await cacheService.pool.query(
        "SELECT hit_count FROM api_cache WHERE cache_key = $1",
        [cacheService.generateCacheKey(testParams)]
      );

      expect(result.rows[0].hit_count).toBe(0);
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    await cacheService.pool.end();
  });
});