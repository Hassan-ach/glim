/**
 * Logger utility for Glim
 *
 * Provides unified logging capabilities with console output
 * for better debugging and traceability.
 *
 * @module logger
 * @author Bagi
 */

/**
 * ANSI escape color codes for terminal output
 * Used to color log level labels in console output
 */
const COLORS = {
    INFO: "\x1b[32m", // green
    WARN: "\x1b[33m", // yellow
    ERROR: "\x1b[31m", // red
    DEBUG: "\x1b[34m", // blue
    RESET: "\x1b[0m",
};

/**
 * Logger class for structured application logging
 */
class Logger {
    /**
     * Create a new logger instance
     * @param {string} name - Logger name/component identifier
     */
    constructor(name) {
        this.name = name;
    }

    /**
     * Log a message with specified level
     * @param {string} level - Log level (INFO, WARN, ERROR, DEBUG)
     * @param {string} message - Message to log
     */
    log(level, message = "") {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} - ${this.name} - ${level} - ${message}`;

        // Strip ANSI color codes to get raw level
        const rawLevel = level.replace(/\x1b\[[0-9;]*m/g, "");

        // Choose appropriate console function based on raw level
        let consoleLog = console.log;
        switch (rawLevel) {
            case "ERROR":
                consoleLog = console.error;
                break;
            case "WARN":
                consoleLog = console.warn;
                break;
            case "DEBUG":
                consoleLog = console.debug;
                break;
        }

        consoleLog(logMessage);
    }

    /**
     * Log an informational message
     * @param {string} message - Message to log
     */
    info(message) {
        this.log(`${COLORS.INFO}INFO${COLORS.RESET}`, message);
    }

    /**
     * Log an error message
     * @param {string} message - Error message to log
     */
    error(message) {
        this.log(`${COLORS.ERROR}ERROR${COLORS.RESET}`, message);
    }

    /**
     * Log a warning message
     * @param {string} message - Warning message to log
     */
    warn(message) {
        this.log(`${COLORS.WARN}WARN${COLORS.RESET}`, message);
    }

    /**
     * Log a debug message
     * @param {string} message - Debug message to log
     */
    debug(message) {
        this.log(`${COLORS.DEBUG}DEBUG${COLORS.RESET}`, message);
    }

    inspect(obj) {
        console.log(JSON.stringify(obj, null, 2));
    }
}

// Create and export default logger instances
const glimLogger = new Logger("glim");
export default glimLogger;
