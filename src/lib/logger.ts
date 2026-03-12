/**
 * Minimal structured logger for pipeline observability.
 *
 * Outputs structured JSON to console in development.
 * Designed to be replaceable with a remote logging service (e.g. Sentry, Axiom)
 * by swapping the transport function.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  event: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

type Transport = (entry: LogEntry) => void;

const consoleTransport: Transport = (entry) => {
  const { level, event, timestamp, data } = entry;
  const prefix = `[${timestamp}] ${event}`;

  switch (level) {
    case 'debug':
      console.debug(prefix, data ?? '');
      break;
    case 'info':
      console.info(prefix, data ?? '');
      break;
    case 'warn':
      console.warn(prefix, data ?? '');
      break;
    case 'error':
      console.error(prefix, data ?? '');
      break;
  }
};

let transport: Transport = consoleTransport;

/** Replace the default console transport (e.g. for remote logging). */
export function setLogTransport(newTransport: Transport): void {
  transport = newTransport;
}

function log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'production' && level === 'debug') return;

  transport({
    level,
    event,
    timestamp: new Date().toISOString(),
    data,
  });
}

export const logger = {
  debug: (event: string, data?: Record<string, unknown>) => log('debug', event, data),
  info: (event: string, data?: Record<string, unknown>) => log('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => log('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => log('error', event, data),
};
