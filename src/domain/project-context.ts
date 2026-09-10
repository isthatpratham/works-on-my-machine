/**
 * Status of information collection for a subsystem.
 *
 * Distinguishes between:
 * - 'known': checked and data is available
 * - 'unavailable': attempt to check could not complete (e.g. tool missing or error)
 * - 'not_applicable': subsystem does not apply to this project
 */
export type ContextStatus = 'known' | 'unavailable' | 'not_applicable';

/**
 * Categorization of project files.
 */
export type ProjectFileType =
  | 'manifest'
  | 'lockfile'
  | 'env'
  | 'config'
  | 'source'
  | 'documentation'
  | 'ignore'
  | 'other';

/**
 * Normalized file metadata discovered in the target project.
 */
export interface ProjectFile {
  readonly relativePath: string;
  readonly type?: ProjectFileType;
}

/**
 * High-level project metadata.
 */
export interface ProjectMetadata {
  readonly name?: string;
  readonly framework?: string;
  readonly description?: string;
  readonly isMonorepo?: boolean;
}

/**
 * Information about a specific language or platform runtime.
 */
export interface RuntimeInfo {
  readonly status: ContextStatus;
  readonly declared?: string;
  readonly installed?: string;
  readonly source?: string;
}

/**
 * Context regarding project runtimes (e.g. Node.js, Python).
 */
export interface RuntimeContext {
  readonly node?: RuntimeInfo;
  readonly python?: RuntimeInfo;
  readonly other?: readonly string[];
}

/**
 * Package manager details for dependency management.
 */
export interface PackageManagerInfo {
  readonly name: string;
  readonly version?: string;
  readonly source?: string;
}

/**
 * Context regarding project dependency management and lockfiles.
 */
export interface DependencyContext {
  readonly packageManager?: PackageManagerInfo;
  readonly lockfiles: readonly string[];
  readonly manifests: readonly string[];
}

/**
 * Context regarding the host system environment and environment files.
 */
export interface EnvironmentContext {
  readonly os: string;
  readonly arch: string;
  readonly shell?: string;
  readonly envFilePresent: boolean;
  readonly envExamplePresent: boolean;
  /**
   * Sanitized list of environment variable names referenced or required by the project.
   * MUST NEVER contain secret values.
   */
  readonly detectedEnvVarNames: readonly string[];
}

/**
 * Context regarding Git version control and repository state.
 */
export interface GitContext {
  readonly isRepo: boolean;
  readonly status: 'available' | 'unavailable' | 'not_a_repository';
  readonly currentBranch?: string;
  readonly isDirty?: boolean;
  readonly untrackedFiles?: readonly string[];
  readonly trackedFiles?: readonly string[];
}

/**
 * Normalized snapshot of the target project and execution environment.
 *
 * Provided to all detectors and rules for deterministic, read-only analysis.
 */
export interface ProjectContext {
  readonly rootPath: string;
  readonly projectFiles: readonly ProjectFile[];
  readonly metadata: ProjectMetadata;
  readonly runtime: RuntimeContext;
  readonly dependencies: DependencyContext;
  readonly environment: EnvironmentContext;
  readonly git: GitContext;
}
