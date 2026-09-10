import { readdirSync, lstatSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ProjectFile } from '../domain/project-context.js';
import {
  DEFAULT_IGNORED_DIRECTORIES,
  pathExists,
} from '../platform/filesystem.js';
import { classifyProjectFile } from './file-classifier.js';

export interface DiscoveryOptions {
  readonly maxDepth?: number;
  readonly ignoredDirs?: Set<string>;
}

const DEFAULT_MAX_DEPTH = 15;

/**
 * Discovers files in a target project directory recursively.
 *
 * Requirements:
 * - Skips default ignored directories (node_modules, .git, venv, dist, build, etc.)
 * - Handles symlinks safely (does not follow directory symlinks)
 * - Converts relative paths to POSIX-style '/' separators
 * - Sorts results deterministically
 */
export function discoverProjectFiles(
  projectRoot: string,
  options: DiscoveryOptions = {},
): readonly ProjectFile[] {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const ignoredDirs = options.ignoredDirs ?? DEFAULT_IGNORED_DIRECTORIES;
  const discovered: ProjectFile[] = [];

  if (!pathExists(projectRoot)) {
    return [];
  }

  function walk(currentDir: string, currentDepth: number): void {
    if (currentDepth > maxDepth) {
      return;
    }

    let entries: string[];
    try {
      entries = readdirSync(currentDir);
    } catch {
      // Gracefully continue on unreadable directory
      return;
    }

    for (const entry of entries) {
      // Check if entry should be ignored
      if (ignoredDirs.has(entry)) {
        continue;
      }

      const fullPath = join(currentDir, entry);

      let stat;
      try {
        stat = lstatSync(fullPath);
      } catch {
        continue;
      }

      // Do not follow directory symlinks to avoid infinite loops and escaping project
      if (stat.isSymbolicLink()) {
        try {
          const targetStat = lstatSync(fullPath);
          if (targetStat.isFile()) {
            const relPath = relative(projectRoot, fullPath)
              .split('\\')
              .join('/');
            discovered.push({
              relativePath: relPath,
              type: classifyProjectFile(relPath),
            });
          }
        } catch {
          // Ignore invalid symlinks
        }
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath, currentDepth + 1);
      } else if (stat.isFile()) {
        const relPath = relative(projectRoot, fullPath).split('\\').join('/');
        discovered.push({
          relativePath: relPath,
          type: classifyProjectFile(relPath),
        });
      }
    }
  }

  walk(projectRoot, 0);

  // Sort deterministically by relativePath
  return discovered.sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, 'en'),
  );
}
