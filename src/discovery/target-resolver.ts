import { resolve, normalize } from 'node:path';
import { pathExists, isDirectoryPath } from '../platform/filesystem.js';

export class InvalidTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTargetError';
  }
}

/**
 * Resolves a target input path to an absolute, normalized path.
 * Defaults to `process.cwd()` if no target is provided.
 */
export function resolveTargetPath(targetInput?: string): string {
  const base = targetInput && targetInput.trim().length > 0 ? targetInput : '.';
  return normalize(resolve(process.cwd(), base));
}

/**
 * Validates that the target path exists and is a readable directory.
 * Throws `InvalidTargetError` if validation fails.
 */
export function validateTargetDirectory(targetPath: string): string {
  const resolved = resolveTargetPath(targetPath);

  if (!pathExists(resolved)) {
    throw new InvalidTargetError(
      `Target directory does not exist: ${targetPath}`,
    );
  }

  if (!isDirectoryPath(resolved)) {
    throw new InvalidTargetError(
      `Target path is not a directory: ${targetPath}`,
    );
  }

  return resolved;
}
