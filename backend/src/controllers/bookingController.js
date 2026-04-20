const bookingService = require("../services/bookingService");
const logger = require("../utils/logger");

class BookingController {
  async createBooking(req, res) {
    try {
      const {
        userEmail,
        flights,
        totalPrice,
        currency,
        paymentMethod,
        passengerName,
      } = req.body;

      if (!userEmail || !flights || !totalPrice) {
        return res.status(400).json({
          error: {
            code: "MISSING_FIELDS",
            message: "Missing required fields: userEmail, flights, totalPrice",
          },
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        return res.status(400).json({
          error: {
            code: "INVALID_EMAIL",
            message: "Invalid email format",
          },
        });
      }

      if (!Array.isArray(flights) || flights.length === 0) {
        return res.status(400).json({
          error: {
            code: "INVALID_FLIGHTS",
            message: "Flights must be a non-empty array",
          },
        });
      }

      for (const flight of flights) {
        if (!flight.flightNumber || !flight.departure || !flight.arrival) {
          return res.status(400).json({
            error: {
              code: "INVALID_FLIGHT_DATA",
              message:
                "Each flight must have flightNumber, departure, and arrival",
            },
          });
        }

        if (!flight.departure.airport || !flight.departure.time) {
          return res.status(400).json({
            error: {
              code: "INVALID_DEPARTURE",
              message:
                "Each flight must have departure.airport and departure.time",
            },
          });
        }

        if (!flight.arrival.airport || !flight.arrival.time) {
          return res.status(400).json({
            error: {
              code: "INVALID_ARRIVAL",
              message: "Each flight must have arrival.airport and arrival.time",
            },
          });
        }
      }

      if (totalPrice <= 0) {
        return res.status(400).json({
          error: {
            code: "INVALID_PRICE",
            message: "Total price must be greater than 0",
          },
        });
      }

      const result = await bookingService.createBooking({
        userEmail,
        flights,
        totalPrice,
        currency,
        paymentMethod,
        passengerName,
      });

      if (result.responseTime > 2000) {
        logger.warn("Booking response time exceeded 2 seconds", {
          responseTime: result.responseTime,
        });
      }

      if (!result.success) {
        return res.status(402).json({
          error: {
            code: "PAYMENT_FAILED",
            message: result.paymentError,
            errorCode: result.errorCode,
          },
          bookingReference: result.bookingReference,
        });
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error("Booking creation error", {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while creating the booking",
        },
      });
    }
  }

  async getBooking(req, res) {
    try {
      const { reference } = req.params;

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(reference)) {
        return res.status(400).json({
          error: {
            code: "INVALID_REFERENCE",
            message: "Invalid booking reference format",
          },
        });
      }

      const booking = await bookingService.getBooking(reference);

      if (!booking) {
        return res.status(404).json({
          error: {
            code: "BOOKING_NOT_FOUND",
            message: "Booking not found",
          },
        });
      }

      res.json(booking);
    } catch (error) {
      logger.error("Get booking error", { error: error.message });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while retrieving the booking",
        },
      });
    }
  }

  async getPaymentAttempts(req, res) {
    try {
      const { reference } = req.params;

      const attempts = await bookingService.getPaymentAttempts(reference);

      res.json({
        bookingReference: reference,
        attempts,
      });
    } catch (error) {
      logger.error("Get payment attempts error", { error: error.message });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while retrieving payment attempts",
        },
      });
    }
  }
}

module.exports = new BookingController();
