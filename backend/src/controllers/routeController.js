const routeService = require('../services/routeservice');
const flightService = require('../services/flightService');
const logger = require('../utils/logger');   
   
class RouteController {   
  /**   
   * Search for routes between two airports   
   * POST /api/routes/search   
   */   
  async searchRoutes(req, res) {   
    try {   
      const { origin, destination, maxStops } = req.body;   
   
      // Validate required fields   
      if (!origin || !destination) {   
        return res.status(400).json({   
          error: {   
            code: 'MISSING_FIELDS',   
            message: 'Missing required fields: origin, destination'   
          }   
        });   
      }   
   
      // Validate IATA codes   
      const iataRegex = /^[A-Z]{3}$/;   
      if (!iataRegex.test(origin) || !iataRegex.test(destination)) {   
        return res.status(400).json({   
          error: {   
            code: 'INVALID_IATA',   
            message: 'Invalid IATA code format. Must be 3 uppercase letters.'   
          }   
        });   
      }   
   
      if (origin === destination) {   
        return res.status(400).json({   
          error: {   
            code: 'SAME_AIRPORT',   
            message: 'Origin and destination cannot be the same'   
          }   
        });   
      }   
   
      // Get all available flights (from cache or API)   
      const flightData = await flightService.getAllFlights();   
   
      if (!flightData || flightData.length === 0) {   
        return res.status(404).json({   
          error: {   
            code: 'NO_FLIGHTS',   
            message: 'No flight data available'   
          }   
        });   
      }   
   
      // Search for routes   
      const result = await routeService.searchRoutes(   
        origin,   
        destination,   
        flightData,   
        { maxStops: maxStops || 2 }   
      );   
   
      res.json(result);   
   
    } catch (error) {   
      logger.error('Route search error', { error: error.message, stack: error.stack });   
      res.status(500).json({   
        error: {   
          code: 'INTERNAL_ERROR',   
          message: 'An error occurred while searching for routes'   
        }   
      });   
    }   
  }   
   
  /**   
   * Get graph statistics   
   * GET /api/routes/graph/stats   
   */   
  async getGraphStats(req, res) {   
    try {   
      const graphService = require('../services/graphService');   
      const stats = graphService.getStats();   
      const validation = graphService.validateGraph();   
   
      res.json({   
        stats,   
        validation   
      });   
   
    } catch (error) {   
      logger.error('Graph stats error', { error: error.message });   
      res.status(500).json({   
        error: {   
          code: 'INTERNAL_ERROR',   
          message: 'An error occurred while retrieving graph statistics'   
        }   
      });   
    }   
  }   
}   
   
module.exports = new RouteController();   
