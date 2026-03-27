// Structured logging utility with timestamp, level, context, message, payload
const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
  }

  log(level, context, message, payload = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context,
      message,
      payload,
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    const style = `color: ${this.getColorForLevel(level)}; font-weight: bold;`;
    const consoleMessage = `[${level}] ${context}: ${message}`;
    console.log(`%c${consoleMessage}`, style, payload);
  }

  debug(context, message, payload) {
    if (isDevelopment) {
      this.log(LogLevel.DEBUG, context, message, payload);
    }
  }

  info(context, message, payload) {
    this.log(LogLevel.INFO, context, message, payload);
  }

  warn(context, message, payload) {
    this.log(LogLevel.WARN, context, message, payload);
  }

  error(context, message, payload) {
    this.log(LogLevel.ERROR, context, message, payload);
  }

  getColorForLevel(level) {
    const colors = {
      DEBUG: '#7B68EE',
      INFO: '#4A90E2',
      WARN: '#FFA500',
      ERROR: '#FF6B6B',
    };
    return colors[level] || '#000000';
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
export default logger;
