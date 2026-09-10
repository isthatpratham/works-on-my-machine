import { join } from 'node:path';
import type { Detector } from '../../domain/detector.js';
import type { Finding } from '../../domain/finding.js';
import type { ProjectContext } from '../../domain/project-context.js';
import { SEVERITIES } from '../../domain/severity.js';
import {
  safeReadJsonFile,
  safeReadTextFile,
} from '../../platform/filesystem.js';

interface PackageJsonStructure {
  engines?: {
    node?: string;
  };
}

/**
 * Evaluates whether a Node.js version declaration is an unpinned range or wildcard.
 */
function isUnpinnedNodeVersion(version: string): boolean {
  const trimmed = version.trim();
  if (
    trimmed === '' ||
    trimmed === '*' ||
    trimmed.toLowerCase() === 'latest' ||
    trimmed.startsWith('>=') ||
    trimmed.startsWith('>') ||
    trimmed.startsWith('<=') ||
    trimmed.startsWith('<') ||
    trimmed.startsWith('^') ||
    trimmed.startsWith('~') ||
    trimmed.includes('||') ||
    trimmed.toLowerCase().includes('.x') ||
    trimmed.toLowerCase().includes('x.') ||
    trimmed.includes('*')
  ) {
    return true;
  }
  return false;
}

/**
 * Extracts comparable major and optional minor version numbers from a version string.
 */
function extractMajorMinor(
  version: string,
): { major: number; minor?: number } | null {
  const cleaned = version.replace(/^[v^~>=<\s]+/, '').trim();
  const match = /^(\d+)(?:\.(\d+))?/.exec(cleaned);
  if (match && match[1]) {
    return {
      major: parseInt(match[1], 10),
      minor: match[2] !== undefined ? parseInt(match[2], 10) : undefined,
    };
  }
  return null;
}

function extractMajorVersion(version: string): number | null {
  const parsed = extractMajorMinor(version);
  return parsed ? parsed.major : null;
}

export class RuntimeDetector implements Detector {
  readonly id = 'runtime';
  readonly category = 'runtime';

  supports(context: ProjectContext): boolean {
    return (
      context.runtime.node?.status === 'known' ||
      context.runtime.python?.status === 'known' ||
      (context.runtime.other !== undefined && context.runtime.other.length > 0)
    );
  }

