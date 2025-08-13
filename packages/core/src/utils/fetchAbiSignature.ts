import { selectorAbiCache } from './abiCache.js';
import type { InterfaceAbi } from 'ethers';

export async function fetchAbiSignature(selector: string): Promise<InterfaceAbi | null> {
  const cached = selectorAbiCache.get(selector);
  if (cached) return cached;

  // Try OpenChain first
  try {
    const res = await fetch(`https://api.openchain.xyz/signature-database/v1/lookup?function=${selector}`);
    if (res.ok) {
      const data = await res.json();
      const entry = data?.result?.function?.[selector]?.[0]?.function;
      if (entry && entry.name) {
        const abiItem = {
          type: 'function',
          name: entry.name,
          inputs: entry.inputs || [],
          outputs: entry.outputs || [],
          stateMutability: entry.stateMutability || 'nonpayable'
        };
        const abi: InterfaceAbi = [abiItem];
        selectorAbiCache.set(selector, abi);
        return abi;
      }
    }
  } catch {}

  // Fallback to 4byte directory
  try {
    const res = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`);
    if (res.ok) {
      const data = await res.json();
      const text = data?.results?.[0]?.text_signature;
      if (text) {
        const abi: InterfaceAbi = [`function ${text}`];
        selectorAbiCache.set(selector, abi);
        return abi;
      }
    }
  } catch {}

  return null;
}
