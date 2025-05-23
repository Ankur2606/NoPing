/**
 * Simple logging utility for consistent log formatting
 */
const logger = {
  info: (message, data = '') => {
    console.log(`[INFO] ${message}`, data);
  },
  
  error: (message, error = '') => {
    console.error(`[ERROR] ${message}`, error);
  },
  
  warn: (message, data = '') => {
    console.warn(`[WARN] ${message}`, data);
  },
  
  debug: (message, data = '') => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }
};

module.exports = logger;
