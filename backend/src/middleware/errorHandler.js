/**
 * Global Error Handler Middleware
 * Catches and formats all unhandled errors
<<<<<<< Updated upstream
 * 
 * @module middleware/errorHandler
 */

const logger = require('../utils/logger');
=======
 *
 * @module middleware/errorHandler
 */

const logger = require("../utils/logger");
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
  const message = err.message || 'Internal Server Error';
=======
  const message = err.message || "Internal Server Error";
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
=======
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
>>>>>>> Stashed changes
    },
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
<<<<<<< Updated upstream
};
=======
};
>>>>>>> Stashed changes
