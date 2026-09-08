import { describe, expect, it } from 'vitest';
import { executeCheck } from '../src/cli/commands/check.js';
import { EXIT_CODES } from '../src/cli/exit-codes.js';
import { InvalidUsageError } from '../src/cli/errors.js';
import { resolve } from 'node:path';

describe('check command', () => {
  it('should successfully execute check on valid directory', async () => {
    const result = await executeCheck('.', { verbose: false });
    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(result.targetPath).toBe(resolve(process.cwd(), '.'));
  });

  it('should throw InvalidUsageError when target directory does not exist', async () => {
    await expect(
      executeCheck('./non-existent-directory-xyz-123'),
    ).rejects.toThrow(InvalidUsageError);
  });

  it('should throw InvalidUsageError when target is a file and not a directory', async () => {
    await expect(executeCheck('./package.json')).rejects.toThrow(
      InvalidUsageError,
    );
  });
});
