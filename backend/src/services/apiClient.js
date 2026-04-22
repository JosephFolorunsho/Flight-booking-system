const axios = require('axios');
const logger = require('../utils/logger');


class ApiClient {
  constructor(config) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout
    });
    
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('API Request', {
          method: config.method,
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('API Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info('API Response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        logger.error('API Response Error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a GET request with error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response
   */
  async get(endpoint, params = {}) {
    const startTime = Date.now();
    
    try {
      const response = await this.client.get(endpoint, { params });
      const responseTime = Date.now() - startTime;
      
      // Check response time requirement (< 2 seconds)
      if (responseTime > 2000) {
        logger.warn('API response time exceeded 2 seconds', {
          endpoint,
          responseTime
        });
      } else {
        logger.info(`API response time: ${responseTime}ms`, { endpoint });
      }
      
      // Validate HTTP 200 response
      if (response.status !== 200) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      return response.data;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Enhanced error handling
      if (error.response) {
        // Server responded with error status
        logger.error('API Error Response', {
          status: error.response.status,
          data: error.response.data,
          endpoint,
          responseTime
        });
        throw new Error(`API error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        // Request made but no response
        logger.error('API No Response', {
          endpoint,
          responseTime,
          message: error.message
        });
        throw new Error('API request timeout or no response');
      } else {
        // Error in request setup
        logger.error('API Request Setup Error', {
          endpoint,
          message: error.message
        });
        throw new Error(`API request error: ${error.message}`);
      }
    }
  }
}

module.exports = ApiClient;