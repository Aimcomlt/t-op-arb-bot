const selectorAbiMap = new Map<string, { name: string }>();

export function registerSelector(selector: string, abi: { name: string }) {
  selectorAbiMap.set(selector, abi);
}

export function clearSelectorCache() {
  selectorAbiMap.clear();
}

export function decodeSelector(selector: string, callData: string, abi?: any): any {
  const entry = abi || selectorAbiMap.get(selector);
  if (!entry) return null;
  const args = callData.slice(10);
  return { method: entry.name, args: [args] };
}

