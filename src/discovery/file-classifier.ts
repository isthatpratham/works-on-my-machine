import { basename, extname } from 'node:path';
import type { ProjectFileType } from '../domain/project-context.js';

const MANIFEST_FILENAMES = new Set([
  'package.json',
  'pyproject.toml',
  'pipfile',
  'requirements.txt',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'go.mod',
  'cargo.toml',
  'composer.json',
  'gemfile',
]);

const LOCKFILE_FILENAMES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'bun.lock',
  'pipfile.lock',
  'poetry.lock',
  'cargo.lock',
  'composer.lock',
  'gemfile.lock',
]);

const IGNORE_FILENAMES = new Set([
  '.gitignore',
  '.prettierignore',
  '.eslintignore',
  '.dockerignore',
  '.npmignore',
]);

const CONFIG_FILENAMES = new Set([
  '.nvmrc',
  '.node-version',
  '.python-version',
  'runtime.txt',
  'tsconfig.json',
  'jsconfig.json',
  'eslint.config.js',
  'eslint.config.mjs',
  '.eslintrc.js',
  '.eslintrc.json',
  '.prettierrc',
  'prettier.config.js',
  'tsup.config.ts',
  'tsup.config.js',
  'vitest.config.ts',
  'vitest.config.js',
  'vite.config.ts',
  'vite.config.js',
  'webpack.config.js',
  'next.config.js',
  'next.config.mjs',
  'nuxt.config.ts',
  '.editorconfig',
]);

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.rb',
  '.php',
  '.sh',
  '.bash',
  '.ps1',
  '.sql',
  '.html',
  '.css',
  '.scss',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
]);

const DOC_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.rst']);

/**
 * Classifies a project-relative file path into a ProjectFileType category.
 */
export function classifyProjectFile(relativePath: string): ProjectFileType {
  const fileName = basename(relativePath).toLowerCase();
  const ext = extname(relativePath).toLowerCase();

  // Environment files
  if (
    fileName === '.env' ||
    fileName.startsWith('.env.') ||
    fileName.endsWith('.env')
  ) {
    return 'env';
  }

  // Lockfiles
  if (LOCKFILE_FILENAMES.has(fileName)) {
    return 'lockfile';
  }

  // Manifests
  if (MANIFEST_FILENAMES.has(fileName)) {
    return 'manifest';
  }

  // Ignore files
  if (IGNORE_FILENAMES.has(fileName)) {
    return 'ignore';
  }

  // Config files
  if (
    CONFIG_FILENAMES.has(fileName) ||
    fileName.startsWith('tsconfig.') ||
    fileName.startsWith('vite.config.') ||
    fileName.startsWith('tsup.config.') ||
    fileName.startsWith('vitest.config.') ||
    fileName.startsWith('webpack.config.') ||
    fileName.startsWith('next.config.')
  ) {
    return 'config';
  }

  // Documentation
  if (
    fileName.startsWith('readme') ||
    fileName.startsWith('license') ||
    fileName.startsWith('contributing') ||
    fileName.startsWith('changelog') ||
    relativePath.startsWith('docs/') ||
    relativePath.startsWith('doc/') ||
    DOC_EXTENSIONS.has(ext)
  ) {
    return 'documentation';
  }

  // Source files
  if (SOURCE_EXTENSIONS.has(ext)) {
    return 'source';
  }

  return 'other';
}
