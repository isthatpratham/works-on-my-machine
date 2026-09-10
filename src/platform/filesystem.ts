import { existsSync, lstatSync, readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';

/**
 * Maximum file size (in bytes) to read for configuration and metadata files.
 * Defaults to 1 MB.
 */
export const MAX_SAFE_FILE_SIZE_BYTES = 1024 * 1024;

/**
 * Known binary extensions that should not be parsed as text.
 */
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
  '.ico',
  '.svgz',
  '.mp3',
  '.mp4',
  '.wav',
  '.avi',
  '.mkv',
  '.mov',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.rar',
  '.pdf',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.wasm',
  '.bin',
  '.iso',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
]);

/**
 * Default ignored directories that must be skipped during recursive traversal.
 */
export const DEFAULT_IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.venv',
  'venv',
  '__pycache__',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
  '.turbo',
  '.output',
  '.nuxt',
]);

export function pathExists(targetPath: string): boolean {
  try {
    return existsSync(targetPath);
  } catch {
    return false;
  }
}

export function isDirectoryPath(targetPath: string): boolean {
  try {
    const stat = statSync(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export function isSymlink(targetPath: string): boolean {
  try {
    const stat = lstatSync(targetPath);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}

export function isBinaryFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Safely reads a text file if it exists, is a regular file, is not binary,
 * and does not exceed the maximum allowed file size.
 *
 * Returns `null` if the file cannot be read or exceeds size limits.
 */
export function safeReadTextFile(
  filePath: string,
  maxBytes: number = MAX_SAFE_FILE_SIZE_BYTES,
): string | null {
  try {
    if (!pathExists(filePath) || isBinaryFile(filePath)) {
      return null;
    }

    const stat = statSync(filePath);
    if (!stat.isFile() || stat.size > maxBytes) {
      return null;
    }

    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Safely reads and parses a JSON file.
 * Returns `null` if the file cannot be read or JSON parsing fails.
 */
export function safeReadJsonFile<T = unknown>(
  filePath: string,
  maxBytes: number = MAX_SAFE_FILE_SIZE_BYTES,
): T | null {
  const content = safeReadTextFile(filePath, maxBytes);
  if (content === null) {
    return null;
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}
