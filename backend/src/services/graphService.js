const logger = require('../utils/logger');   
   
class GraphService {   
  constructor() {   
    this.graph = new Map(); // adjacency list: airport -> [flights]   
    this.airports = new Set(); // all unique airports   
  }   
   
  /**   
   * Build graph from flight data   
   * @param {Array} flights - Array of normalized flight objects   
   * @returns {Object} - Graph statistics   
   */   
  buildGraph(flights) {   
    const startTime = Date.now();   
       
    // Clear existing graph   
    this.graph.clear();   
    this.airports.clear();   
   
    if (!flights || flights.length === 0) {   
      logger.warn('No flights provided to build graph');   
      return { nodes: 0, edges: 0, buildTime: 0 };   
    }   

    let validEdgeCount = 0;
    
    // Build adjacency list   
    flights.forEach(flight => {   
      const origin = flight.departureAirport;   
      const destination = flight.arrivalAirport;   
   
      // Validate flight data   
      if (!origin || !destination) {   
        logger.warn('Flight missing origin or destination', { flight });   
        return;   
      }   
   
      // Add airports to set (nodes)   
      this.airports.add(origin);   
      this.airports.add(destination);   
   
      // Add flight to adjacency list (edges)   
      if (!this.graph.has(origin)) {   
        this.graph.set(origin, []);   
      }   
      this.graph.get(origin).push(flight);   
      validEdgeCount++;
    });   
   
    const buildTime = Date.now() - startTime;   
    const stats = {   
      nodes: this.airports.size,   
      edges: validEdgeCount, 
      buildTime   
    };   
   
    logger.info('Graph built successfully', stats);   
    return stats;   
  }   
   
  /**   
   * Get all outgoing flights from an airport   
   * @param {string} airport - IATA code   
   * @returns {Array} - Array of flights   
   */   
  getOutgoingFlights(airport) {   
    return this.graph.get(airport) || [];   
  }   
   
  /**   
   * Check if airport exists in graph   
   * @param {string} airport - IATA code   
   * @returns {boolean}   
   */   
  hasAirport(airport) {   
    return this.airports.has(airport);   
  }   
   
  /**   
   * Get all airports in graph   
   * @returns {Array} - Array of airport IATA codes   
   */   
  getAllAirports() {   
    return Array.from(this.airports);   
  }   
   
  /**   
   * Get graph statistics   
   * @returns {Object}   
   */   
  getStats() {   
    return {   
      totalNodes: this.airports.size,   
      totalEdges: Array.from(this.graph.values()).reduce((sum, flights) => sum + flights.length, 0),   
      avgDegree: this.airports.size > 0    
        ? (Array.from(this.graph.values()).reduce((sum, flights) => sum + flights.length, 0) / this.airports.size).toFixed(2)   
        : 0   
    };   
  }   
   
  /**   
   * Validate graph integrity   
   * @returns {Object} - Validation results   
   */   
  validateGraph() {   
    const issues = [];   
   
    // Check for duplicate nodes   
    const airportArray = Array.from(this.airports);   
    const uniqueAirports = new Set(airportArray);   
    if (airportArray.length !== uniqueAirports.size) {   
      issues.push('Duplicate nodes detected');   
    }   
   
    // Check for missing destination airports   
    this.graph.forEach((flights, origin) => {   
      flights.forEach(flight => {   
        if (!this.airports.has(flight.arrivalAirport)) {   
          issues.push(`Missing destination node: ${flight.arrivalAirport}`);   
        }   
      });   
    });   
   
    return {   
      valid: issues.length === 0,   
      issues   
    };   
  }   
  
  /**   
   * Detect orphaned nodes (nodes with no outgoing edges)   
   * @returns {Array} - Array of orphaned airport codes   
   */   
  getOrphanedNodes() {   
    const orphaned = [];   
    this.airports.forEach(airport => {   
      if (!this.graph.has(airport)) {   
        orphaned.push(airport);   
      }   
    });   
    return orphaned;   
  }   
   
  /**   
   * Clear the graph   
   */   
  clear() {   
    this.graph.clear();   
    this.airports.clear();   
  }   
}   
   
module.exports = new GraphService(); 