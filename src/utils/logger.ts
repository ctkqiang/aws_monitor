export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  tag: string;
  message: string;
}

const MAX_LOG_ENTRIES = 500;
const logEntries: LogEntry[] = [];
const subscribers: Array<() => void> = [];

function notifySubscribers() {
  subscribers.forEach((cb) => cb());
}

function mask(data: unknown): string {
  if (typeof data === 'string') {
    if (/AKIA[A-Z0-9]{16}/.test(data)) {
      return data.replace(/(AKIA[A-Z0-9]{4})[A-Z0-9]+/, '$1****');
    }
    if (/^[A-Za-z0-9+/]{30,}$/.test(data)) {
      return data.substring(0, 8) + '****' + data.substring(data.length - 4);
    }
    return data;
  }
  return JSON.stringify(data);
}

function formatMessage(msg: string, args?: unknown[]): string {
  if (!args || args.length === 0) return msg;
  return msg + ' ' + args.map(mask).join(' ');
}

function addEntry(level: LogLevel, levelName: string, tag: string, message: string, args?: unknown[]) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    levelName,
    tag,
    message: formatMessage(message, args),
  };
  logEntries.push(entry);
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries.splice(0, logEntries.length - MAX_LOG_ENTRIES);
  }
  notifySubscribers();

  if (__DEV__) {
    const prefix = `[${levelName}] [${tag}]`;
    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, formatMessage(message, args));
        break;
      case LogLevel.WARN:
        console.warn(prefix, formatMessage(message, args));
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, formatMessage(message, args));
        break;
      case LogLevel.INFO:
      default:
        console.log(prefix, formatMessage(message, args));
    }
  }
}

export const Logger = {
  debug: (tag: string, msg: string, ...args: unknown[]) =>
    addEntry(LogLevel.DEBUG, 'DEBUG', tag, msg, args),
  info: (tag: string, msg: string, ...args: unknown[]) =>
    addEntry(LogLevel.INFO, 'INFO', tag, msg, args),
  warn: (tag: string, msg: string, ...args: unknown[]) =>
    addEntry(LogLevel.WARN, 'WARN', tag, msg, args),
  error: (tag: string, msg: string, ...args: unknown[]) =>
    addEntry(LogLevel.ERROR, 'ERROR', tag, msg, args),
  getEntries: (): LogEntry[] => [...logEntries],
  clear: () => {
    logEntries.length = 0;
    notifySubscribers();
  },
  subscribe: (cb: () => void) => {
    subscribers.push(cb);
    return () => {
      const idx = subscribers.indexOf(cb);
      if (idx !== -1) subscribers.splice(idx, 1);
    };
  },
};
