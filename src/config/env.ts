import { z } from 'zod';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
  LOG_DB_QUERIES: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, 'CLERK_PUBLISHABLE_KEY is required'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
  ROUND1_API_URL: z.string().url('ROUND1_API_URL must be a valid URL'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  const bootstrapLogger = pino();
  bootstrapLogger.fatal({ err: _env.error.format() }, 'Invalid environment variables');
  process.exit(1);
}

export const env = _env.data;
