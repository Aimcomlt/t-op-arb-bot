import { Interface, type InterfaceAbi } from 'ethers';
import { selectorAbiCache, clearAbiCache } from './abiCache.js';

export function registerSelector(selector: string, abi: InterfaceAbi) {
  selectorAbiCache.set(selector, abi);
}

export { clearAbiCache };

export function decodeSelector(selector: string, callData: string, abi?: InterfaceAbi): any {
  const entry = abi || selectorAbiCache.get(selector);
  if (!entry) return null;
  try {
    const iface = new Interface(entry);
    const fragment = iface.getFunction(selector);
    const decoded = iface.decodeFunctionData(fragment, callData);
    return { method: fragment.name, args: Array.from(decoded) };
  } catch {
    return null;
  }
}
