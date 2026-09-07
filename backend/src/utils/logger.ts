import { createLogger, format, transports } from 'winston';
import { env } from '../config/env';

const { combine, timestamp, colorize, printf, json } = format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

const prodFormat = combine(timestamp(), json());

export const logger = createLogger({
  level: env.IS_PROD ? 'info' : 'debug',
  format: env.IS_PROD ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});
