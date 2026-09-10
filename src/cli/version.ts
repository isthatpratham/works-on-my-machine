import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolves the version of the installed @isthatpratham/womm package at runtime
 * by locating the package.json associated with this CLI module.
 *
 * This avoids build-time embedding / bundling of a stale version string.
 */
export function getCliVersion(fromUrl: string = import.meta.url): string {
  try {
    const currentFilePath = fileURLToPath(fromUrl);
    let currentDir = dirname(currentFilePath);

    // Traverse upwards from current module location to locate the package's package.json
    while (true) {
      const candidatePkgPath = join(currentDir, 'package.json');
      if (existsSync(candidatePkgPath)) {
        try {
          const content = readFileSync(candidatePkgPath, 'utf8');
          const parsed = JSON.parse(content) as {
            name?: string;
            version?: string;
          };

          // Check if this package.json belongs to womm or has a valid version string
          if (
            parsed.name === '@isthatpratham/womm' ||
            parsed.name === 'womm' ||
            (parsed.version && typeof parsed.version === 'string')
          ) {
            if (
              typeof parsed.version === 'string' &&
              parsed.version.trim().length > 0
            ) {
              return parsed.version.trim();
            }
          }
        } catch {
          // If JSON parse fails, continue traversing upwards
        }
      }

      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }
  } catch {
    // Fallback if URL resolution fails
  }

  return '0.0.0';
}
