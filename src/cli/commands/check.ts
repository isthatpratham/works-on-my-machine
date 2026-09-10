import type { CheckOptions } from '../options.js';
import { EXIT_CODES, type ExitCode } from '../exit-codes.js';
import { InvalidUsageError } from '../errors.js';
import { buildProjectContext } from '../../application/index.js';
import { InvalidTargetError } from '../../discovery/index.js';

export interface CheckResult {
  exitCode: ExitCode;
  targetPath: string;
}

export async function executeCheck(
  targetPath: string = '.',
  options: CheckOptions = {},
): Promise<CheckResult> {
  let context;
  try {
    context = await buildProjectContext(targetPath);
  } catch (error: unknown) {
    if (error instanceof InvalidTargetError) {
      throw new InvalidUsageError(error.message);
    }
    throw error;
  }

  if (options.verbose) {
    console.log(`Analyzing target: ${context.rootPath}`);
  }

  console.log("WOMM — Works on my machine. Let's prove it.");
  console.log('Detection engine not implemented yet.');

  return {
    exitCode: EXIT_CODES.SUCCESS,
    targetPath: context.rootPath,
  };
}
