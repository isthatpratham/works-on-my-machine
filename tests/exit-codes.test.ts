import { describe, expect, it } from 'vitest';
import { EXIT_CODES } from '../src/cli/exit-codes.js';

describe('EXIT_CODES', () => {
  it('should define the documented exit code constants', () => {
    expect(EXIT_CODES.SUCCESS).toBe(0);
    expect(EXIT_CODES.WARNINGS).toBe(1);
    expect(EXIT_CODES.CRITICAL).toBe(2);
    expect(EXIT_CODES.FATAL).toBe(3);
    expect(EXIT_CODES.INVALID_USAGE).toBe(4);
  });
});
