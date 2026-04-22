const adapters = require("../adapters");
const normalizer = require("../utils/normalizer");
const cacheService = require("./cacheservice");
const logger = require("../utils/logger");

/**
 * Flight Service with Caching
 * Orchestrates flight search with cache-first strategy
 */
class FlightService {
  normalizeFlights(rawFlights) {
    return rawFlights
      .map((flight) => {
        if (flight.source === "aviationstack") {
          return normalizer.normalizeAviationstackFlight(flight);
        } else if (flight.source === "airlabs") {
          return normalizer.normalizeAirlabsFlight(flight);
        }
        return null;
      })
      .filter((flight) => flight !== null);
  }

  dedupeFlights(flights) {
    const seen = new Set();

    return flights.filter((flight) => {
      const key = [
        flight.source,
        flight.flightNumber,
        flight.departureAirport,
        flight.arrivalAirport,
        flight.departureTime,
        flight.arrivalTime,
      ].join("|");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  filterFlightsByDate(flights, date) {
    if (!date) {
      return flights;
    }

    return flights.filter((flight) => {
      const dateCandidates = new Set();

      if (flight.departureTime) {
        dateCandidates.add(String(flight.departureTime).slice(0, 10));

        const parsedTime = new Date(flight.departureTime);
        if (!Number.isNaN(parsedTime.getTime())) {
          dateCandidates.add(parsedTime.toISOString().slice(0, 10));
        }
      }

      const airlabsDate = flight.rawData?.raw_data?.dep_time;
      if (typeof airlabsDate === "string") {
        dateCandidates.add(airlabsDate.slice(0, 10));
      }

      const aviationstackDate = flight.rawData?.raw_data?.departure?.scheduled;
      if (typeof aviationstackDate === "string") {
        dateCandidates.add(aviationstackDate.slice(0, 10));
      }

      return dateCandidates.has(date);
    });
  }

  /**
   * Search flights with cache-first strategy
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Normalized flight data
   */
  async searchFlights(params) {
    logger.info("Flight Service: Searching flights", { params });

    // Try cache first
    const cachedData = await cacheService.get(params);
    if (cachedData) {
      logger.info("Flight Service: Using cached data");
      return cachedData;
    }

    // Cache miss - fetch from APIs
    logger.info("Flight Service: Cache miss, fetching from APIs");

    try {
      // Use adapter layer
      const rawFlights = await adapters.searchFlights(params);

      // Normalize data
      const normalizedFlights = this.normalizeFlights(rawFlights);
      const dateFilteredFlights = this.filterFlightsByDate(
        normalizedFlights,
        params.date,
      );

      logger.info(
        `Flight Service: Normalized ${normalizedFlights.length} flights and retained ${dateFilteredFlights.length} for requested date`,
      );

      // Store in cache for future requests
      if (dateFilteredFlights.length > 0) {
        await cacheService.set(
          params,
          dateFilteredFlights,
          rawFlights[0]?.source || "unknown",
        );
      }

      return dateFilteredFlights;
    } catch (error) {
      logger.error("Flight Service: Search failed", {
        error: error.message,
      });

      // Cache fallback when API is unavailable
      logger.info("Flight Service: Attempting cache fallback");
      const fallbackData = await this.getCacheFallback(params);
      if (fallbackData) {
        logger.info("Flight Service: Using expired cache as fallback");
        return fallbackData;
      }

      throw error;
    }
  }

  /**
   * Get expired cache as fallback when API fails
   * @param {Object} params - Search parameters
   * @returns {Promise<Array|null>} Cached data or null
   */
  async getCacheFallback(params) {
    const cacheKey = cacheService.generateCacheKey(params);

    try {
      const query = `   
       SELECT response_data   
       FROM api_cache   
       WHERE cache_key = $1   
       ORDER BY created_at DESC   
       LIMIT 1   
     `;

      const result = await cacheService.pool.query(query, [cacheKey]);

      if (result.rows.length > 0) {
        return result.rows[0].response_data;
      }

      return null;
    } catch (error) {
      logger.error("Cache fallback failed", { error: error.message });
      return null;
    }
  }

  /**
   * Get all flights (for graph building)
   * @param {Object} seedParams - Optional origin/destination seeds
   * @returns {Promise<Array>} - All available flights
   */
  async getAllFlights(seedParams = {}) {
    const origin = seedParams.origin || "";
    const destination = seedParams.destination || "";

    logger.info("Flight Service: Fetching all flights for graph building", {
      origin,
      destination,
    });

    try {
      const queryCandidates = [
        { origin: "", destination: "", date: "" },
        { origin, destination: "", date: "" },
        { origin: "", destination, date: "" },
        { origin, destination, date: "" },
      ];

      const seenQueries = new Set();
      const queries = queryCandidates.filter((params) => {
        const key = `${params.origin}|${params.destination}|${params.date}`;

        if (seenQueries.has(key)) {
          return false;
        }

        seenQueries.add(key);
        return true;
      });

      const results = await Promise.allSettled(
        queries.map((params) => this.searchFlights(params)),
      );

      const mergedFlights = [];

      results.forEach((result, index) => {
        const params = queries[index];

        if (result.status === "fulfilled") {
          mergedFlights.push(...result.value);
          return;
        }

        logger.warn("Flight Service: Graph seed query failed", {
          params,
          error: result.reason.message,
        });
      });

      const dedupedFlights = this.dedupeFlights(mergedFlights);

      logger.info(
        `Flight Service: Retrieved ${dedupedFlights.length} unique flights for graph`,
        {
          seedQueries: queries.length,
          rawMergedFlights: mergedFlights.length,
        },
      );

      return dedupedFlights;
    } catch (error) {
      logger.error("Flight Service: Failed to get all flights", {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = new FlightService();
