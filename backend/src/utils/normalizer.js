const logger = require("./logger");

/**
 * US-08: Data Normalization Utilities
 * Converts external API data into internal schema
 */

/**
 * Normalize Aviationstack flight data
 * @param {Object} flight - Raw flight data from Aviationstack
 * @returns {Object|null} Normalized flight data
 */
function normalizeAviationstackFlight(flight) {
  try {
    const normalized = {
      // Source tracking
      source: "aviationstack",

      // Flight identification
      flightNumber: flight.flight?.iata || null,
      flightIcao: flight.flight?.icao || null,
      flightNumber: flight.flight?.number || null,

      // Airline information
      airlineIata: flight.airline?.iata || null,
      airlineIcao: flight.airline?.icao || null,
      airlineName: flight.airline?.name || null,

      // Departure information
      departureAirport: flight.departure?.iata || null,
      departureTime: normalizeTimestamp(flight.departure?.scheduled),
      departureTimezone: flight.departure?.timezone || null,
      departureTerminal: flight.departure?.terminal || null,
      departureGate: flight.departure?.gate || null,

      // Arrival information
      arrivalAirport: flight.arrival?.iata || null,
      arrivalTime: normalizeTimestamp(flight.arrival?.scheduled),
      arrivalTimezone: flight.arrival?.timezone || null,
      arrivalTerminal: flight.arrival?.terminal || null,
      arrivalGate: flight.arrival?.gate || null,

      // Flight status
      status: normalizeStatus(flight.flight_status),

      // Duration
      duration: calculateDuration(
        flight.departure?.scheduled,
        flight.arrival?.scheduled,
      ),

      // Metadata
      fetchedAt: new Date().toISOString(),
      rawData: flight, // Keep for reference
    };

    // Validate before returning
    if (!validateFlight(normalized)) {
      logger.warn("Aviationstack flight failed validation", {
        flightNumber: normalized.flightNumber,
      });
      return null;
    }

    return normalized;
  } catch (error) {
    logger.error("Failed to normalize Aviationstack flight", {
      error: error.message,
      flight: flight.flight?.iata,
    });
    return null;
  }
}

/**
 * Normalize AirLabs flight data
 * @param {Object} flight - Raw flight data from AirLabs
 * @returns {Object|null} Normalized flight data
 */
function normalizeAirlabsFlight(flight) {
  console.log("AirLabs Flight", flight);
  try {
    const normalized = {
      // Source tracking
      source: "airlabs",

      // Flight identification
      flightNumber: flight.flight_iata || null,
      flightIcao: flight.flight_icao || null,
      flightNumber: flight.flight_number || null,

      // Airline information
      airlineIata: flight.airline_iata || null,
      airlineIcao: flight.airline_icao || null,
      airlineName: flight.airline_name || null,

      // Departure information
      departureAirport: flight.dep_iata || null,
      departureTime: normalizeTimestamp(flight.dep_time),
      departureTimezone: flight.dep_timezone || null,
      departureTerminal: flight.dep_terminal || null,
      departureGate: flight.dep_gate || null,

      // Arrival information
      arrivalAirport: flight.arr_iata || null,
      arrivalTime: normalizeTimestamp(flight.arr_time),
      arrivalTimezone: flight.arr_timezone || null,
      arrivalTerminal: flight.arr_terminal || null,
      arrivalGate: flight.arr_gate || null,

      // Flight status
      status: normalizeStatus(flight.status),

      // Duration
      duration:
        flight.duration || calculateDuration(flight.dep_time, flight.arr_time),

      // Metadata
      fetchedAt: new Date().toISOString(),
      rawData: flight, // Keep for reference
    };

    // Validate before returning
    if (!validateFlight(normalized)) {
      logger.warn("AirLabs flight failed validation", {
        flightNumber: normalized.flightNumber,
      });
      return null;
    }

    return normalized;
  } catch (error) {
    logger.error("Failed to normalize AirLabs flight", {
      error: error.message,
      flight: flight.flight_iata,
    });
    return null;
  }
}

/**
 * Normalize timestamp to ISO 8601 format
 * @param {string|Date} timestamp - Raw timestamp
 * @returns {string|null} ISO 8601 formatted timestamp
 */
function normalizeTimestamp(timestamp) {
  if (!timestamp) {
    return null;
  }

  try {
    const date = new Date(timestamp);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      logger.warn("Invalid timestamp", { timestamp });
      return null;
    }

    // Return ISO 8601 format
    return date.toISOString();
  } catch (error) {
    logger.error("Failed to normalize timestamp", {
      timestamp,
      error: error.message,
    });
    return null;
  }
}

/**
 * Normalize flight status to standard values
 * @param {string} status - Raw status from API
 * @returns {string} Normalized status
 */
