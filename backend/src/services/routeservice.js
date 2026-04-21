const logger = require('../utils/logger');   
const graphService = require('./graphService');   
const bfsService = require('./bfsService');   
const layoverValidator = require('./layoverValidator');   
   
class RouteService {   
  /**   
   * Search for routes between two airports   
   * @param {string} origin - Origin airport IATA code   
   * @param {string} destination - Destination airport IATA code   
   * @param {Array} flights - Available flights   
   * @param {Object} options - Search options   
   * @returns {Object} - Search results   
   */   
  async searchRoutes(origin, destination, flights, options = {}) {   
    const startTime = Date.now();   
   
    // Default options   
    const {   
      maxStops = 2,   
      includeInvalid = false   
    } = options;   
   
    // Build graph from flights   
    graphService.buildGraph(flights);   
   
    // Find routes using BFS   
    const allRoutes = bfsService.findRoutes(origin, destination, maxStops);   
   
    if (allRoutes.length === 0) {   
      logger.info('No routes found', { origin, destination });   
      return {   
        origin,   
        destination,   
        routes: [],   
        count: 0,   
        searchTime: Date.now() - startTime   
      };   
    }   
   
    // Validate layover times   
    const validRoutes = layoverValidator.filterValidRoutes(allRoutes);   
   
    // Remove duplicates   
    const uniqueRoutes = this.removeDuplicateRoutes(validRoutes);   
   
    // Sort by number of stops (direct first, then 1-stop, then 2-stop)   
    const sortedRoutes = uniqueRoutes.sort((a, b) => {   
      if (a.stops !== b.stops) {   
        return a.stops - b.stops; // Fewer stops first   
      }   
      // If same stops, sort by total journey time   
      return a.journeyTime.totalMinutes - b.journeyTime.totalMinutes;   
    });   
   
    // Format routes for response   
    const formattedRoutes = sortedRoutes.map(route => this.formatRoute(route));   
   
    const searchTime = Date.now() - startTime;   
   
    logger.info('Route search completed', {   
      origin,   
      destination,   
      totalRoutesFound: allRoutes.length,   
      validRoutes: validRoutes.length,   
      uniqueRoutes: uniqueRoutes.length,   
      searchTime: `${searchTime}ms`   
    });   
   
    return {   
      origin,   
      destination,   
      routes: formattedRoutes,   
      count: formattedRoutes.length,   
      searchTime,   
      stats: {   
        totalFound: allRoutes.length,   
        validRoutes: validRoutes.length,   
        invalidRoutes: allRoutes.length - validRoutes.length   
      }   
    };   
  }   
   
  /**   
   * Remove duplicate routes   
   * @param {Array} routes - Array of routes   
   * @returns {Array} - Unique routes   
   */   
  removeDuplicateRoutes(routes) {   
    const seen = new Set();   
    return routes.filter(route => {   
      const key = route.path.map(f => f.flightNumber).join('-');   
      if (seen.has(key)) {   
        return false;   
      }   
      seen.add(key);   
      return true;   
    });   
  }   
   
  /**   
   * Format route for API response   
   * @param {Object} route - Route object   
   * @returns {Object} - Formatted route   
   */   
  formatRoute(route) {   
    return {   
      type: this.getRouteType(route.stops),   
      stops: route.stops,   
      flights: route.path.map((flight, index) => ({   
        segment: index + 1,   
        flightNumber: flight.flightNumber,   
        airline: flight.airline,   
        departure: {   
          airport: flight.departureAirport,   
          time: flight.departureTime   
        },   
        arrival: {   
          airport: flight.arrivalAirport,   
          time: flight.arrivalTime   
        },   
        duration: flight.duration   
      })),   
      layovers: route.validation.layovers.map(layover => ({   
        airport: layover.airport,   
        duration: layover.layoverMinutes,   
        durationFormatted: this.formatDuration(layover.layoverMinutes)   
      })),   
      totalDuration: route.journeyTime.totalMinutes,   
      totalDurationFormatted: this.formatDuration(route.journeyTime.totalMinutes),   
      isOvernight: route.journeyTime.isOvernight   
    };   
  }   
   
  /**   
   * Get route type based on stops   
   * @param {number} stops - Number of stops   
   * @returns {string} - Route type   
   */   
  getRouteType(stops) {   
    if (stops === 0) return 'direct';   
    if (stops === 1) return '1-stop';   
    if (stops === 2) return '2-stop';   
    return `${stops}-stop`;   
  }   
   
  /**   
   * Format duration in minutes to human-readable format   
   * @param {number} minutes - Duration in minutes   
   * @returns {string} - Formatted duration   
   */   
  formatDuration(minutes) {   
    const hours = Math.floor(minutes / 60);   
    const mins = minutes % 60;   
    return `${hours}h ${mins}m`;   
  }   
}   
   
module.exports = new RouteService();   
 