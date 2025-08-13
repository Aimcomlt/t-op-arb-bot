export function normalizePrice(amount: bigint | number, decimals: number): number {
  if (decimals < 0) throw new Error('decimals must be >= 0');
  const base = 10 ** decimals;
  return Number(amount) / base;
}
