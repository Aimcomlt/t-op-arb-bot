import { describe, it, expect } from 'vitest';
import { CircuitBreaker } from './circuitBreaker.js';

describe('CircuitBreaker', () => {
  it('trips after failures and recovers after cooldown', async () => {
    const breaker = new CircuitBreaker({
      windowSize: 5,
      errorRateThreshold: 0.5,
      latencyThresholdMs: 1_000,
      cooldownMs: 20,
    });
    const fail = () => Promise.reject(new Error('boom'));
    for (let i = 0; i < 5; i++) {
      await expect(breaker.exec(fail)).rejects.toThrow();
    }
    expect(breaker.isOpen()).toBe(true);
    await expect(breaker.exec(() => Promise.resolve('x'))).rejects.toThrow();
    await new Promise((r) => setTimeout(r, 25));
    await expect(breaker.exec(() => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(breaker.isOpen()).toBe(false);
  });
});
