import { join } from 'node:path';
import type {
  DependencyContext,
  EnvironmentContext,
  PackageManagerInfo,
  ProjectFile,
  ProjectMetadata,
  RuntimeContext,
  RuntimeInfo,
} from '../domain/project-context.js';
import { safeReadJsonFile, safeReadTextFile } from '../platform/filesystem.js';
import {
  getCpuArchitecture,
  getDefaultShell,
  getOperatingSystem,
  getSystemNodeVersion,
} from '../platform/os.js';
import { isFixturePath } from './file-classifier.js';

interface PackageJsonStructure {
  name?: string;
  description?: string;
  version?: string;
  packageManager?: string;
  engines?: {
    node?: string;
    npm?: string;
    pnpm?: string;
    yarn?: string;
  };
  workspaces?: string[] | { packages?: string[] };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Extracts high-level metadata about the project.
 */
export function extractProjectMetadata(
  projectRoot: string,
  projectFiles: readonly ProjectFile[],
): ProjectMetadata {
  let name: string | undefined;
  let description: string | undefined;
  let framework: string | undefined;
  let isMonorepo = false;

  const hasPnpmWorkspace = projectFiles.some(
    (f) => f.relativePath === 'pnpm-workspace.yaml',
  );

  const packageJsonFile = projectFiles.find(
    (f) => f.relativePath === 'package.json',
  );

  if (packageJsonFile) {
    const pkg = safeReadJsonFile<PackageJsonStructure>(
      join(projectRoot, 'package.json'),
    );

    if (pkg) {
      if (pkg.name) name = pkg.name;
      if (pkg.description) description = pkg.description;
      if (pkg.workspaces || hasPnpmWorkspace) isMonorepo = true;

      // Detect known framework indicators
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      if ('next' in allDeps) framework = 'Next.js';
      else if ('nuxt' in allDeps) framework = 'Nuxt';
      else if ('@remix-run/react' in allDeps) framework = 'Remix';
      else if ('astro' in allDeps) framework = 'Astro';
      else if ('svelte' in allDeps || '@sveltejs/kit' in allDeps)
        framework = 'SvelteKit';
      else if ('react' in allDeps) framework = 'React';
      else if ('vue' in allDeps) framework = 'Vue';
      else if ('express' in allDeps) framework = 'Express';
      else if ('fastify' in allDeps) framework = 'Fastify';
      else if ('nest' in allDeps || '@nestjs/core' in allDeps)
        framework = 'NestJS';
    }
  }

  if (hasPnpmWorkspace) {
    isMonorepo = true;
  }

  return {
    name,
    framework,
    description,
    isMonorepo,
  };
}

/**
 * Extracts environment facts and discovers referenced environment variable names.
 *
 * NEVER extracts or persists secret values.
 */
export function extractEnvironmentContext(
  projectRoot: string,
  projectFiles: readonly ProjectFile[],
): EnvironmentContext {
  const nonFixtureFiles = projectFiles.filter(
    (f) => !isFixturePath(f.relativePath),
  );

  const envFilePresent = nonFixtureFiles.some(
    (f) => f.relativePath === '.env' || f.type === 'env',
  );
  const envExamplePresent = nonFixtureFiles.some(
    (f) =>
      f.relativePath === '.env.example' || f.relativePath === '.env.template',
  );

  const envFiles = nonFixtureFiles.filter((f) => f.type === 'env');
  const detectedVarSet = new Set<string>();

  // Extract variable keys only (never values)
  const envKeyRegex = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm;

  for (const envFile of envFiles) {
    const content = safeReadTextFile(join(projectRoot, envFile.relativePath));
    if (content) {
      let match;
      while ((match = envKeyRegex.exec(content)) !== null) {
        if (match[1]) {
          detectedVarSet.add(match[1]);
        }
      }
    }
  }

  return {
    os: getOperatingSystem(),
    arch: getCpuArchitecture(),
    shell: getDefaultShell(),
    envFilePresent,
    envExamplePresent,
    detectedEnvVarNames: Array.from(detectedVarSet).sort(),
  };
}

/**
 * Extracts dependency management facts, package managers, and lockfiles.
 */
export function extractDependencyContext(
  projectRoot: string,
  projectFiles: readonly ProjectFile[],
): DependencyContext {
  const nonFixtureFiles = projectFiles.filter(
    (f) => !isFixturePath(f.relativePath),
  );

  const lockfiles = nonFixtureFiles
    .filter((f) => f.type === 'lockfile')
    .map((f) => f.relativePath)
    .sort();

  const manifests = nonFixtureFiles
    .filter((f) => f.type === 'manifest')
    .map((f) => f.relativePath)
    .sort();

  let packageManager: PackageManagerInfo | undefined;

  const pkgJsonFile = nonFixtureFiles.find(
    (f) => f.relativePath === 'package.json',
  );
  if (pkgJsonFile) {
    const pkg = safeReadJsonFile<PackageJsonStructure>(
      join(projectRoot, 'package.json'),
    );
    if (pkg?.packageManager) {
      const parts = pkg.packageManager.split('@');
      const name = parts[0] || pkg.packageManager;
      const version = parts[1];
      packageManager = {
        name,
        version,
        source: 'package.json#packageManager',
      };
    }
  }

  // Fallback to inferred package manager from lockfiles
  if (!packageManager) {
    if (lockfiles.includes('pnpm-lock.yaml')) {
      packageManager = { name: 'pnpm', source: 'lockfile' };
    } else if (lockfiles.includes('package-lock.json')) {
      packageManager = { name: 'npm', source: 'lockfile' };
    } else if (lockfiles.includes('yarn.lock')) {
      packageManager = { name: 'yarn', source: 'lockfile' };
    } else if (
      lockfiles.includes('bun.lockb') ||
      lockfiles.includes('bun.lock')
    ) {
      packageManager = { name: 'bun', source: 'lockfile' };
    }
  }

  return {
    packageManager,
    lockfiles,
    manifests,
  };
}

/**
 * Extracts runtime facts for Node.js, Python, and other detected runtimes.
 */
export function extractRuntimeContext(
  projectRoot: string,
  projectFiles: readonly ProjectFile[],
): RuntimeContext {
  let nodeRuntime: RuntimeInfo | undefined;
  let pythonRuntime: RuntimeInfo | undefined;
  const otherRuntimes: string[] = [];

  const nonFixtureFiles = projectFiles.filter(
    (f) => !isFixturePath(f.relativePath),
  );
  const relPaths = new Set(nonFixtureFiles.map((f) => f.relativePath));

  // 1. Node Runtime detection
  const hasPackageJson = relPaths.has('package.json');
  const hasNvmrc = relPaths.has('.nvmrc');
  const hasNodeVersion = relPaths.has('.node-version');
  const hasNodeFiles =
    hasPackageJson ||
    hasNvmrc ||
    hasNodeVersion ||
    nonFixtureFiles.some(
      (f) =>
        f.type === 'source' &&
        (f.relativePath.endsWith('.js') || f.relativePath.endsWith('.ts')),
    );

  if (hasNodeFiles) {
    let declared: string | undefined;
    let source: string | undefined;

    if (hasNvmrc) {
      const nvmContent = safeReadTextFile(join(projectRoot, '.nvmrc'));
      if (nvmContent && nvmContent.trim()) {
        declared = nvmContent.trim();
        source = '.nvmrc';
      }
    } else if (hasNodeVersion) {
      const nodeVerContent = safeReadTextFile(
        join(projectRoot, '.node-version'),
      );
      if (nodeVerContent && nodeVerContent.trim()) {
        declared = nodeVerContent.trim();
        source = '.node-version';
      }
    } else if (hasPackageJson) {
      const pkg = safeReadJsonFile<PackageJsonStructure>(
        join(projectRoot, 'package.json'),
      );
      if (pkg?.engines?.node) {
        declared = pkg.engines.node;
        source = 'package.json#engines.node';
      }
    }

    nodeRuntime = {
      status: 'known',
      declared,
      installed: getSystemNodeVersion().replace(/^v/, ''),
      source,
    };
  } else {
    nodeRuntime = {
      status: 'not_applicable',
    };
  }

  // 2. Python Runtime detection
  const hasPythonVersion = relPaths.has('.python-version');
  const hasRuntimeTxt = relPaths.has('runtime.txt');
  const hasPyproject = relPaths.has('pyproject.toml');
  const hasPipfile = relPaths.has('Pipfile');
  const hasRequirements = relPaths.has('requirements.txt');
  const hasPythonFiles =
    hasPythonVersion ||
    hasRuntimeTxt ||
    hasPyproject ||
    hasPipfile ||
    hasRequirements ||
    nonFixtureFiles.some((f) => f.relativePath.endsWith('.py'));

  if (hasPythonFiles) {
    let declared: string | undefined;
    let source: string | undefined;

    if (hasPythonVersion) {
      const pyVer = safeReadTextFile(join(projectRoot, '.python-version'));
      if (pyVer && pyVer.trim()) {
        declared = pyVer.trim();
        source = '.python-version';
      }
    } else if (hasRuntimeTxt) {
      const rt = safeReadTextFile(join(projectRoot, 'runtime.txt'));
      if (rt && rt.trim()) {
        declared = rt.trim();
        source = 'runtime.txt';
      }
    }

    pythonRuntime = {
      status: 'known',
      declared,
      source,
    };
  } else {
    pythonRuntime = {
      status: 'not_applicable',
    };
  }

  // 3. Other runtimes
  if (relPaths.has('go.mod')) otherRuntimes.push('Go');
  if (relPaths.has('Cargo.toml')) otherRuntimes.push('Rust');
  if (relPaths.has('pom.xml') || relPaths.has('build.gradle'))
    otherRuntimes.push('Java');
  if (relPaths.has('composer.json')) otherRuntimes.push('PHP');

  return {
    node: nodeRuntime,
    python: pythonRuntime,
    other: otherRuntimes.sort(),
  };
}
