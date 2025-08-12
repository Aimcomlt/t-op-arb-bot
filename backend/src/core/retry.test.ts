import { describe, it, expect, vi } from 'vitest';
import { retry } from '@blazing/core/utils/retry.js';

describe('retry util', () => {
  it('retries until success', async () => {
    const fn = vi
      .fn<[], Promise<string>>()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('ok');
    const result = await retry(fn, {
      retries: 3,
      baseDelayMs: 1,
      maxDelayMs: 2,
      jitter: 0,
    });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
