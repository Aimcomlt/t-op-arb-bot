import * as v from 'valibot';

const intFromString = (defaultValue: number) =>
  v.pipe(
    v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.integer())),
    v.transform((v) => v ?? defaultValue),
  );

const nonNegIntFromString = (defaultValue: number) =>
  v.pipe(intFromString(defaultValue), v.minValue(0));

const positiveIntFromString = (defaultValue: number) =>
  v.pipe(intFromString(defaultValue), v.minValue(1));

const nonNegNumberFromString = (defaultValue: number) =>
  v.pipe(
    v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(0))),
    v.transform((v) => v ?? defaultValue),
  );

const booleanFromString = (defaultValue: boolean) =>
  v.pipe(
    v.optional(
      v.pipe(
        v.string(),
        v.transform((s) => (s === 'true' ? true : s === 'false' ? false : s)),
        v.boolean(),
      ),
    ),
    v.transform((v) => v ?? defaultValue),
  );

export const EnvSchema = v.object({
  RPC_HTTP_URL: v.pipe(v.string(), v.url()),
  RPC_WSS_URL: v.pipe(v.string(), v.url()),
  CHAIN_ID: v.pipe(
    v.string(),
    v.transform(Number),
    v.number(),
    v.integer(),
    v.minValue(1),
  ),
  WS_PORT: nonNegIntFromString(8080),
  HTTP_PORT: nonNegIntFromString(3000),
  LOG_LEVEL: v.pipe(
    v.optional(v.picklist(['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const)),
    v.transform((v) => v ?? 'info'),
  ),
  METRICS_PORT: nonNegIntFromString(9108),
  WETH_ADDRESS: v.pipe(
    v.optional(v.string()),
    v.transform((v) => v ?? '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
    v.regex(/^0x[a-fA-F0-9]{40}$/),
  ),
  MIN_SPREAD_BPS: nonNegNumberFromString(0),
  MIN_LIQ_USD: nonNegNumberFromString(0),
  MIN_RESERVE: nonNegNumberFromString(0),
  QUOTE_ALLOWLIST: v.pipe(
    v.optional(v.string()),
    v.transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])),
  ),
  QUOTE_DENYLIST: v.pipe(
    v.optional(v.string()),
    v.transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])),
  ),
  LP_SEED_JSON: v.pipe(v.optional(v.string()), v.transform((v) => v ?? '')),
  MAX_PAIRS: positiveIntFromString(50),
  COLLECT_CONCURRENCY: positiveIntFromString(2),
  CHUNK_DELAY_MS: nonNegIntFromString(500),
  START_INDEX: nonNegIntFromString(0),
  KILL_SWITCH: booleanFromString(false),
  SIM_ON_SUCCESSFUL_TRADES: booleanFromString(false),
  TRACE_BROADCAST_ENABLED: booleanFromString(false),
});

export type Env = v.InferOutput<typeof EnvSchema>;
export let env: Env;
export function setEnv(e: Env): void {
  env = e;
}
