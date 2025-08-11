import { z } from 'zod';

export const reservesZ = z.object({
  r0: z.string(),
  r1: z.string(),
  block: z.number().int().nonnegative(),
});

export const tokenMetaPayloadZ = z.object({
  pairSymbol: z.string(),
  dex: z.enum(['uniswap', 'sushiswap']),
  lpAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  reserves: reservesZ,
  price: z.string(),
  liquidityUSD: z.string().optional(),
  spread: z.string().optional()
});

export const tokenMetaUpdateZ = z.object({
  type: z.literal('tokenMeta.update'),
  at: z.string(),
  payload: tokenMetaPayloadZ
});

export type TokenMetaUpdate = z.infer<typeof tokenMetaUpdateZ>;
export type TokenMetaPayload = z.infer<typeof tokenMetaPayloadZ>;

export * from './traceTypes.js';

