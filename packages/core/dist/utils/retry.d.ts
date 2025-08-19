export type RetryOptions = {
    retries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitter?: number;
    onRetry?: (attempt: number, delay: number, error: unknown) => void;
};
/**
 * Retry a promise-returning function with exponential backoff and jitter.
 */
export declare function retry<T>(fn: () => Promise<T>, { retries, baseDelayMs, maxDelayMs, jitter, onRetry, }?: RetryOptions): Promise<T>;
//# sourceMappingURL=retry.d.ts.map