export function decodeRawArgsHex(rawArgs: string): any[] {
  const args: string[] = [];
  for (let i = 0; i < rawArgs.length; i += 64) {
    const chunk = rawArgs.slice(i, i + 64);
    if (chunk.length > 0) args.push(`0x${chunk}`);
  }
  return args;
}
