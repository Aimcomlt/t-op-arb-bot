import { Interface, type InterfaceAbi } from 'ethers';
import { selectorAbiCache, clearAbiCache } from './abiCache.js';

export function registerSelector(selector: string, abi: InterfaceAbi) {
  selectorAbiCache.set(selector, abi);
}

export { clearAbiCache };

/* ---------------------------
   Type Guards / Normalizers
   --------------------------- */

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

/**
 * Minimal check for a JsonFragment-like object.
 * We only need to ensure it's an object and *looks* like a fragment.
 */
function isJsonFragmentLike(x: unknown): x is { type?: string; name?: string } {
  return isObject(x) && ('type' in x || 'name' in x);
}

/**
 * Accepts the common shapes ethers supports:
 * - string (single function signature)
 * - array of strings
 * - array of JsonFragment-like objects
 */
function isInterfaceAbi(x: unknown): x is InterfaceAbi {
  if (typeof x === 'string') return true;
  if (Array.isArray(x)) {
    return x.every((el) => typeof el === 'string' || isJsonFragmentLike(el));
  }
  return false;
}

/** Normalize unknown → InterfaceAbi or null */
function toInterfaceAbi(x: unknown): InterfaceAbi | null {
  if (typeof x === 'string') return [x];
  if (Array.isArray(x)) {
    // strings or fragment-like are okay
    if (x.every((el) => typeof el === 'string' || isJsonFragmentLike(el))) {
      return x as InterfaceAbi;
    }
  }
  return null;
}

/* ---------------------------
   Main
   --------------------------- */

export function decodeSelector(
  selector: string,
  callData: string,
  abi?: InterfaceAbi
): { method: string; args: unknown[] } | null {
  // Prefer passed-in ABI, else look up from cache
  const cached = selectorAbiCache.get(selector);
  const candidate = (abi ?? cached) as unknown;

  // Fast-narrowing/normalization
  const normalized: InterfaceAbi | null = abi
    ? (isInterfaceAbi(abi) ? abi : null)
    : toInterfaceAbi(candidate);

  if (!normalized || (Array.isArray(normalized) && normalized.length === 0)) {
    return null;
  }

  try {
    const iface = new Interface(normalized);

    // ethers v6 supports looking up by sighash/selector
    const fragment = iface.getFunction(selector);
    if (!fragment) return null;

    const decoded = iface.decodeFunctionData(fragment, callData);
    return { method: fragment.name, args: Array.from(decoded) };
  } catch {
    return null;
  }
}
