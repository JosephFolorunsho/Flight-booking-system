const logger = require("../utils/logger");
const graphService = require("./graphService");

class BFSService {
  /**
   * Find routes using BFS algorithm
   * @param {string} origin - Origin airport IATA code
   * @param {string} destination - Destination airport IATA code
   * @param {number} maxStops - Maximum number of stops (default: 2)
   * @returns {Array} - Array of route paths
   */
  findRoutes(origin, destination, maxStops = 2) {
    const startTime = Date.now();

    // Validate inputs
    if (!origin || !destination) {
      throw new Error("Origin and destination are required");
    }

    if (origin === destination) {
      throw new Error("Origin and destination cannot be the same");
    }

    // Check if airports exist in graph
    if (!graphService.hasAirport(origin)) {
      logger.warn(`Origin airport not found in graph: ${origin}`);
      return [];
    }

    if (!graphService.hasAirport(destination)) {
      logger.warn(`Destination airport not found in graph: ${destination}`);
      return [];
    }

    const routes = [];
    const queue = [{ airport: origin, path: [], stops: 0 }];
    const visited = new Set(); // Prevent infinite loops

    // console.log("OUTGOING FROM LHR:", graphService.getOutgoingFlights("LHR"));

    while (queue.length > 0) {
      const { airport, path, stops } = queue.shift();

      // Check if we've reached destination
      if (airport === destination && path.length > 0) {
        routes.push({
          path: [...path],
          stops: stops - 1, // Number of stops = number of flights - 1
          totalFlights: path.length,
        });
        continue; // Continue searching for other routes
      }

      // Stop if max stops exceeded
      if (stops > maxStops) {
        continue;
      }

      // Get outgoing flights
      const outgoingFlights = graphService.getOutgoingFlights(airport);

      // Explore each outgoing flight
      outgoingFlights.forEach((flight) => {
        const nextAirport = flight.arrivalAirport;
        const visitKey = `${airport}-${nextAirport}-${stops}`;

        // Avoid revisiting same airport at same depth (prevent loops)
        if (!visited.has(visitKey)) {
          visited.add(visitKey);

          queue.push({
            airport: nextAirport,
            path: [...path, flight],
            stops: stops + 1,
          });
        }

        console.log("CURRENT:", airport, "STOPS:", stops);
        // console.log(
        //   "PATH:",
        //   path.map((f) => f.arrivalAirport),
        // );
        // console.log("QUEUE SIZE:", queue.length);
      });
    }

    const executionTime = Date.now() - startTime;

    logger.info("BFS route search completed", {
      origin,
      destination,
      routesFound: routes.length,
      executionTime: `${executionTime}ms`,
    });

    // Validate execution time (should be under 1 second)
    if (executionTime > 1000) {
      logger.warn("BFS execution time exceeded 1 second", { executionTime });
    }

    // Sort routes by number of stops (shortest first)
    return routes.sort((a, b) => a.stops - b.stops);
  }

  /**
   * Find direct flights only
   * @param {string} origin - Origin airport IATA code
   * @param {string} destination - Destination airport IATA code
   * @returns {Array} - Array of direct flights
   */
  findDirectFlights(origin, destination) {
    const outgoingFlights = graphService.getOutgoingFlights(origin);
    return outgoingFlights.filter(
      (flight) => flight.arrivalAirport === destination,
    );
  }

  /**
   * Check if route exists between two airports
   * @param {string} origin - Origin airport IATA code
   * @param {string} destination - Destination airport IATA code
   * @param {number} maxStops - Maximum number of stops
   * @returns {boolean}
   */
  routeExists(origin, destination, maxStops = 2) {
    const routes = this.findRoutes(origin, destination, maxStops);
    return routes.length > 0;
  }
}

module.exports = new BFSService();
