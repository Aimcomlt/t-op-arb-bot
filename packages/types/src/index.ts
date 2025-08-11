import { z } from "zod";

export interface ExampleType {
  id: string;
  name: string;
}

export type TokenMetaUpdate = {
  type: "tokenMeta.update";
  at: string;
  payload: {
    pairSymbol: string;
    dex: "uniswap" | "sushiswap";
    lpAddress: `0x${string}`;
    reserves: { r0: string; r1: string; block: number };
    price: string;
    liquidityUSD?: string;
    spread?: string;
  };
};

export const tokenMetaUpdateSchema: z.ZodType<TokenMetaUpdate> = z.object({
  type: z.literal("tokenMeta.update"),
  at: z.string(),
  payload: z.object({
    pairSymbol: z.string(),
    dex: z.enum(["uniswap", "sushiswap"]),
    lpAddress: z.string().regex(/^0x[0-9a-fA-F]+$/) as z.ZodType<`0x${string}`>,
    reserves: z.object({
      r0: z.string(),
      r1: z.string(),
      block: z.number(),
    }),
    price: z.string(),
    liquidityUSD: z.string().optional(),
    spread: z.string().optional(),
  }),
});
