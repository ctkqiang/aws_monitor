const TAG = 'Logger';

const COLORS: Record<string, string> = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function format(level: string, tag: string, message: string, data?: Record<string, unknown>): string {
  const ts = COLORS.gray + timestamp() + COLORS.reset;
  const lvl = level.padEnd(5);
  const body = data ? `${message} ${JSON.stringify(data)}` : message;
  return `${ts} ${lvl} [${tag}] ${body}`;
}

export const Logger = {
  info(tag: string, message: string, data?: Record<string, unknown>) {
    console.log(format(`${COLORS.green}INFO${COLORS.reset}`, tag, message, data));
  },
  warn(tag: string, message: string, data?: Record<string, unknown>) {
    console.warn(format(`${COLORS.yellow}WARN${COLORS.reset}`, tag, message, data));
  },
  error(tag: string, message: string, data?: Record<string, unknown>) {
    console.error(format(`${COLORS.red}ERROR`, tag, message, data));
  },
  debug(tag: string, message: string, data?: Record<string, unknown>) {
    console.log(format(`${COLORS.cyan}DEBUG`, tag, message, data));
  },
};
