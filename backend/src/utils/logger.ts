import pino from 'pino';
import { env } from '../config/env';

/**
 * Pino logger instance configured with application log level.
 * Logs are JSON formatted and include pid and timestamp.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { pid: process.pid },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Log an event coming from a DEX.
 *
 * @param dex   Name of the DEX.
 * @param pair  Trading pair symbol.
 * @param block Block number where the event was observed.
 */
export const logDexEvent = (
  dex: string,
  pair: string,
  block: number,
): void => {
  logger.info({ dex, pair, block }, 'dex event');
};

/**
 * Log an error that occurred during a particular stage.
 *
 * @param stage Description of the stage or operation.
 * @param error The error instance or message.
 */
export const logError = (stage: string, error: unknown): void => {
  logger.error({ stage, err: error }, 'error encountered');
};

export default logger;
