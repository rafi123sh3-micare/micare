type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LEVEL_PREFIXES: Record<LogLevel, string> = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
  debug: 'DEBUG',
};

function maskPhone(phone?: string): string {
  if (!phone) return 'unknown';
  if (phone.length < 6) return '***';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const prefix = LEVEL_PREFIXES[level];
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${prefix}] ${message}${metaStr}`;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const formatted = formatLog(level, message, meta);
  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  maskPhone,
};
