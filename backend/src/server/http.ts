import http from 'node:http';
import { createPublicClient, http as viemHttp } from 'viem';
import { UNISWAP_ROUTER_ABI } from '@blazing/core/abi-cache/ROUTER/uniswapV2Router.js';
import { SUSHISWAP_ROUTER_ABI } from '@blazing/core/abi-cache/ROUTER/sushiswapV2Router.js';
import { compoundedMinOut } from '@blazing/core/utils/slippage.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const commit = process.env.COMMIT ?? 'unknown';
const builtAt = process.env.BUILT_AT ?? new Date().toISOString();

let healthProbe: () => { block: number } = () => ({ block: 0 });
let trackedPairs: unknown[] = [];

const UNISWAP_ROUTER_ADDRESS =
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' as const;
const SUSHISWAP_ROUTER_ADDRESS =
  '0xd9e1cE17f2641F24Ae83637ab66a2cca9C378B9F' as const;

const publicClient = createPublicClient({
  chain: {
    id: env.CHAIN_ID,
    name: 'chain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [env.RPC_HTTP_URL] } },
  },
  transport: viemHttp(env.RPC_HTTP_URL),
});

export function setHealthProbe(fn: () => { block: number }): void {
  healthProbe = fn;
}

export function setTrackedPairs(pairs: unknown[]): void {
  trackedPairs = pairs;
}

export function startHttpServer(port = env.HTTP_PORT) {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', ...healthProbe() }));
      return;
    }

    if (req.method === 'GET' && req.url === '/version') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ commit, builtAt }));
      return;
    }

    if (req.method === 'GET' && req.url === '/pairs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(trackedPairs));
      return;
    }

    if (req.method === 'GET' && req.url?.startsWith('/quote')) {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const tokenIn = url.searchParams.get('tokenIn') as `0x${string}` | null;
        const tokenOut = url.searchParams.get('tokenOut') as `0x${string}` | null;
        const amountInStr = url.searchParams.get('amountIn') ?? '0';
        const blockTagStr = url.searchParams.get('blockTag');
        if (!tokenIn || !tokenOut) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'tokenIn and tokenOut required' }));
          return;
        }
        const amountIn = BigInt(amountInStr);
        const blockNumber = blockTagStr ? BigInt(blockTagStr) : undefined;
        const [uniAmounts, sushiAmounts] = await Promise.all([
          publicClient.readContract({
            address: UNISWAP_ROUTER_ADDRESS,
            abi: UNISWAP_ROUTER_ABI,
            functionName: 'getAmountsOut',
            args: [amountIn, [tokenIn, tokenOut]],
            ...(blockNumber ? { blockNumber } : {}),
          }),
          publicClient.readContract({
            address: SUSHISWAP_ROUTER_ADDRESS,
            abi: SUSHISWAP_ROUTER_ABI,
            functionName: 'getAmountsOut',
            args: [amountIn, [tokenIn, tokenOut]],
            ...(blockNumber ? { blockNumber } : {}),
          }),
        ]);
        const payload = {
          uniswap: (uniAmounts as bigint[]).map((x) => x.toString()),
          sushiswap: (sushiAmounts as bigint[]).map((x) => x.toString()),
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      } catch (err) {
        logger.error({ err }, 'quote failed');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'quote failed' }));
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/simulate') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          if (data && data.pair) {
            const { pair, amount, slippageBps, routerOrder } = data;
            const entries = (trackedPairs as any[]).filter(
              (p: any) => p.pairSymbol === pair,
            );
            const uni = entries.find((e: any) => e.dex === 'uniswap');
            const sushi = entries.find((e: any) => e.dex === 'sushiswap');
            if (!uni || !sushi) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'pair not tracked' }));
              return;
            }
            const uniPrice = Number(uni.price);
            const sushiPrice = Number(sushi.price);
            const mid = (uniPrice + sushiPrice) / 2;
            const firstPrice =
              routerOrder === 'uniToSushi' ? uniPrice : sushiPrice;
            const secondPrice =
              routerOrder === 'uniToSushi' ? sushiPrice : uniPrice;
            const impact1 =
              mid === 0 ? 0 : (Math.abs(firstPrice - mid) / mid) * 10_000;
            const impact2 =
              mid === 0 ? 0 : (Math.abs(secondPrice - mid) / mid) * 10_000;
            if (impact1 > slippageBps || impact2 > slippageBps) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'price impact too high' }));
              return;
            }
            const quote1 = Number(amount) * firstPrice;
            const quote2 = quote1 / secondPrice;
            const minOut = compoundedMinOut(
              [BigInt(Math.floor(quote1)), BigInt(Math.floor(quote2))],
              Number(slippageBps),
            ).toString();
            const response = {
              quote: quote2,
              minOut,
              priceImpactBps: [impact1, impact2],
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
            return;
          }

          const { address, abi, functionName, args, blockTag, flashFee } = data;
          const blockNumber = blockTag ? BigInt(blockTag) : undefined;
          const sim = await publicClient.simulateContract({
            address: address as `0x${string}`,
            abi: abi as any,
            functionName,
            args: args as any,
            ...(blockNumber ? { blockNumber } : {}),
          } as any);
          const gasUsed = (sim as any).gasUsed ?? (sim.result as any)?.gasUsed;
          const result = sim.result as any;
          const response = {
            gasUsed: gasUsed != null ? gasUsed.toString() : undefined,
            flashFee:
              result?.flashFee != null
                ? typeof result.flashFee === 'bigint'
                  ? result.flashFee.toString()
                  : result.flashFee
                : flashFee ?? null,
            amounts: Array.isArray(result?.amounts)
              ? result.amounts.map((x: any) =>
                  typeof x === 'bigint' ? x.toString() : x,
                )
              : result,
            logs: (sim as any).logs ?? [],
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (err) {
          logger.error({ err }, 'simulation failed');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'simulation failed' }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  server.listen(port, '0.0.0.0', () => {
    logger.info(`HTTP server listening on port ${port}`);
  });

  return server;
}
