const ApiClient = require("../services/apiClient");
const apiConfig = require("../config/apiConfig");
const logger = require("../utils/logger");

/**
 * US-07: Aviationstack API Adapter
 * Implements adapter pattern to isolate external API from internal logic
 */
class AviationstackAdapter {
  constructor() {
    this.apiClient = new ApiClient(apiConfig.aviationstack);
    this.apiKey = apiConfig.aviationstack.apiKey;
  }

  /**
   * Search for flights
   * Returns data in unified internal format
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Unified flight data
   */
  async searchFlights(params) {
    try {
      logger.info("Aviationstack Adapter: Searching flights", { params });

      const data = await this.apiClient.get("/flights", {
        access_key: this.apiKey,
        dep_iata: params.origin,
        arr_iata: params.destination,
        flight_date: params.date,
      });

      const flights = data.data || [];
      logger.info(`Aviationstack Adapter: Found ${flights.length} flights`);

      // Return raw data for normalization layer (US-08)
      return flights;
    } catch (error) {
      logger.error("Aviationstack Adapter: Search failed", {
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
      logger.info("Aviationstack Adapter: Getting airport", { iataCode });

      const data = await this.apiClient.get("/airports", {
        access_key: this.apiKey,
        iata_code: iataCode,
      });

      const airports = data.data || [];

      if (airports.length === 0) {
        throw new Error(`Airport ${iataCode} not found`);
      }

      // Return raw data for normalization layer (US-08)
      return airports[0];
    } catch (error) {
      logger.error("Aviationstack Adapter: Get airport failed", {
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
      logger.info("Aviationstack Adapter: Getting airline", { iataCode });

      const data = await this.apiClient.get("/airlines", {
        access_key: this.apiKey,
        iata_code: iataCode,
      });

      const airlines = data.data || [];

      if (airlines.length === 0) {
        throw new Error(`Airline ${iataCode} not found`);
      }

      return airlines[0];
    } catch (error) {
      logger.error("Aviationstack Adapter: Get airline failed", {
        error: error.message,
        iataCode,
      });
      throw error;
    }
  }
}

module.exports = new AviationstackAdapter();
