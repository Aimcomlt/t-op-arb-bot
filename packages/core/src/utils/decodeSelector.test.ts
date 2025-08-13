import { describe, it, expect, beforeEach } from 'vitest';
import { decodeSelector, registerSelector, clearSelectorCache } from './decodeSelector.js';
import { Interface } from 'ethers';

const iface = new Interface(['function transfer(address to, uint256 value)']);
const data = iface.encodeFunctionData('transfer', [
  '0x000000000000000000000000000000000000dEaD',
  1n,
]);
const selector = data.slice(0, 10);

describe('decodeSelector', () => {
  beforeEach(() => {
    clearSelectorCache();
    registerSelector(selector, ['function transfer(address to, uint256 value)']);
  });

  it('decodes calldata using registered ABI', () => {
    const decoded = decodeSelector(selector, data);
    expect(decoded).toEqual({
      method: 'transfer',
      args: ['0x000000000000000000000000000000000000dEaD', 1n],
    });
  });
});
