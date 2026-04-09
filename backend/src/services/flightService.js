const adapters = require("../adapters");   
const normalizer = require("../utils/normalizer");   
const cacheService = require("./cacheService");   
const logger = require("../utils/logger");   
 
/**   
* Flight Service with Caching   
* Orchestrates flight search with cache-first strategy   
*/   
class FlightService {   
 /**   
  * Search flights with cache-first strategy   
  * @param {Object} params - Search parameters   
  * @returns {Promise<Array>} Normalized flight data   
  */   
 async searchFlights(params) {   
   logger.info("Flight Service: Searching flights", { params });   
  
   // Try cache first   
   const cachedData = await cacheService.get(params);   
   if (cachedData) {   
     logger.info("Flight Service: Using cached data");   
     return cachedData;   
   }   
  
   // Cache miss - fetch from APIs   
   logger.info("Flight Service: Cache miss, fetching from APIs");   
  
   try {   
     // Use adapter layer   
     const rawFlights = await adapters.searchFlights(params);   
  
     // Normalize data   
     const normalizedFlights = rawFlights   
       .map((flight) => {   
         if (flight.source === "aviationstack") {   
           return normalizer.normalizeAviationstackFlight(flight);   
         } else if (flight.source === "airlabs") {   
           return normalizer.normalizeAirlabsFlight(flight);   
         }   
         return null;   
       })   
       .filter((flight) => flight !== null);   
  
     logger.info(   
       `Flight Service: Normalized ${normalizedFlights.length} flights`   
     );   
  
     // Store in cache for future requests   
     if (normalizedFlights.length > 0) {   
       await cacheService.set(   
         params,   
         normalizedFlights,   
         rawFlights[0]?.source || "unknown"   
       );   
     }   
  
     return normalizedFlights;   
   } catch (error) {   
     logger.error("Flight Service: Search failed", {   
       error: error.message,   
     });   
  
     // Cache fallback when API is unavailable   
     logger.info("Flight Service: Attempting cache fallback");   
     const fallbackData = await this.getCacheFallback(params);   
     if (fallbackData) {   
       logger.info("Flight Service: Using expired cache as fallback");   
       return fallbackData;   
     }   
  
     throw error;   
   }   
 }   
  
 /**   
  * Get expired cache as fallback when API fails   
  * @param {Object} params - Search parameters   
  * @returns {Promise<Array|null>} Cached data or null   
  */   
 async getCacheFallback(params) {   
   const cacheKey = cacheService.generateCacheKey(params);   
  
   try {   
     const query = `   
       SELECT response_data   
       FROM api_cache   
       WHERE cache_key = $1   
       ORDER BY created_at DESC   
       LIMIT 1   
     `;   
  
     const result = await cacheService.pool.query(query, [cacheKey]);   
  
     if (result.rows.length > 0) {   
       return result.rows[0].response_data;   
     }   
  
     return null;   
   } catch (error) {   
     logger.error("Cache fallback failed", { error: error.message });   
     return null;   
   }   
 }   
}   
  
module.exports = new FlightService();   
 