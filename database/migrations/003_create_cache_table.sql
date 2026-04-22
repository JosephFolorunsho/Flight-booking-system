-- API Response Cache Table   
-- Stores API responses in JSONB format with 24-hour TTL   
  
CREATE TABLE IF NOT EXISTS api_cache (   
   id SERIAL PRIMARY KEY,   
   cache_key VARCHAR(255) UNIQUE NOT NULL,   
   response_data JSONB NOT NULL,   
   source VARCHAR(50) NOT NULL,   
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   
   expires_at TIMESTAMP NOT NULL,   
   hit_count INTEGER DEFAULT 0   
);   
  
-- Index for fast cache key lookups (under 200ms requirement)   
CREATE INDEX idx_cache_key ON api_cache(cache_key);   
  
-- Index for expiration cleanup   
CREATE INDEX idx_expires_at ON api_cache(expires_at);   
  
-- Index for source tracking   
CREATE INDEX idx_source ON api_cache(source);   
  
COMMENT ON TABLE api_cache IS 'Caches API responses to reduce rate limit usage';   
COMMENT ON COLUMN api_cache.cache_key IS 'Unique key: origin_destination_date';   
COMMENT ON COLUMN api_cache.response_data IS 'Raw API response in JSONB format';   
COMMENT ON COLUMN api_cache.source IS 'API source: aviationstack or airlabs';   
COMMENT ON COLUMN api_cache.expires_at IS 'Cache TTL: 24 hours from creation';   
COMMENT ON COLUMN api_cache.hit_count IS 'Number of times cache was used';   
 