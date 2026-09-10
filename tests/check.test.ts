import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { executeCheck } from '../src/cli/commands/check.js';
import { EXIT_CODES } from '../src/cli/exit-codes.js';
import { InvalidUsageError } from '../src/cli/errors.js';

describe('check command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(
      tmpdir(),
      `womm-check-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should successfully execute check on a directory returning an exit code and resolved target path', async () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test-app', version: '1.0.0' }),
    );
    writeFileSync(join(tempDir, 'package-lock.json'), '{}');

    const result = await executeCheck(tempDir, { verbose: false });
    expect([
      EXIT_CODES.SUCCESS,
      EXIT_CODES.WARNINGS,
      EXIT_CODES.CRITICAL,
    ]).toContain(result.exitCode);
    expect(result.targetPath).toBe(resolve(tempDir));
  });

  it('should return CRITICAL (2) or WARNINGS (1) when reproducibility issues exist', async () => {
    // Current workspace contains tracked fixtures triggering findings
    const result = await executeCheck('.', { verbose: false });
    expect([EXIT_CODES.WARNINGS, EXIT_CODES.CRITICAL]).toContain(
      result.exitCode,
    );
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
