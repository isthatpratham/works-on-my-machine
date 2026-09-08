import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CheckOptions } from '../options.js';
import { EXIT_CODES, type ExitCode } from '../exit-codes.js';
import { InvalidUsageError } from '../errors.js';

export interface CheckResult {
  exitCode: ExitCode;
  targetPath: string;
}

export async function executeCheck(
  targetPath: string = '.',
  options: CheckOptions = {},
): Promise<CheckResult> {
  const resolvedPath = resolve(process.cwd(), targetPath);

  if (!existsSync(resolvedPath)) {
    throw new InvalidUsageError(
      `Target directory does not exist: ${targetPath}`,
    );
  }

  const stat = statSync(resolvedPath);
  if (!stat.isDirectory()) {
    throw new InvalidUsageError(
      `Target path is not a directory: ${targetPath}`,
    );
  }

  if (options.verbose) {
    console.log(`Analyzing target: ${resolvedPath}`);
  }

  console.log("WOMM — Works on my machine. Let's prove it.");
  console.log('Detection engine not implemented yet.');

  return {
    exitCode: EXIT_CODES.SUCCESS,
    targetPath: resolvedPath,
  };
}
