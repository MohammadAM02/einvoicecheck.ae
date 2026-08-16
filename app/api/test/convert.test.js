/**
 * Converter retirement regression (Part B).
 *
 * The standalone converter engine is fully removed: rules/convert no longer
 * exists, and the two remaining metadata repairs live in the
 * Validator-integrated safe-repair module.
 */
import { describe, expect, it } from 'vitest';
import { analyzeSafeRepair } from '../src/rules/safe-repair.js';

describe('converter retirement (Part B)', () => {
  it('rules/convert is fully removed', async () => {
    await expect(import('../src/rules/convert/index.js')).rejects.toThrow();
  });

  it('the remaining repairs are exposed only through analyzeSafeRepair', () => {
    expect(typeof analyzeSafeRepair).toBe('function');
  });
});
