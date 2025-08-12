export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: number; // fraction of delay to add randomly
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
};

/**
 * Retry a promise-returning function with exponential backoff and jitter.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  {
    retries = 3,
    baseDelayMs = 100,
    maxDelayMs = 1_000,
    jitter = 0.5,
    onRetry,
  }: RetryOptions = {},
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      const expDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jitterVal = expDelay * jitter * Math.random();
      const delay = expDelay + jitterVal;
      onRetry?.(attempt + 1, delay, err);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    }
  }
}
