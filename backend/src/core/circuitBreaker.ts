export type BreakerOptions = {
  windowSize?: number;
  errorRateThreshold?: number;
  latencyThresholdMs?: number;
  cooldownMs?: number;
};

export class CircuitBreaker {
  private window: { duration: number; success: boolean }[] = [];
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private lastOpened = 0;
  private readonly windowSize: number;
  private readonly errorRateThreshold: number;
  private readonly latencyThresholdMs: number;
  private readonly cooldownMs: number;

  constructor({
    windowSize = 20,
    errorRateThreshold = 0.5,
    latencyThresholdMs = 1_000,
    cooldownMs = 5_000,
  }: BreakerOptions = {}) {
    this.windowSize = windowSize;
    this.errorRateThreshold = errorRateThreshold;
    this.latencyThresholdMs = latencyThresholdMs;
    this.cooldownMs = cooldownMs;
  }

  isOpen(): boolean {
    return this.state === 'open';
  }

  private record(duration: number, success: boolean): void {
    this.window.push({ duration, success });
    if (this.window.length > this.windowSize) this.window.shift();
  }

  private evaluate(): void {
    if (this.window.length === 0) {
      this.state = 'closed';
      return;
    }
    const durations = this.window.map((r) => r.duration).sort((a, b) => a - b);
    const p95Idx = Math.floor(0.95 * (durations.length - 1));
    const p95 = durations[p95Idx] ?? 0;
    const errors = this.window.filter((r) => !r.success).length;
    const errorRate = errors / this.window.length;
    if (p95 > this.latencyThresholdMs || errorRate > this.errorRateThreshold) {
      if (this.state !== 'open') {
        this.state = 'open';
        this.lastOpened = Date.now();
        this.window = [];
      }
    } else {
      this.state = 'closed';
    }
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastOpened < this.cooldownMs) {
        throw new Error('circuit-breaker-open');
      }
      this.state = 'half-open';
    }
    const start = Date.now();
    try {
      const result = await fn();
      this.record(Date.now() - start, true);
      return result;
    } catch (err) {
      this.record(Date.now() - start, false);
      throw err;
    } finally {
      this.evaluate();
    }
  }
}