function normalizeStatus(status) {
  if (!status) return "unknown";

  const statusLower = status.toLowerCase();

  // Map various status values to standard ones
  const statusMap = {
    scheduled: "scheduled",
    active: "active",
    landed: "landed",
    cancelled: "cancelled",
    incident: "incident",
    diverted: "diverted",
    delayed: "delayed",
    departed: "active",
    arrived: "landed",
    "en-route": "active",
  };

  return statusMap[statusLower] || "unknown";
}

/**
 * Calculate flight duration in minutes
 * @param {string} departureTime - Departure timestamp
 * @param {string} arrivalTime - Arrival timestamp
 * @returns {number|null} Duration in minutes
 */
function calculateDuration(departureTime, arrivalTime) {
  if (!departureTime || !arrivalTime) {
    return null;
  }

  try {
    const dep = new Date(departureTime);
    const arr = new Date(arrivalTime);

    if (isNaN(dep.getTime()) || isNaN(arr.getTime())) {
      return null;
    }

    const durationMs = arr - dep;
    const durationMinutes = Math.round(durationMs / 60000);

    // Sanity check: duration should be positive and reasonable
    if (durationMinutes < 0 || durationMinutes > 1440) {
      // Max 24 hours
      logger.warn("Unrealistic flight duration", {
        departureTime,
        arrivalTime,
        durationMinutes,
      });
      return null;
    }

    return durationMinutes;
  } catch (error) {
    logger.error("Failed to calculate duration", {
      departureTime,
      arrivalTime,
      error: error.message,
    });
    return null;
  }
}

/**
 * Validate normalized flight data
 * Ensures all critical fields are present and valid
 * @param {Object} flight - Normalized flight data
 * @returns {boolean} True if valid
 */
function validateFlight(flight) {
  // Required fields that must not be null/undefined
  const requiredFields = [
    "flightNumber",
    "airlineIata",
    "departureAirport",
    "arrivalAirport",
    "departureTime",
    "arrivalTime",
  ];

  // Check each required field
  for (const field of requiredFields) {
    if (!flight[field]) {
      logger.warn("Flight missing required field", {
        field,
        flightNumber: flight.flightNumber || "unknown",
      });
      return false;
    }
  }

  // Validate IATA codes (should be 3 letters)
  const iataFields = ["airlineIata", "departureAirport", "arrivalAirport"];
  for (const field of iataFields) {
    if (flight[field] && !/^[A-Z]{2,3}$/.test(flight[field])) {
      logger.warn("Invalid IATA code format", {
        field,
        value: flight[field],
        flightNumber: flight.flightNumber,
      });
      return false;
    }
  }

  // Validate timestamps are in ISO 8601 format
  const timestampFields = ["departureTime", "arrivalTime"];
  for (const field of timestampFields) {
    if (flight[field] && !isValidISO8601(flight[field])) {
      logger.warn("Invalid timestamp format", {
        field,
        value: flight[field],
        flightNumber: flight.flightNumber,
      });
      return false;
    }
  }

  return true;
}

/**
 * Check if string is valid ISO 8601 timestamp
 * @param {string} timestamp - Timestamp to validate
 * @returns {boolean} True if valid ISO 8601
 */
function isValidISO8601(timestamp) {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  return iso8601Regex.test(timestamp);
}

/**
 * Normalize airport data from Aviationstack
 * @param {Object} airport - Raw airport data
 * @returns {Object} Normalized airport data
 */
function normalizeAviationstackAirport(airport) {
  return {
    iataCode: airport.iata_code,
    icaoCode: airport.icao_code || null,
    name: airport.airport_name,
    city: airport.city_name || null,
    country: airport.country_name || null,
    countryCode: airport.country_code || null,
    latitude: parseFloat(airport.latitude) || null,
    longitude: parseFloat(airport.longitude) || null,
    timezone: airport.timezone || null,
    source: "aviationstack",
  };
}

/**
 * Normalize airport data from AirLabs
 * @param {Object} airport - Raw airport data
 * @returns {Object} Normalized airport data
 */
function normalizeAirlabsAirport(airport) {
  return {
    iataCode: airport.iata_code,
    icaoCode: airport.icao_code || null,
    name: airport.name,
    city: airport.city || null,
    country: airport.country || null,
    countryCode: airport.country_code || null,
    latitude: parseFloat(airport.lat) || null,
    longitude: parseFloat(airport.lng) || null,
    timezone: airport.timezone || null,
    source: "airlabs",
  };
}

module.exports = {
  normalizeAviationstackFlight,
  normalizeAirlabsFlight,
  normalizeAviationstackAirport,
  normalizeAirlabsAirport,
  normalizeTimestamp,
  normalizeStatus,
  calculateDuration,
  validateFlight,
};
