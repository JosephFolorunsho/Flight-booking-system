
const logger = require('../utils/logger');   
   
class LayoverValidator {   
  constructor() {   
    this.MIN_LAYOVER_MINUTES = 90;   
    this.MAX_LAYOVER_HOURS = 24; // Maximum reasonable layover   
  }   
   
  /**   
   * Validate layover time between two flights   
   * @param {Object} flight1 - First flight   
   * @param {Object} flight2 - Second flight (connecting)   
   * @returns {Object} - Validation result   
   */   
  validateLayover(flight1, flight2) {   
    // Ensure flight1 arrives before flight2 departs   
    if (flight1.arrivalAirport !== flight2.departureAirport) {   
      return {   
        valid: false,   
        reason: 'Flights do not connect at same airport',   
        layoverMinutes: null   
      };   
    }   
   
    const arrivalTime = new Date(flight1.arrivalTime);   
    const departureTime = new Date(flight2.departureTime);   
   
    // Calculate layover in minutes   
    const layoverMs = departureTime - arrivalTime;   
    const layoverMinutes = Math.floor(layoverMs / (1000 * 60));   
   
    // Check if layover is negative   
    if (layoverMinutes < 0) {   
      return {   
        valid: false,   
        reason: 'Second flight departs before first flight arrives',   
        layoverMinutes   
      };   
    }   
   
    // Check minimum layover   
    if (layoverMinutes < this.MIN_LAYOVER_MINUTES) {   
      return {   
        valid: false,   
        reason: `Layover too short (${layoverMinutes} min < ${this.MIN_LAYOVER_MINUTES} min)`,   
        layoverMinutes   
      };   
    }   
   
    // Check maximum layover (optional - for realistic routes)   
    const layoverHours = layoverMinutes / 60;   
    if (layoverHours > this.MAX_LAYOVER_HOURS) {   
      logger.warn('Layover exceeds 24 hours', {   
        flight1: flight1.flightNumber,   
        flight2: flight2.flightNumber,   
        layoverHours: layoverHours.toFixed(2)   
      });   
    }   
   
    return {   
      valid: true,   
      layoverMinutes,   
      layoverHours: layoverHours.toFixed(2)   
    };   
  }   
   
  /**   
   * Validate entire route (multiple flights)   
   * @param {Array} flights - Array of flights in sequence   
   * @returns {Object} - Validation result   
   */   
  validateRoute(flights) {   
    if (!flights || flights.length === 0) {   
      return { valid: false, reason: 'No flights provided' };   
    }   
   
    if (flights.length === 1) {   
      return { valid: true, layovers: [] }; // Direct flight, no layovers   
    }   
   
    const layovers = [];   
    const invalidLayovers = [];   
   
    for (let i = 0; i < flights.length - 1; i++) {   
      const validation = this.validateLayover(flights[i], flights[i + 1]);   
         
      layovers.push({   
        airport: flights[i].arrivalAirport,   
        ...validation   
      });   
   
      if (!validation.valid) {   
        invalidLayovers.push({   
          index: i,   
          airport: flights[i].arrivalAirport,   
          reason: validation.reason   
        });   
      }   
    }   
   
    return {   
      valid: invalidLayovers.length === 0,   
      layovers,   
      invalidLayovers,   
      totalLayoverTime: layovers.reduce((sum, l) => sum + (l.layoverMinutes || 0), 0)   
    };   
  }   
   
  /**   
   * Calculate total journey time   
   * @param {Array} flights - Array of flights in sequence   
   * @returns {Object} - Journey time details   
   */   
  calculateJourneyTime(flights) {   
    if (!flights || flights.length === 0) {   
      return null;   
    }   
   
    const departureTime = new Date(flights[0].departureTime);   
    const arrivalTime = new Date(flights[flights.length - 1].arrivalTime);   
   
    const totalMs = arrivalTime - departureTime;   
    const totalMinutes = Math.floor(totalMs / (1000 * 60));   
    const totalHours = (totalMinutes / 60).toFixed(2);   
   
    return {   
      departureTime: departureTime.toISOString(),   
      arrivalTime: arrivalTime.toISOString(),   
      totalMinutes,   
      totalHours,   
      isOvernight: departureTime.getDate() !== arrivalTime.getDate()   
    };   
  }   
   
  /**   
   * Filter valid routes from array of routes   
   * @param {Array} routes - Array of route objects   
   * @returns {Array} - Array of valid routes   
   */   
  filterValidRoutes(routes) {   
    return routes.filter(route => {   
      const validation = this.validateRoute(route.path);   
      return validation.valid;   
    }).map(route => ({   
      ...route,   
      validation: this.validateRoute(route.path),   
      journeyTime: this.calculateJourneyTime(route.path)   
    }));   
  }   
}   
   
module.exports = new LayoverValidator();   
 