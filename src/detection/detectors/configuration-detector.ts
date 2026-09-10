import { join } from 'node:path';
import type { Detector } from '../../domain/detector.js';
import type { Finding } from '../../domain/finding.js';
import type { ProjectContext } from '../../domain/project-context.js';
import { SEVERITIES } from '../../domain/severity.js';
import { safeReadJsonFile } from '../../platform/filesystem.js';

interface PackageJsonStructure {
  scripts?: Record<string, string>;
  engines?: Record<string, string>;
}

const PLATFORM_PATTERNS = [
  {
    pattern: /\bexport\s+[A-Za-z_][A-Za-z0-9_]*=/i,
    label: 'export (POSIX environment assignment)',
  },
  {
    pattern: /\bset\s+[A-Za-z_][A-Za-z0-9_]*=/i,
    label: 'set (Windows environment assignment)',
  },
  { pattern: /\brm\s+-rf\b/i, label: 'rm -rf (POSIX file deletion)' },
  { pattern: /\bdel\s+[/\\]/i, label: 'del (Windows file deletion)' },
  { pattern: /\bcp\s+-r\b/i, label: 'cp -r (POSIX file copy)' },
  { pattern: /\bcopy\s+[/\\]/i, label: 'copy (Windows file copy)' },
  {
    pattern: /\bchmod\s+[+\-0-7]/i,
    label: 'chmod (POSIX permission modification)',
  },
  { pattern: /\bbash\s+[./]/i, label: 'bash (POSIX shell script execution)' },
  { pattern: /\bsh\s+[./]/i, label: 'sh (POSIX shell script execution)' },
];

export class ConfigurationDetector implements Detector {
  readonly id = 'configuration';
  readonly category = 'configuration';

  supports(context: ProjectContext): boolean {
    return context.projectFiles.some(
      (f) =>
        f.relativePath === 'package.json' ||
        f.type === 'config' ||
        f.type === 'manifest',
    );
  }

  analyze(context: ProjectContext): Finding[] {
    const findings: Finding[] = [];
    const relPaths = new Set(context.projectFiles.map((f) => f.relativePath));

    // 1. Inspect package.json scripts for platform-specific commands
    if (relPaths.has('package.json')) {
      const pkg = safeReadJsonFile<PackageJsonStructure>(
        join(context.rootPath, 'package.json'),
      );

      if (pkg?.scripts && typeof pkg.scripts === 'object') {
        for (const [scriptName, scriptCmd] of Object.entries(pkg.scripts)) {
          if (typeof scriptCmd !== 'string') continue;

          for (const { pattern, label } of PLATFORM_PATTERNS) {
            if (pattern.test(scriptCmd)) {
              findings.push({
                id: 'configuration.script.platform-specific',
                category: 'configuration',
                severity: SEVERITIES.WARNING,
                title: 'Platform-specific command detected in package script',
                description: `Package script '${scriptName}' contains a platform-specific command (${label}).`,
                evidence: [
                  {
                    type: 'platform-script',
                    source: 'package.json',
                    detail: `scripts.${scriptName}: ${scriptCmd}`,
                  },
                ],
                impact:
                  'Scripts may fail when executed on different operating systems (such as Windows vs macOS/Linux).',
                recommendation:
                  'Use cross-platform CLI tools (such as cross-env, rimraf, or shx) or portable Node.js scripts.',
              });
              break; // One finding per script is sufficient
            }
          }
        }
      }

      // 2. Missing runtime metadata
      const hasEngines = Boolean(
        pkg?.engines && Object.keys(pkg.engines).length > 0,
      );
      const hasRuntimeFile =
        relPaths.has('.nvmrc') ||
        relPaths.has('.node-version') ||
        relPaths.has('.python-version') ||
        relPaths.has('runtime.txt');

      if (!hasEngines && !hasRuntimeFile) {
        findings.push({
          id: 'configuration.runtime-metadata.missing',
          category: 'configuration',
          severity: SEVERITIES.WARNING,
          title: 'Runtime configuration metadata is missing',
          description:
            'The project lacks explicit runtime version metadata in its configuration.',
          evidence: [
            {
              type: 'missing-metadata',
              source: 'package.json',
            },
          ],
          impact:
            'Execution environment requirements are implicit and may lead to unexpected runtime discrepancies.',
          recommendation:
            'Specify runtime configuration explicitly using the engines field in package.json or version files (.nvmrc, .node-version).',
        });
      }
    }

    return findings;
  }
}
