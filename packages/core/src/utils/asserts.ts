export function assertDefined<T>(val: T | undefined, msg = 'Expected value to be defined'): T {
  if (val === undefined) throw new Error(msg);
  return val;
}
