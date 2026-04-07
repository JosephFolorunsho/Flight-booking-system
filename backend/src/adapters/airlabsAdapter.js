const ApiClient = require("../services/apiClient");
const apiConfig = require("../config/apiConfig");
const logger = require("../utils/logger");

/**
 * US-07: AirLabs API Adapter
 * Implements adapter pattern to isolate external API from internal logic
 */
class AirlabsAdapter {
  constructor() {
    this.apiClient = new ApiClient(apiConfig.airlabs);
    this.apiKey = apiConfig.airlabs.apiKey;
  }

  /**
   * Search for flights
   * Returns data in unified internal format
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Unified flight data
   */
  async searchFlights(params) {
    try {
      logger.info("AirLabs Adapter: Searching flights", { params });

      const data = await this.apiClient.get("/flights", {
        api_key: this.apiKey,
        dep_iata: params.origin,
        arr_iata: params.destination,
      });

      const flights = data.response || [];
      logger.info(`AirLabs Adapter: Found ${flights.length} flights`);

      // Return raw data for normalization layer (US-08)
      return flights;
    } catch (error) {
      logger.error("AirLabs Adapter: Search failed", {
        error: error.message,
        params,
      });
      throw error;
    }
  }

  /**
   * Get airport information
   * Returns data in unified internal format
   * @param {string} iataCode - Airport IATA code
   * @returns {Promise<Object>} Unified airport data
   */
  async getAirport(iataCode) {
    try {
      logger.info("AirLabs Adapter: Getting airport", { iataCode });

      const data = await this.apiClient.get("/airports", {
        api_key: this.apiKey,
        iata_code: iataCode,
      });

      const airports = data.response || [];

      if (airports.length === 0) {
        throw new Error(`Airport ${iataCode} not found`);
      }

      // Return raw data for normalization layer (US-08)
      return airports[0];
    } catch (error) {
      logger.error("AirLabs Adapter: Get airport failed", {
        error: error.message,
        iataCode,
      });
      throw error;
    }
  }

  /**
   * Get airline information
   * @param {string} iataCode - Airline IATA code
   * @returns {Promise<Object>} Unified airline data
   */
  async getAirline(iataCode) {
    try {
      logger.info("AirLabs Adapter: Getting airline", { iataCode });

      const data = await this.apiClient.get("/airlines", {
        api_key: this.apiKey,
        iata_code: iataCode,
      });

      const airlines = data.response || [];

      if (airlines.length === 0) {
        throw new Error(`Airline ${iataCode} not found`);
      }

      return airlines[0];
    } catch (error) {
      logger.error("AirLabs Adapter: Get airline failed", {
        error: error.message,
        iataCode,
      });
      throw error;
    }
  }
}

module.exports = new AirlabsAdapter();
