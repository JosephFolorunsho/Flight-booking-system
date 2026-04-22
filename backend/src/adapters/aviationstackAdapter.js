
const axios = require('axios');
const apiConfig = require('../config/apiConfig');
const logger = require('../utils/logger');

/**
 * Fetch flights from Aviationstack API
 * @param {string} origin - Origin IATA code
 * @param {string} destination - Destination IATA code
 * @returns {Promise<Array>} Raw flight data from Aviationstack
 */
async function fetchFlights(origin, destination, date) {
  try {
    const { baseUrl, apiKey, timeout } = apiConfig.aviationstack;

    if (!apiKey) {
      logger.warn('Aviationstack API key not configured');
      return [];
    }

    const params = {
      access_key: apiKey,
      flight_status: 'scheduled',
    };

    if (origin) {
      params.dep_iata = origin;
    }

    if (destination) {
      params.arr_iata = destination;
    }

    if (date) {
      params.flight_date = date;
    }

    const response = await axios.get(`${baseUrl}/flights`, {
      params,
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
    const statusCode = error.response?.status;

    if (statusCode === 401 || statusCode === 403) {
      logger.warn(`Aviationstack authorization failed (${statusCode})`);
      return [];
    }

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
  const { origin, destination, date } = params;
  return fetchFlights(origin, destination, date);
}

module.exports = { fetchFlights, searchFlights };
