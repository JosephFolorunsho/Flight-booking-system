/**
 * US-07: Adapter Pattern - Unified Interface
 * Provides a single interface to access multiple external APIs
 * Isolates external API changes from internal logic
 */

const aviationstackAdapter = require("./aviationstackAdapter");
const airlabsAdapter = require("./airlabsAdapter");
const logger = require("../utils/logger");

/**
 * Search flights from all available APIs
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Combined results from all APIs
 */
async function searchFlights(params) {
  logger.info("Adapter Layer: Searching flights from all sources", { params });

  // Query both APIs in parallel
  const results = await Promise.allSettled([
    aviationstackAdapter.searchFlights(params),
    airlabsAdapter.searchFlights(params),
  ]);

  // Combine successful results
  const allFlights = [];

  results.forEach((result, index) => {
    const source = index === 0 ? "aviationstack" : "airlabs";

    if (result.status === "fulfilled") {
      logger.info(
        `Adapter Layer: ${source} returned ${result.value.length} flights`,
      );
      allFlights.push(...result.value);
    } else {
      logger.warn(`Adapter Layer: ${source} failed`, {
        error: result.reason.message,
      });
    }
  });

  logger.info(
    `Adapter Layer: Total ${allFlights.length} flights from all sources`,
  );
  return allFlights;
}

/**
 * Get airport from any available API
 * @param {string} iataCode - Airport IATA code
 * @returns {Promise<Object>} Airport data
 */
async function getAirport(iataCode) {
  logger.info("Adapter Layer: Getting airport", { iataCode });

  // Try aviationstack first, fallback to airlabs
  try {
    return await aviationstackAdapter.getAirport(iataCode);
  } catch (error) {
    logger.warn("Adapter Layer: Aviationstack failed, trying AirLabs", {
      error: error.message,
    });
    return await airlabsAdapter.getAirport(iataCode);
  }
}

module.exports = {
  searchFlights,
  getAirport,
  aviationstackAdapter,
  airlabsAdapter,
};
