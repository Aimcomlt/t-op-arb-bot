import { z } from 'zod';
export declare const reservesZ: z.ZodObject<{
    r0: z.ZodString;
    r1: z.ZodString;
    block: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    r0: string;
    r1: string;
    block: number;
}, {
    r0: string;
    r1: string;
    block: number;
}>;
export declare const tokenMetaPayloadZ: z.ZodObject<{
    pairSymbol: z.ZodString;
    dex: z.ZodEnum<["uniswap", "sushiswap"]>;
    lpAddress: z.ZodString;
    reserves: z.ZodObject<{
        r0: z.ZodString;
        r1: z.ZodString;
        block: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        r0: string;
        r1: string;
        block: number;
    }, {
        r0: string;
        r1: string;
        block: number;
    }>;
    price: z.ZodString;
    liquidityUSD: z.ZodOptional<z.ZodString>;
    spread: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pairSymbol: string;
    dex: "uniswap" | "sushiswap";
    lpAddress: string;
    reserves: {
        r0: string;
        r1: string;
        block: number;
    };
    price: string;
    liquidityUSD?: string | undefined;
    spread?: string | undefined;
}, {
    pairSymbol: string;
    dex: "uniswap" | "sushiswap";
    lpAddress: string;
    reserves: {
        r0: string;
        r1: string;
        block: number;
    };
    price: string;
    liquidityUSD?: string | undefined;
    spread?: string | undefined;
}>;
export declare const tokenMetaUpdateZ: z.ZodObject<{
    type: z.ZodLiteral<"tokenMeta.update">;
    at: z.ZodString;
    payload: z.ZodObject<{
        pairSymbol: z.ZodString;
        dex: z.ZodEnum<["uniswap", "sushiswap"]>;
        lpAddress: z.ZodString;
        reserves: z.ZodObject<{
            r0: z.ZodString;
            r1: z.ZodString;
            block: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            r0: string;
            r1: string;
            block: number;
        }, {
            r0: string;
            r1: string;
            block: number;
        }>;
        price: z.ZodString;
        liquidityUSD: z.ZodOptional<z.ZodString>;
        spread: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pairSymbol: string;
        dex: "uniswap" | "sushiswap";
        lpAddress: string;
        reserves: {
            r0: string;
            r1: string;
            block: number;
        };
        price: string;
        liquidityUSD?: string | undefined;
        spread?: string | undefined;
    }, {
        pairSymbol: string;
        dex: "uniswap" | "sushiswap";
        lpAddress: string;
        reserves: {
            r0: string;
            r1: string;
            block: number;
        };
        price: string;
        liquidityUSD?: string | undefined;
        spread?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "tokenMeta.update";
    at: string;
    payload: {
        pairSymbol: string;
        dex: "uniswap" | "sushiswap";
        lpAddress: string;
        reserves: {
            r0: string;
            r1: string;
            block: number;
        };
        price: string;
        liquidityUSD?: string | undefined;
        spread?: string | undefined;
    };
}, {
    type: "tokenMeta.update";
    at: string;
    payload: {
        pairSymbol: string;
        dex: "uniswap" | "sushiswap";
        lpAddress: string;
        reserves: {
            r0: string;
            r1: string;
            block: number;
        };
        price: string;
        liquidityUSD?: string | undefined;
        spread?: string | undefined;
    };
}>;
export type TokenMetaUpdate = z.infer<typeof tokenMetaUpdateZ>;
export type TokenMetaPayload = z.infer<typeof tokenMetaPayloadZ>;
export * from './traceTypes.js';
