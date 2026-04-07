/**
 * Global Error Handler Middleware
 * Catches and formats all unhandled errors
 * 
 * @module middleware/errorHandler
 */

const logger = require('../utils/logger');

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      stack: err.stack,
    });
  } else {
    logger.warn(`${statusCode} - ${message}`, {
      method: req.method,
      url: req.originalUrl,
    });
  }

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};