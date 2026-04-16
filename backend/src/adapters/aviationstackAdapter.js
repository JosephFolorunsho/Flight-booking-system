
const axios = require('axios');
const apiConfig = require('../config/apiConfig');
const logger = require('../utils/logger');

/**
 * Fetch flights from Aviationstack API
 * @param {string} origin - Origin IATA code
 * @param {string} destination - Destination IATA code
 * @returns {Promise<Array>} Raw flight data from Aviationstack
 */
async function fetchFlights(origin, destination) {
  try {
    const { baseUrl, apiKey, timeout } = apiConfig.aviationstack;

    if (!apiKey) {
      logger.warn('Aviationstack API key not configured');
      return [];
    }

    const response = await axios.get(`${baseUrl}/flights`, {
      params: {
        access_key: apiKey,
        dep_iata: origin,
        arr_iata: destination,
        flight_status: 'scheduled',
      },
      timeout,
    });
    // console.log('AVIATIONSTACK',response.data);
    if (!response.data || !response.data.data) {
      logger.warn('Aviationstack returned no flight data');
      return [];
    }

    return response.data.data.map((flight) => ({
      flight_number: flight.flight?.iata || 'N/A',
      airline: flight.airline?.name || 'Unknown',
      airline_iata: flight.airline?.iata || '',
      origin: flight.departure?.iata || origin,
      destination: flight.arrival?.iata || destination,
      departure_time: flight.departure?.scheduled || null,
      arrival_time: flight.arrival?.scheduled || null,
      status: flight.flight_status || 'unknown',
      source: 'aviationstack',
      raw_data: flight,
    }));
  } catch (error) {
    logger.error(`Aviationstack API error: ${error.message}`);
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
