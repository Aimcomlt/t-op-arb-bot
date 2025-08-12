import { describe, expect, it } from 'vitest';
import { safeParse } from 'valibot';
import { EnvSchema } from './env.js';

describe('EnvSchema', () => {
  it('parses valid environment', () => {
    const result = safeParse(EnvSchema, {
      RPC_HTTP_URL: 'http://localhost:8545',
      RPC_WSS_URL: 'ws://localhost:8546',
      CHAIN_ID: '1',
      WS_AUTH_TOKEN: 'secret',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.CHAIN_ID).toBe(1);
    }
  });

  it('fails with invalid environment', () => {
    const result = safeParse(EnvSchema, {
      RPC_HTTP_URL: 'not-a-url',
      RPC_WSS_URL: 'ws://localhost:8546',
      CHAIN_ID: 'foo',
    });
    expect(result.success).toBe(false);
  });
});
