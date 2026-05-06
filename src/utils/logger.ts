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
  durationMs?: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byTag: Record<string, number>;
  errors: number;
  warnings: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

const MAX_LOG_ENTRIES = 500;
const logEntries: LogEntry[] = [];
const subscribers: Array<() => void> = [];
const timers: Map<string, number> = new Map();

function notifySubscribers() {
  subscribers.forEach((cb) => cb());
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack?.substring(0, 500),
      cause: err.cause ? serializeError(err.cause) : undefined,
    };
  }
  if (typeof err === 'object' && err !== null) {
    return err as Record<string, unknown>;
  }
  return { value: String(err) };
}

function mask(data: unknown): string {
  if (typeof data !== 'string') {
    try {
      return JSON.stringify(data, (key, value) => {
        if (key === 'secretAccessKey') return '***REDACTED***';
        if (key === 'sessionToken') return '***REDACTED***';
        if (key === 'stack') return typeof value === 'string' ? value.substring(0, 300) : value;
        if (value instanceof Error) return serializeError(value);
        return value;
      });
    } catch {
      return String(data);
    }
  }
  if (/AKIA[A-Z0-9]{16}/.test(data)) {
    return data.replace(/(AKIA[A-Z0-9]{4})[A-Z0-9]+/, '$1****');
  }
  if (/^[A-Za-z0-9+/]{30,}$/.test(data)) {
    return data.substring(0, 8) + '****' + data.substring(data.length - 4);
  }
  return data;
}

function formatMessage(msg: string, args?: unknown[]): string {
  if (!args || args.length === 0) return msg;
  return msg + ' ' + args.map(mask).join(' ');
}

function addEntry(
  level: LogLevel,
  levelName: string,
  tag: string,
  message: string,
  args?: unknown[],
  durationMs?: number,
) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    levelName,
    tag,
    message: formatMessage(message, args),
    durationMs,
  };
  logEntries.push(entry);
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries.splice(0, logEntries.length - MAX_LOG_ENTRIES);
  }
  notifySubscribers();

  if (__DEV__) {
    const prefix = `[${levelName}] [${tag}]`;
    const durationSuffix = durationMs !== undefined ? ` (${durationMs}ms)` : '';
    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, formatMessage(message, args) + durationSuffix);
        break;
      case LogLevel.WARN:
        console.warn(prefix, formatMessage(message, args) + durationSuffix);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, formatMessage(message, args) + durationSuffix);
        break;
      case LogLevel.INFO:
      default:
        console.log(prefix, formatMessage(message, args) + durationSuffix);
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

  error: (tag: string, msg: string, ...args: unknown[]) => {
    const serialized = args.map((arg) => {
      if (arg instanceof Error) return serializeError(arg);
      return arg;
    });
    addEntry(LogLevel.ERROR, 'ERROR', tag, msg, serialized);
  },

  logError: (tag: string, context: string, err: unknown) => {
    const info = serializeError(err);
    Logger.error(tag, context, info);
  },

  time: (label: string) => {
    timers.set(label, Date.now());
  },

  timeEnd: (label: string, tag: string, context?: string) => {
    const start = timers.get(label);
    if (start === undefined) {
      Logger.warn('Logger', `计时器 "${label}" 不存在`);
      return;
    }
    timers.delete(label);
    const elapsed = Date.now() - start;
    const msg = context ? `${context} (${elapsed}ms)` : `${label} (${elapsed}ms)`;
    addEntry(LogLevel.DEBUG, 'DEBUG', tag, msg, undefined, elapsed);
  },

  profile: async <T>(tag: string, label: string, fn: () => Promise<T>): Promise<T> => {
    Logger.time(label);
    try {
      const result = await fn();
      Logger.timeEnd(label, tag, `${label} 完成`);
      return result;
    } catch (err) {
      Logger.timeEnd(label, tag, `${label} 失败`);
      throw err;
    }
  },

  getEntries: (): LogEntry[] => [...logEntries],

  getStats: (): LogStats => {
    const byLevel: Record<string, number> = {};
    const byTag: Record<string, number> = {};
    let errors = 0;
    let warnings = 0;

    for (const entry of logEntries) {
      byLevel[entry.levelName] = (byLevel[entry.levelName] || 0) + 1;
      byTag[entry.tag] = (byTag[entry.tag] || 0) + 1;
      if (entry.level === LogLevel.ERROR) errors++;
      if (entry.level === LogLevel.WARN) warnings++;
    }

    return {
      total: logEntries.length,
      byLevel,
      byTag,
      errors,
      warnings,
      oldestEntry: logEntries[0]?.timestamp || null,
      newestEntry: logEntries[logEntries.length - 1]?.timestamp || null,
    };
  },

  clear: () => {
    logEntries.length = 0;
    timers.clear();
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
