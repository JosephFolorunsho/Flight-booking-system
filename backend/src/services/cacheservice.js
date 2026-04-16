const { Pool } = require("pg");   
const logger = require("../utils/logger");   
 
/**   
* API Response Cache Service   
* Stores and retrieves API responses from PostgreSQL JSONB    
*/   
class CacheService {   
 constructor() {   
   this.pool = new Pool({   
     user: process.env.POSTGRES_USER || "skyroute",   
     host: process.env.POSTGRES_HOST || "localhost",   
     database: process.env.POSTGRES_DB || "skyroute_db",   
     password: process.env.POSTGRES_PASSWORD || "skyroute_secret",   
     port: process.env.POSTGRES_PORT || 5432,   
   });   
  
   this.TTL_HOURS = 24;   
 }   
  
 /**   
  * Generate cache key from search parameters   
  * @param {Object} params - Search parameters   
  * @returns {string} Cache key   
  */   
 generateCacheKey(params) {   
   const { origin, destination, date } = params;   
   return `${origin}_${destination}_${date || "any"}`.toUpperCase();   
 }   
  
 /**   
  * Get cached response   
  * @param {Object} params - Search parameters   
  * @returns {Promise<Object|null>} Cached data or null   
  */   
 async get(params) {   
   const startTime = Date.now();   
   const cacheKey = this.generateCacheKey(params);   
  
   try {   
     const query = `   
       SELECT response_data, source, created_at, expires_at, hit_count   
       FROM api_cache   
       WHERE cache_key = $1 AND expires_at > NOW()   
     `;   
  
     const result = await this.pool.query(query, [cacheKey]);   
     const queryTime = Date.now() - startTime;   
  
     if (result.rows.length === 0) {   
       logger.info("Cache miss", { cacheKey, queryTime });   
       return null;   
     }   
  
     // Update hit count   
     await this.pool.query(   
       "UPDATE api_cache SET hit_count = hit_count + 1 WHERE cache_key = $1",   
       [cacheKey]   
     );   
  
     const cached = result.rows[0];   
     logger.info("Cache hit", {   
       cacheKey,   
       source: cached.source,   
       age: Date.now() - new Date(cached.created_at).getTime(),   
       hitCount: cached.hit_count + 1,   
       queryTime,   
     });   
  
     // Database queries execute under 200ms   
     if (queryTime > 200) {   
       logger.warn("Cache query exceeded 200ms threshold", {   
         queryTime,   
         cacheKey,   
       });   
     }   
  
     return cached.response_data;   
   } catch (error) {   
     logger.error("Cache retrieval failed", {   
       error: error.message,   
       cacheKey,   
     });   
     return null;   
   }   
 }   
  
 /**   
  * Store response in cache   
  * @param {Object} params - Search parameters   
  * @param {Object} data - API response data   
  * @param {string} source - API source (aviationstack or airlabs)   
  * @returns {Promise<boolean>} Success status   
  */   
 async set(params, data, source) {   
   const cacheKey = this.generateCacheKey(params);   
  
   try {   
     const expiresAt = new Date();   
     expiresAt.setHours(expiresAt.getHours() + this.TTL_HOURS);   
  
     const query = `   
       INSERT INTO api_cache (cache_key, response_data, source, expires_at)   
       VALUES ($1, $2, $3, $4)   
       ON CONFLICT (cache_key)    
       DO UPDATE SET    
         response_data = $2,   
         source = $3,   
         created_at = CURRENT_TIMESTAMP,   
         expires_at = $4,   
         hit_count = 0   
     `;   
  
     await this.pool.query(query, [   
       cacheKey,   
       JSON.stringify(data),   
       source,   
       expiresAt,   
     ]);   
  
     logger.info("Cache stored", {   
       cacheKey,   
       source,   
       ttl: `${this.TTL_HOURS} hours`,   
       expiresAt,   
     });   
  
     return true;   
   } catch (error) {   
     logger.error("Cache storage failed", {   
       error: error.message,   
       cacheKey,   
     });   
     return false;   
   }   
 }   
  
 /**   
  * Clear expired cache entries   
  * @returns {Promise<number>} Number of entries cleared   
  */   
 async clearExpired() {   
   try {   
     const result = await this.pool.query(   
       "DELETE FROM api_cache WHERE expires_at < NOW() RETURNING id"   
     );   
  
     const count = result.rowCount;   
     logger.info("Expired cache cleared", { count });   
     return count;   
   } catch (error) {   
     logger.error("Cache cleanup failed", { error: error.message });   
     return 0;   
   }   
 }   
  
 /**   
  * Get cache statistics   
  * @returns {Promise<Object>} Cache stats   
  */   
 async getStats() {   
   try {   
     const result = await this.pool.query(`   
       SELECT    
         COUNT(*) as total_entries,   
         SUM(hit_count) as total_hits,   
         AVG(hit_count) as avg_hits_per_entry,   
         COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_entries,   
         COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_entries   
       FROM api_cache   
     `);   
  
     return result.rows[0];   
   } catch (error) {   
     logger.error("Cache stats failed", { error: error.message });   
     return null;   
   }   
 }   
}   
  
module.exports = new CacheService();  