/**
 * AirLabs API Adapter
 * Implements the Adapter pattern (Gamma et al., 1994) to normalise
 * AirLabs API responses into internal format.
 *
 * AirLabs uses Unix epoch timestamps.
 *
 * @module adapters/airlabsAdapter
 */

const axios = require('axios');
const apiConfig = require('../config/apiConfig');
const logger = require('../utils/logger');

/**
 * Fetch flights from AirLabs API
 * @param {string} origin - Origin IATA code
 * @param {string} destination - Destination IATA code
 * @returns {Promise<Array>} Raw flight data from AirLabs
 */
async function fetchFlights(origin, destination) {
  try {
    const { baseUrl, apiKey, timeout } = apiConfig.airlabs;

    if (!apiKey) {
      logger.warn('AirLabs API key not configured');
      return [];
    }

    const params = {
      api_key: apiKey,
    };

    if (origin) {
      params.dep_iata = origin;
    }

    if (destination) {
      params.arr_iata = destination;
    }

    

    const response = await axios.get(`${baseUrl}/schedules`, {
      params,
      timeout,
    });
      // console.log('AIRLABS',baseUrl, response.data);
      
    if (!response.data || !response.data.response) {
      logger.warn('AirLabs returned no flight data');
      return [];
    }

    return response.data.response.map((flight) => ({
      flight_number: flight.flight_iata || 'N/A',
      airline: flight.airline_iata || 'Unknown',
      airline_iata: flight.airline_iata || '',
      origin: flight.dep_iata || origin,
      destination: flight.arr_iata || destination,
      departure_time: flight.dep_time || null,
      arrival_time: flight.arr_time || null,
      status: flight.status || 'unknown',
      source: 'airlabs',
      raw_data: flight,
    }));
  } catch (error) {
    logger.error(`AirLabs API error: ${error.message}`);
    return [];
  }
}

/**
 * Search flights using params object
 * @param {Object} params - Search parameters with origin and destination
 * @returns {Promise<Array>} Normalized flight data
 */
async function searchFlights(params) {
  const { origin, destination } = params;
  return fetchFlights(origin, destination);
}

module.exports = { fetchFlights, searchFlights };
