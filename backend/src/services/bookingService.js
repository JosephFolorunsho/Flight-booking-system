const { Pool } = require("pg");
const logger = require("../utils/logger");
const paymentService = require("./paymentService");

class BookingService {
  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || "localhost",
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || "skyroute_db",
      user: process.env.POSTGRES_USER || "skyroute",
      password: process.env.POSTGRES_PASSWORD || "skyroute_secret",
    });
  }

  normalizeCode(value) {
    if (typeof value !== "string") {
      return null;
    }

    const normalizedValue = value.trim().toUpperCase();
    return normalizedValue || null;
  }

  createBookingValidationError(message, code = "BOOKING_VALIDATION_ERROR") {
    const error = new Error(message);
    error.code = code;
    error.statusCode = 400;
    return error;
  }

  async createBooking(bookingData) {
    const startTime = Date.now();
    const {
      userEmail,
      flights,
      totalPrice,
      currency,
      paymentMethod,
      passengerName,
    } = bookingData;

    logger.info("Booking Service: Creating booking", {
      userEmail,
      flightCount: flights.length,
      totalPrice,
    });

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const bookingQuery = `   
        INSERT INTO bookings (   
          email, total_price, currency, status, payment_status   
        ) VALUES ($1, $2, $3, $4, $5)   
        RETURNING id, created_at   
      `;

      const bookingResult = await client.query(bookingQuery, [
        userEmail,
        totalPrice,
        currency || "USD",
        "pending",
        "pending",
      ]);

      const booking = bookingResult.rows[0];
      const bookingId = booking.id;

      for (const [index, flight] of flights.entries()) {
        const originCode = this.normalizeCode(flight.departure.airport);
        const destinationCode = this.normalizeCode(flight.arrival.airport);
        const airlineCode = this.normalizeCode(
          flight.airlineIata || flight.airline,
        );

        const airportsResult = await client.query(
          "SELECT id, iata_code FROM airports WHERE iata_code = ANY($1::varchar[])",
          [[originCode, destinationCode]],
        );

        const airportIds = new Map(
          airportsResult.rows.map((airport) => [airport.iata_code, airport.id]),
        );
        const originId = airportIds.get(originCode);
        const destinationId = airportIds.get(destinationCode);

        if (!originId || !destinationId) {
          const missingCodes = [originCode, destinationCode].filter(
            (code) => code && !airportIds.has(code),
          );

          throw this.createBookingValidationError(
            `Flight ${index + 1}: Unknown airport code(s): ${missingCodes.join(", ")}`,
            "UNKNOWN_AIRPORT",
          );
        }

        let airlineId = null;
        if (airlineCode && /^[A-Z0-9]{2,3}$/.test(airlineCode)) {
          const airlineResult = await client.query(
            "SELECT id FROM airlines WHERE iata_code = $1::varchar(3)",
            [airlineCode],
          );
          airlineId = airlineResult.rows[0]?.id || null;
        }

        const flightCacheQuery = `   
          WITH flight_input AS (   
            SELECT   
              $1::integer AS origin_id,   
              $2::integer AS dest_id,   
              $3::integer AS airline_id,   
              $4::varchar(10) AS flight_number,   
              $5::timestamptz AS departure_time,   
              $6::timestamptz AS arrival_time,   
              $7::integer AS duration_minutes,   
              $8::numeric(10, 2) AS price,   
              $9::jsonb AS raw_data   
          )   
          INSERT INTO flights_cache (   
            origin_id, dest_id, airline_id, flight_number,   
            departure_time, arrival_time, duration_minutes, price, raw_data   
          )   
          SELECT   
            origin_id, dest_id, airline_id, flight_number,   
            departure_time, arrival_time, duration_minutes, price, raw_data   
          FROM flight_input   
          WHERE NOT EXISTS (   
            SELECT 1 FROM flights_cache   
            WHERE flight_number = flight_input.flight_number   
            AND departure_time = flight_input.departure_time   
          )   
          RETURNING id   
        `;

        let flightId;
        const cacheResult = await client.query(flightCacheQuery, [
          originId,
          destinationId,
          airlineId,
          flight.flightNumber,
          flight.departure.time,
          flight.arrival.time,
          flight.duration || 0,
          flight.price || totalPrice / flights.length,
          JSON.stringify(flight),
        ]);

        if (cacheResult.rows.length > 0) {
          flightId = cacheResult.rows[0].id;
        } else {
          const existingFlight = await client.query(
            "SELECT id FROM flights_cache WHERE flight_number = $1::varchar(10) AND departure_time = $2::timestamptz",
            [flight.flightNumber, flight.departure.time],
          );
          flightId = existingFlight.rows[0].id;
        }

        const legQuery = `   
          INSERT INTO booking_legs (   
            booking_id, flight_id, sequence, passenger_name   
          ) VALUES ($1, $2, $3, $4)   
          RETURNING id   
        `;

        await client.query(legQuery, [
          bookingId,
          flightId,
          index + 1,
          passengerName || "Passenger",
        ]);
      }

      const paymentResult = await paymentService.processPayment({
        bookingReference: bookingId,
        amount: totalPrice,
        currency: currency || "USD",
        paymentMethod: paymentMethod || "credit_card",
        userEmail,
      });

      await this.logPaymentAttempt(client, {
        bookingId,
        amount: totalPrice,
        status: paymentResult.success ? "success" : "failed",
        paymentMethod,
        transactionId: paymentResult.transactionId,
        errorMessage: paymentResult.error || null,
      });

      if (!paymentResult.success) {
        logger.warn(
          "Booking Service: Payment failed, rolling back transaction",
          {
            bookingId,
            error: paymentResult.error,
          },
        );

        await client.query("ROLLBACK");

        return {
          success: false,
          bookingReference: bookingId,
          error: "Payment failed",
          paymentError: paymentResult.error,
          errorCode: paymentResult.errorCode,
        };
      }

      await client.query(
        "UPDATE bookings SET status = $1, payment_status = $2 WHERE id = $3",
        ["confirmed", "paid", bookingId],
      );

      await client.query("COMMIT");

      const responseTime = Date.now() - startTime;

      logger.info("Booking Service: Booking created successfully", {
        bookingId,
        responseTime: `${responseTime}ms`,
      });

      return {
        success: true,
        bookingReference: bookingId,
        userEmail,
        totalPrice,
        currency: currency || "USD",
        status: "confirmed",
        paymentStatus: "paid",
        transactionId: paymentResult.transactionId,
        flights: flights.length,
        createdAt: booking.created_at,
        responseTime,
      };
    } catch (error) {
      await client.query("ROLLBACK");

      logger.error("Booking Service: Booking creation failed", {
        error: error.message,
        stack: error.stack,
      });

      throw error;
    } finally {
      client.release();
    }
  }

  async getBooking(bookingId) {
    try {
      const bookingQuery = `   
        SELECT * FROM bookings WHERE id = $1   
      `;
      const bookingResult = await this.pool.query(bookingQuery, [bookingId]);

      if (bookingResult.rows.length === 0) {
        return null;
      }

      const booking = bookingResult.rows[0];

      const legsQuery = `   
        SELECT    
          bl.id,   
          bl.sequence,   
          bl.passenger_name,   
          fc.flight_number,   
          fc.departure_time,   
          fc.arrival_time,   
          fc.duration_minutes,   
          fc.price,   
          origin.iata_code as origin_iata,   
          origin.name as origin_name,   
          origin.city as origin_city,   
          dest.iata_code as dest_iata,   
          dest.name as dest_name,   
          dest.city as dest_city,   
          al.name as airline_name,   
          al.iata_code as airline_iata   
        FROM booking_legs bl   
        JOIN flights_cache fc ON bl.flight_id = fc.id   
        JOIN airports origin ON fc.origin_id = origin.id   
        JOIN airports dest ON fc.dest_id = dest.id   
        LEFT JOIN airlines al ON fc.airline_id = al.id   
        WHERE bl.booking_id = $1    
        ORDER BY bl.sequence ASC   
      `;
      const legsResult = await this.pool.query(legsQuery, [booking.id]);

      return {
        bookingReference: booking.id,
        email: booking.email,
        status: booking.status,
        paymentStatus: booking.payment_status,
        totalPrice: parseFloat(booking.total_price),
        currency: booking.currency,
        createdAt: booking.created_at,
        legs: legsResult.rows.map((leg) => ({
          segment: leg.sequence,
          passengerName: leg.passenger_name,
          flightNumber: leg.flight_number,
          airline: {
            name: leg.airline_name,
            iata: leg.airline_iata,
          },
          departure: {
            airport: leg.origin_iata,
            name: leg.origin_name,
            city: leg.origin_city,
            time: leg.departure_time,
          },
          arrival: {
            airport: leg.dest_iata,
            name: leg.dest_name,
            city: leg.dest_city,
            time: leg.arrival_time,
          },
          duration: leg.duration_minutes,
          price: parseFloat(leg.price),
        })),
      };
    } catch (error) {
      logger.error("Booking Service: Failed to retrieve booking", {
        bookingId,
        error: error.message,
      });
      throw error;
    }
  }

  async logPaymentAttempt(client, data) {
    const query = `   
      INSERT INTO payment_attempts (   
        booking_id, amount, status, payment_method, transaction_id, error_message   
      ) VALUES ($1, $2, $3, $4, $5, $6)   
    `;

    await client.query(query, [
      data.bookingId,
      data.amount,
      data.status,
      data.paymentMethod,
      data.transactionId,
      data.errorMessage,
    ]);
  }

  async getPaymentAttempts(bookingId) {
    const query = `   
      SELECT * FROM payment_attempts    
      WHERE booking_id = $1    
      ORDER BY attempted_at DESC   
    `;

    const result = await this.pool.query(query, [bookingId]);
    return result.rows;
  }
}

module.exports = new BookingService();
