const logger = require('../utils/logger');

/**
 * US-06: External API Configuration
 * Handles API keys, endpoints, and validation
 */
const apiConfig = {
  aviationstack: {
    baseUrl: 'http://api.aviationstack.com/v1',
    apiKey: process.env.AVIATIONSTACK_API_KEY,
    timeout: 2000, // 2 seconds max response time
    endpoints: {
      flights: '/flights',
      airports: '/airports',
      airlines: '/airlines'
    }
  },
  airlabs: {
    baseUrl: 'https://airlabs.co/api/v9',
    apiKey: process.env.AIRLABS_API_KEY,
    timeout: 2000, // 2 seconds max response time
    endpoints: {
      flights: '/flights',
      airports: '/airports',
      airlines: '/airlines'
    }
  }
};

/**
 * Validate that all required API keys are present
 * Logs warnings if keys are missing
 */
const validateApiKeys = () => {
  const missingKeys = [];
  
  if (!apiConfig.aviationstack.apiKey) {
    missingKeys.push('AVIATIONSTACK_API_KEY');  // ✅ CORRECT - Environment variable name
  }
  
  if (!apiConfig.airlabs.apiKey) {
    missingKeys.push('AIRLABS_API_KEY');  // ✅ CORRECT - Environment variable name
  }
  
  if (missingKeys.length > 0) {
    logger.warn(`Missing API keys: ${missingKeys.join(', ')}`);
    logger.warn('Some API features may not work correctly');
    return false;
  }
  
  logger.info('✅ All API keys configured successfully');
  return true;
};

// Validate on module load
validateApiKeys();

module.exports = apiConfig;