  analyze(context: ProjectContext): Finding[] {
    const findings: Finding[] = [];

    // 1. Node.js Runtime Analysis
    if (context.runtime.node && context.runtime.node.status === 'known') {
      const { declared, installed, source } = context.runtime.node;

      // 1.1 Unpinned Node version
      if (!declared || isUnpinnedNodeVersion(declared)) {
        findings.push({
          id: 'runtime.node.unpinned',
          category: 'runtime',
          severity: SEVERITIES.WARNING,
          title: 'Node.js version is not pinned',
          description: declared
            ? `Declared Node.js version '${declared}' uses an unpinned or non-exact range.`
            : 'No project-level Node.js version declaration was detected.',
          evidence:
            declared && source
              ? [{ type: 'version-declaration', source, detail: declared }]
              : [{ type: 'missing-declaration', source: 'package.json' }],
          impact:
            'Different machines may run different Node.js versions, leading to runtime or build discrepancies.',
          recommendation:
            'Declare an exact Node.js version using .nvmrc, .node-version, or the engines field in package.json.',
        });
      }

      // 1.2 Node version mismatch
      if (declared && installed) {
        const declaredMajor = extractMajorVersion(declared);
        const installedMajor = extractMajorVersion(installed);

        if (
          declaredMajor !== null &&
          installedMajor !== null &&
          declaredMajor !== installedMajor
        ) {
          findings.push({
            id: 'runtime.node.mismatch',
            category: 'runtime',
            severity: SEVERITIES.CRITICAL,
            title: 'Node.js version mismatch',
            description: `Project declares Node.js ${declared}, but the current machine is running Node.js ${installed}.`,
            evidence: [
              {
                type: 'runtime-mismatch',
                source: source ?? 'runtime',
                detail: `declared: ${declared}, installed: ${installed}`,
              },
            ],
            impact:
              'The project may fail to install, build, or run due to runtime incompatibilities.',
            recommendation: "Switch to the project's declared Node.js version.",
          });
        }
      }

      // 1.3 Conflicting Node declarations
      const relPaths = new Set(context.projectFiles.map((f) => f.relativePath));
      const hasNvmrc = relPaths.has('.nvmrc');
      const hasNodeVersion = relPaths.has('.node-version');
      const hasPackageJson = relPaths.has('package.json');

      const declarations: Array<{ source: string; version: string }> = [];

      if (hasNvmrc) {
        const content = safeReadTextFile(join(context.rootPath, '.nvmrc'));
        if (content && content.trim()) {
          declarations.push({ source: '.nvmrc', version: content.trim() });
        }
      }

      if (hasNodeVersion) {
        const content = safeReadTextFile(
          join(context.rootPath, '.node-version'),
        );
        if (content && content.trim()) {
          declarations.push({
            source: '.node-version',
            version: content.trim(),
          });
        }
      }

      if (hasPackageJson) {
        const pkg = safeReadJsonFile<PackageJsonStructure>(
          join(context.rootPath, 'package.json'),
        );
        if (pkg?.engines?.node && pkg.engines.node.trim()) {
          declarations.push({
            source: 'package.json#engines.node',
            version: pkg.engines.node.trim(),
          });
        }
      }

      if (declarations.length > 1) {
        const firstMajor = extractMajorVersion(declarations[0]!.version);
        const hasConflict = declarations.some(
          (d) => extractMajorVersion(d.version) !== firstMajor,
        );

        if (hasConflict) {
          findings.push({
            id: 'runtime.node.conflict',
            category: 'runtime',
            severity: SEVERITIES.WARNING,
            title: 'Conflicting Node.js version declarations',
            description:
              'Multiple configuration files declare conflicting Node.js versions.',
            evidence: declarations.map((d) => ({
              type: 'conflicting-declaration',
              source: d.source,
              detail: d.version,
            })),
            impact:
              'Different version managers and developers may resolve different Node.js versions.',
            recommendation:
              'Align the Node.js version declarations across all project configuration files.',
          });
        }
      }
    }

    // 2. Python Runtime Analysis
    if (context.runtime.python && context.runtime.python.status === 'known') {
      const { declared, installed, source } = context.runtime.python;

      // 2.1 Python unpinned
      if (!declared) {
        findings.push({
          id: 'runtime.python.unpinned',
          category: 'runtime',
          severity: SEVERITIES.WARNING,
          title: 'Python version is not pinned',
          description:
            'No project-level Python version declaration was detected.',
          evidence: [
            {
              type: 'missing-declaration',
              source: source ?? 'python',
            },
          ],
          impact:
            'Different machines may run different Python versions with incompatible syntax or standard library behavior.',
          recommendation:
            'Declare a specific Python version using .python-version or pyproject.toml.',
        });
      }

      // 2.2 Python mismatch
      if (declared && installed) {
        const declaredVer = extractMajorMinor(declared);
        const installedVer = extractMajorMinor(installed);

        if (
          declaredVer !== null &&
          installedVer !== null &&
          (declaredVer.major !== installedVer.major ||
            (declaredVer.minor !== undefined &&
              installedVer.minor !== undefined &&
              declaredVer.minor !== installedVer.minor))
        ) {
          findings.push({
            id: 'runtime.python.mismatch',
            category: 'runtime',
            severity: SEVERITIES.CRITICAL,
            title: 'Python version mismatch',
            description: `Project declares Python ${declared}, but the current machine is running Python ${installed}.`,
            evidence: [
              {
                type: 'runtime-mismatch',
                source: source ?? 'runtime',
                detail: `declared: ${declared}, installed: ${installed}`,
              },
            ],
            impact:
              'The project may fail to run due to Python version incompatibilities.',
            recommendation: "Use the project's declared Python version.",
          });
        }
      }
    }

    return findings;
  }
}
