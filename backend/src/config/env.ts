import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  RPC_HTTP_URL: z.string().url(),
  RPC_WSS_URL: z.string().url(),
  CHAIN_ID: z.coerce.number().int().positive(),
  WS_PORT: z.coerce.number().int().default(8080),
  HTTP_PORT: z.coerce.number().int().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  METRICS_PORT: z.coerce.number().int().default(9108),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const { fieldErrors } = parsedEnv.error.flatten();
  throw new Error(
    `Invalid environment variables:\n${JSON.stringify(fieldErrors, null, 2)}`
  );
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
