const adapters = require("../adapters");
const normalizer = require("../utils/normalizer");
const logger = require("../utils/logger");

/**
 * Search flights with normalized data
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Normalized flight data
 */
async function searchFlights(params) {
  try {
    logger.info("Flight Service: Searching flights", { params });

    // Get raw data from adapters
    const rawFlights = await adapters.searchFlights(params);

    // Normalize each flight based on source
    const normalizedFlights = rawFlights
      .map((flight) => {
        if (flight.source === "aviationstack") {
          return normalizer.normalizeAviationstackFlight(flight);
        } else if (flight.source === "airlabs") {
          return normalizer.normalizeAirlabsFlight(flight);
        }
        return null;
      })
      .filter((flight) => flight !== null); // Remove invalid flights

    logger.info(
      `Flight Service: Normalized ${normalizedFlights.length} flights`,
    );

    return normalizedFlights;
  } catch (error) {
    logger.error("Flight Service: Search failed", {
      error: error.message,
      params,
    });
    throw error;
  }
}

/**
 * Get airport with normalized data
 * @param {string} iataCode - Airport IATA code
 * @returns {Promise<Object>} Normalized airport data
 */
async function getAirport(iataCode) {
  try {
    logger.info("Flight Service: Getting airport", { iataCode });

    // Get raw data from adapter
    const rawAirport = await adapters.getAirport(iataCode);

    // Normalize based on source
    let normalizedAirport;
    if (rawAirport.source === "aviationstack") {
      normalizedAirport = normalizer.normalizeAviationstackAirport(rawAirport);
    } else if (rawAirport.source === "airlabs") {
      normalizedAirport = normalizer.normalizeAirlabsAirport(rawAirport);
    }

    logger.info("Flight Service: Airport normalized", { iataCode });

    return normalizedAirport;
  } catch (error) {
    logger.error("Flight Service: Get airport failed", {
      error: error.message,
      iataCode,
    });
    throw error;
  }
}

module.exports = {
  searchFlights,
  getAirport,
};
