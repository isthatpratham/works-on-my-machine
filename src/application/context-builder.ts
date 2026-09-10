import type { ProjectContext } from '../domain/project-context.js';
import {
  validateTargetDirectory,
  discoverProjectFiles,
  extractProjectMetadata,
  extractEnvironmentContext,
  extractDependencyContext,
  extractRuntimeContext,
} from '../discovery/index.js';
import { collectGitContext, type GitExecutor } from '../platform/git.js';

export interface ContextBuilderOptions {
  readonly gitExecutor?: GitExecutor;
}

/**
 * Orchestrates project discovery and factual collection, assembling
 * the standardized immutable ProjectContext snapshot.
 *
 * Does NOT evaluate rules or generate findings.
 */
export async function buildProjectContext(
  targetInput?: string,
  options: ContextBuilderOptions = {},
): Promise<ProjectContext> {
  const rootPath = validateTargetDirectory(targetInput ?? '.');
  const projectFiles = discoverProjectFiles(rootPath);

  const metadata = extractProjectMetadata(rootPath, projectFiles);
  const environment = extractEnvironmentContext(rootPath, projectFiles);
  const dependencies = extractDependencyContext(rootPath, projectFiles);
  const runtime = extractRuntimeContext(rootPath, projectFiles);

  const git = await collectGitContext(rootPath, options.gitExecutor);

  return {
    rootPath,
    projectFiles,
    metadata,
    runtime,
    dependencies,
    environment,
    git,
  };
}
