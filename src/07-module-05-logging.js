  /* ============================================================================
   * 5. LOGGING MODULE - START
   * ============================================================================
   * Unified logging system with production/debug modes and categories
   */

  /**
   * Unified logging system with production/debug modes
   * @namespace Logger
   */
  const Logger = (() => {
    // Configuration
    const PRODUCTION = CONFIG.DEBUG.PRODUCTION;
    const DEBUG_FLAGS = CONFIG.DEBUG.FLAGS;

    // Logging levels
    const LogLevel = {
      NONE: 0,
      ERROR: 1,
      WARN: 2,
      INFO: 3,
      DEBUG: 4,
    };

    const CURRENT_LOG_LEVEL = PRODUCTION ? LogLevel.WARN : LogLevel.DEBUG;
    const tooltipContainer = null;

    /**
     * Core logging function with level and category support
     * @private
     * @param {number} level - Log level
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {*} [data] - Optional data to log
     */
    function log(level, category, message, data) {
      if (level > CURRENT_LOG_LEVEL) return;

      const prefix = `[${category}]`;
      const args =
        data !== undefined ? [prefix, message, data] : [prefix, message];

      if (level === LogLevel.ERROR) console.error(...args);
      else if (level === LogLevel.WARN) console.warn(...args);
      else if (level === LogLevel.INFO && CURRENT_LOG_LEVEL != PRODUCTION)
        console.log(...args);
    }

    /**
     * Debug log for specific debug flags
     * @param {string} flag - Debug flag to check
     * @param {string} message - Log message
     * @param {*} [data] - Optional data
     */
    function debugLog(flag, message, data = null) {
      if (!PRODUCTION && DEBUG_FLAGS[flag]) {
        const timestamp = new Date().toLocaleTimeString();
        log(LogLevel.DEBUG, `DEBUG-${flag}`, `${timestamp} ${message}`, data);
      }
    }

    /**
     * Debug error logging
     * @param {string} flag - Debug flag to check
     * @param {string} message - Error message
     * @param {Error} error - Error object
     * @param {Object} [context] - Additional context
     */
    function debugError(flag, message, error, context = {}) {
      if (DEBUG_FLAGS[flag] || DEBUG_FLAGS.ERROR_TRACKING) {
        const timestamp = new Date().toLocaleTimeString();
        log(LogLevel.ERROR, `ERROR-${flag}`, `${timestamp} ${message}`, {
          error: error,
          context: context,
          stack: error?.stack,
        });
      }
    }

    // Public API
    const api = {
      // Core logging methods
      error: (cat, msg, data) => log(LogLevel.ERROR, cat, msg, data),
      warn: (cat, msg, data) => log(LogLevel.WARN, cat, msg, data),
      info: (cat, msg, data) => log(LogLevel.INFO, cat, msg, data),
      debug: (cat, msg, data) => log(LogLevel.DEBUG, cat, msg, data),

      // Debug logging methods
      debugLog,
      debugError,

      // Legacy support methods
      productionLog: (...args) => {
        const message = String(args[0] || "");
        const categoryMatch = message.match(/^\[([A-Z][A-Z-]*)\]/);
        const category = categoryMatch ? categoryMatch[1] : "LEGACY";
        api.info(category, ...args);
      },
      productionWarn: (...args) => {
        const message = String(args[0] || "");
        const categoryMatch = message.match(/^\[([A-Z][A-Z-]*)\]/);
        const category = categoryMatch ? categoryMatch[1] : "LEGACY";
        api.warn(category, ...args);
      },
      productionError: (...args) => {
        const message = String(args[0] || "");
        const categoryMatch = message.match(/^\[([A-Z][A-Z-]*)\]/);
        const category = categoryMatch ? categoryMatch[1] : "LEGACY";
        api.error(category, ...args);
      },
    };

    return api;
  })();

  // Export legacy function names for compatibility
  const logError = Logger.error;
  const logWarn = Logger.warn;
  const logInfo = Logger.info;
  const logDebug = Logger.debug;
  const debugLog = Logger.debugLog;
  const debugError = Logger.debugError;
  const productionLog = Logger.productionLog;
  const productionWarn = Logger.productionWarn;
  const productionError = Logger.productionError;

  // Export globally for IIFE access
  if (typeof window !== "undefined") {
    window.Logger = Logger;
    window.productionLog = productionLog;
    window.productionWarn = productionWarn;
    window.productionError = productionError;
    window.debugLog = debugLog;
    window.debugError = debugError;
  }

