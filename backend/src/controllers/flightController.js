const flightService = require("../services/flightService");
const logger = require("../utils/logger");

class FlightController {
  /**
   * Search flights endpoint
   * GET /api/flights/search?origin=JFK&destination=LAX&date=2026-04-15
   * POST /api/flights/search (with JSON body)
   */
  async searchFlights(req, res) {
    const startTime = Date.now();

    try {
      const { origin, destination, date } = req.query.origin
        ? req.query
        : req.body;

      //Invalid input returns HTTP 400 with message
      const validation = this.validateSearchParams({
        origin,
        destination,
        date,
      });
      if (!validation.valid) {
        logger.warn("Invalid search parameters", {
          params: req.query,
          errors: validation.errors,
        });

        return res.status(400).json({
          success: false,
          error: "Invalid search parameters",
          details: validation.errors,
        });
      }

      // Search flights
      const flights = await flightService.searchFlights({
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        date,
      });

      const responseTime = Date.now() - startTime;

      // Response time under 2 seconds
      if (responseTime > 2000) {
        logger.warn("Search exceeded 2s threshold", { responseTime });
      }

      // Endpoint returns structured JSON response
      logger.info("Flight search successful", {
        origin,
        destination,
        date,
        count: flights.length,
        responseTime,
      });

      return res.status(200).json({
        success: true,
        data: {
          flights,
          meta: {
            count: flights.length,
            origin: origin.toUpperCase(),
            destination: destination.toUpperCase(),
            date: date || "any",
            responseTime,
          },
        },
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error("Flight search failed", {
        error: error.message,
        params: req.query,
        responseTime,
      });

      return res.status(500).json({
        success: false,
        error: "Flight search failed",
        message: error.message,
      });
    }
  }

  /**
   * Validate search parameters
   * @param {Object} params - Search parameters
   * @returns {Object} Validation result
   */
  validateSearchParams(params) {
    const errors = [];

    // Validate origin
    if (!params.origin) {
      errors.push("origin is required");
    } else if (!/^[A-Z]{3}$/i.test(params.origin)) {
      errors.push("origin must be a 3-letter IATA code");
    }

    // Validate destination
    if (!params.destination) {
      errors.push("destination is required");
    } else if (!/^[A-Z]{3}$/i.test(params.destination)) {
      errors.push("destination must be a 3-letter IATA code");
    }

    // Validate date (optional)
    if (params.date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(params.date)) {
        errors.push("date must be in YYYY-MM-DD format");
      } else {
        const date = new Date(params.date);
        if (isNaN(date.getTime())) {
          errors.push("date is invalid");
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

module.exports = new FlightController();
