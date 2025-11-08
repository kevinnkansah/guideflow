export type LogLevel = "info" | "error" | "warn" | "debug";

type LogEntry = {
  level: LogLevel;
  message: string;
  context?: string;
  timestamp: Date;
  data?: unknown;
};

class Logger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;

  private log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown
  ) {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      data,
    };

    this.logs.push(entry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    const timestamp = entry.timestamp.toISOString();
    const contextStr = context ? `[${context}]` : "";
    const logMessage = `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}`;

    switch (level) {
      case "error":
        console.error(logMessage, data || "");
        break;
      case "warn":
        console.warn(logMessage, data || "");
        break;
      case "debug":
        console.debug(logMessage, data || "");
        break;
      default:
        console.log(logMessage, data || "");
    }
  }

  info(message: string, context?: string, data?: unknown) {
    this.log("info", message, context, data);
  }

  error(message: string, context?: string, data?: unknown) {
    this.log("error", message, context, data);
  }

  warn(message: string, context?: string, data?: unknown) {
    this.log("warn", message, context, data);
  }

  debug(message: string, context?: string, data?: unknown) {
    this.log("debug", message, context, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();
