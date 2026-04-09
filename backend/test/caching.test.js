/**
 * API Response Caching Tests
 * Tests cache functionality, TTL, performance, and fallback behavior
 */

const cacheService = require("../src/services/cacheService");
const logger = require("../src/utils/logger");

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

  // Clean up before each test
  beforeEach(async () => {
    await cacheService.pool.query("DELETE FROM api_cache WHERE cache_key = $1", [
      cacheService.generateCacheKey(testParams),
    ]);
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
      const success = await cacheService.set(testParams, mockFlightData, "aviationstack");
      expect(success).toBe(true);

      const retrieved = await cacheService.get(testParams);
      expect(retrieved).toEqual(mockFlightData);
    });

    test("should return null for cache miss", async () => {
      const result = await cacheService.get(testParams);
      expect(result).toBeNull();
    });

    test("should store data in JSONB format", async () => {
      await cacheService.set(testParams, mockFlightData, "airlabs");

      const query =
        "SELECT response_data FROM api_cache WHERE cache_key = $1";
      const result = await cacheService.pool.query(query, [
        cacheService.generateCacheKey(testParams),
      ]);

      expect(result.rows[0].response_data).toEqual(mockFlightData);
    });
  });

  describe("Cache TTL (AC: Cache TTL implemented - 24 hours)", () => {
    test("should expire cache after TTL", async () => {
      // Insert with past expiration date
      const cacheKey = cacheService.generateCacheKey(testParams);
      const expiredTime = new Date();
      expiredTime.setHours(expiredTime.getHours() - 1); // Expired 1 hour ago

      const query = `
        INSERT INTO api_cache (cache_key, response_data, source, expires_at)
        VALUES ($1, $2, $3, $4)
      `;

      await cacheService.pool.query(query, [
        cacheKey,
        JSON.stringify(mockFlightData),
        "aviationstack",
        expiredTime,
      ]);

      // Should return null because cache is expired
      const result = await cacheService.get(testParams);
      expect(result).toBeNull();
    });

    test("should keep valid cache within TTL", async () => {
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      // Should retrieve immediately (within TTL)
      const result = await cacheService.get(testParams);
      expect(result).toEqual(mockFlightData);
    });

    test("should set 24-hour TTL on cache storage", async () => {
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      const query = `
        SELECT expires_at, created_at FROM api_cache WHERE cache_key = $1
      `;
      const result = await cacheService.pool.query(query, [
        cacheService.generateCacheKey(testParams),
      ]);

      const { created_at, expires_at } = result.rows[0];
      const ttlMs = new Date(expires_at) - new Date(created_at);
      const ttlHours = ttlMs / (1000 * 60 * 60);

      expect(ttlHours).toBeCloseTo(24, 0);
    });
  });

  describe("Database Performance (AC: Database queries execute under 200ms)", () => {
    test("should retrieve cache in under 200ms", async () => {
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      const startTime = Date.now();
      await cacheService.get(testParams);
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(200);
    });

    test("should handle 100 concurrent cache retrievals", async () => {
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      const startTime = Date.now();
      const promises = Array(100)
        .fill(null)
        .map(() => cacheService.get(testParams));

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results.length).toBe(100);
      expect(totalTime).toBeLessThan(20000); // 200ms per query average
    });
  });

  describe("Cache Hit Count Tracking (AC: Cache reduces external API calls by at least 50%)", () => {
    test("should increment hit count on cache hit", async () => {
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      // First retrieval
      await cacheService.get(testParams);

      // Check hit count
      const query = `
        SELECT hit_count FROM api_cache WHERE cache_key = $1
      `;
      const result = await cacheService.pool.query(query, [
        cacheService.generateCacheKey(testParams),
      ]);

      expect(result.rows[0].hit_count).toBe(1);
    });

    test("should track multiple cache hits", async () => {
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      // Multiple retrievals
      for (let i = 0; i < 5; i++) {
        await cacheService.get(testParams);
      }

      const query = `
        SELECT hit_count FROM api_cache WHERE cache_key = $1
      `;
      const result = await cacheService.pool.query(query, [
        cacheService.generateCacheKey(testParams),
      ]);

      expect(result.rows[0].hit_count).toBe(5);
    });
  });

  describe("Cache Statistics", () => {
    test("should retrieve cache statistics", async () => {
      await cacheService.set(testParams, mockFlightData, "aviationstack");
      await cacheService.get(testParams);
      await cacheService.get(testParams);

      const stats = await cacheService.getStats();

      expect(stats).toBeDefined();
      expect(stats.total_entries).toBeGreaterThan(0);
      expect(stats.total_hits).toBeGreaterThan(0);
      expect(stats.active_entries).toBeGreaterThan(0);
    });
  });

  describe("Cache Cleanup", () => {
    test("should clear expired cache entries", async () => {
      const cacheKey = cacheService.generateCacheKey(testParams);

      // Insert expired entry
      const expiredTime = new Date();
      expiredTime.setHours(expiredTime.getHours() - 1);

      const query = `
        INSERT INTO api_cache (cache_key, response_data, source, expires_at)
        VALUES ($1, $2, $3, $4)
      `;

      await cacheService.pool.query(query, [
        cacheKey,
        JSON.stringify(mockFlightData),
        "aviationstack",
        expiredTime,
      ]);

      const cleared = await cacheService.clearExpired();
      expect(cleared).toBeGreaterThan(0);

      // Verify it's deleted
      const result = await cacheService.get(testParams);
      expect(result).toBeNull();
    });
  });

  describe("Cache Conflict Resolution (ON CONFLICT)", () => {
    test("should update cache on duplicate key", async () => {
      const newData = [...mockFlightData, { flightNumber: "BA456" }];

      await cacheService.set(testParams, mockFlightData, "aviationstack");
      await cacheService.set(testParams, newData, "aviationstack");

      const retrieved = await cacheService.get(testParams);
      expect(retrieved).toEqual(newData);
      expect(retrieved.length).toBe(2);
    });

    test("should reset hit count on cache update", async () => {
      await cacheService.set(testParams, mockFlightData, "aviationstack");

      // Increment hit count
      await cacheService.get(testParams);
      await cacheService.get(testParams);

      const newData = [...mockFlightData];
      await cacheService.set(testParams, newData, "aviationstack");

      // Check hit count reset
      const query = `
        SELECT hit_count FROM api_cache WHERE cache_key = $1
      `;
      const result = await cacheService.pool.query(query, [
        cacheService.generateCacheKey(testParams),
      ]);

      expect(result.rows[0].hit_count).toBe(0);
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    await cacheService.pool.end();
  });
});
