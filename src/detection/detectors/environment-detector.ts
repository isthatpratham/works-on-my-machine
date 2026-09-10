import { join } from 'node:path';
import type { Detector } from '../../domain/detector.js';
import type { Finding } from '../../domain/finding.js';
import type { ProjectContext } from '../../domain/project-context.js';
import { SEVERITIES } from '../../domain/severity.js';
import { safeReadTextFile } from '../../platform/filesystem.js';

const KNOWN_SERVICE_PORTS: Record<string, string> = {
  '5432': 'PostgreSQL',
  '3306': 'MySQL',
  '6379': 'Redis',
  '27017': 'MongoDB',
  '8080': 'HTTP Service',
  '9200': 'Elasticsearch',
  '5672': 'RabbitMQ',
};

function extractEnvKeys(content: string): Set<string> {
  const keys = new Set<string>();
  const envKeyRegex = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm;
  let match: RegExpExecArray | null;
  while ((match = envKeyRegex.exec(content)) !== null) {
    if (match[1]) {
      keys.add(match[1]);
    }
  }
  return keys;
}

function sanitizePath(pathStr: string): string {
  return pathStr
    .replace(/C:\\Users\\[^\\]+/gi, 'C:\\Users\\<user>')
    .replace(/\/Users\/[^/]+/gi, '/Users/<user>')
    .replace(/\/home\/[^/]+/gi, '/home/<user>');
}

export class EnvironmentDetector implements Detector {
  readonly id = 'environment';
  readonly category = 'environment';

  supports(context: ProjectContext): boolean {
    return (
      context.environment.envFilePresent ||
      context.environment.envExamplePresent ||
      context.environment.detectedEnvVarNames.length > 0 ||
      context.projectFiles.some((f) => f.type === 'env')
    );
  }

  analyze(context: ProjectContext): Finding[] {
    const findings: Finding[] = [];
    const { envFilePresent, envExamplePresent, detectedEnvVarNames } =
      context.environment;

    // 1. Missing environment template (.env.example)
    if (
      (envFilePresent || detectedEnvVarNames.length > 0) &&
      !envExamplePresent
    ) {
      findings.push({
        id: 'environment.env.template-missing',
        category: 'environment',
        severity: SEVERITIES.WARNING,
        title: 'Environment template is missing',
        description:
          'Environment variables or configuration files are present, but no .env.example template was found.',
        evidence: [{ type: 'missing-template', source: '.env.example' }],
        impact:
          'New developers or CI systems will not know which environment variables are required.',
        recommendation:
          'Create a sanitized .env.example file documenting all required environment variables.',
      });
    }

    // 2. Undocumented environment variables
    if (envExamplePresent) {
      const exampleContent =
        safeReadTextFile(join(context.rootPath, '.env.example')) ?? '';
      const exampleKeys = extractEnvKeys(exampleContent);

      const missingKeys: string[] = [];

      for (const varName of detectedEnvVarNames) {
        if (!exampleKeys.has(varName)) {
          missingKeys.push(varName);
        }
      }

      if (missingKeys.length > 0) {
        findings.push({
          id: 'environment.variable.undocumented',
          category: 'environment',
          severity: SEVERITIES.WARNING,
          title: 'Required environment variables are undocumented',
          description: `Environment variable(s) (${missingKeys.join(', ')}) are configured but missing from .env.example.`,
          evidence: missingKeys.map((k) => ({
            type: 'undocumented-variable',
            source: '.env',
            detail: k,
          })),
          impact:
            'Another developer may experience runtime crashes due to missing environment variables.',
          recommendation: 'Add the missing variable names to .env.example.',
        });
      }
    }

    // 3. Inspect env and config files for localhost services, absolute paths, and local IPs
    const envFiles = context.projectFiles.filter((f) => f.type === 'env');

    for (const file of envFiles) {
      const content = safeReadTextFile(
        join(context.rootPath, file.relativePath),
      );
      if (!content) continue;

      // 3.1 Localhost dependency (e.g. database / cache service)
      const localhostPortRegex =
        /(?:localhost|127\.0\.0\.1):(\d{4,5})|(postgres|mysql|redis|mongodb):\/\/(?:[^@\s]+@)?(?:localhost|127\.0\.0\.1)/gi;
      let match: RegExpExecArray | null;

      while ((match = localhostPortRegex.exec(content)) !== null) {
        const port = match[1];
        const protocol = match[2];
        const service =
          (port && KNOWN_SERVICE_PORTS[port]) ||
          (protocol ? protocol.toUpperCase() : 'Local Service');

        findings.push({
          id: 'environment.localhost.dependency',
          category: 'environment',
          severity: SEVERITIES.WARNING,
          title: 'Local service dependency detected',
          description: `The project references a local ${service} dependency on localhost.`,
          evidence: [
            {
              type: 'local-service',
              source: file.relativePath,
              detail: port
                ? `localhost:${port} (${service})`
                : `localhost (${service})`,
            },
          ],
          impact:
            'The project expects external services to be running locally on the host machine.',
          recommendation:
            'Document local service dependencies and provide automated service setup (e.g. scripts or documentation).',
        });
        break; // Emit once per file
      }

      // 3.2 Machine-specific absolute path
      const absolutePathRegex =
        /(?:[a-zA-Z]:\\[Users|Documents|Program Files|AppData][^\s"']+)|(?:\/(?:Users|home)\/[^\s"']+)/g;
      let pathMatch: RegExpExecArray | null;

      while ((pathMatch = absolutePathRegex.exec(content)) !== null) {
        const rawPath = pathMatch[0];
        const sanitized = sanitizePath(rawPath);

        findings.push({
          id: 'environment.absolute-path',
          category: 'environment',
          severity: SEVERITIES.WARNING,
          title: 'Machine-specific absolute path detected',
          description:
            'An absolute filesystem path was detected in project configuration.',
          evidence: [
            {
              type: 'absolute-path',
              source: file.relativePath,
              detail: sanitized,
            },
          ],
          impact:
            'The referenced path is specific to this machine and will fail on other systems.',
          recommendation:
            'Use relative paths or configure paths dynamically using environment variables.',
        });
        break;
      }

      // 3.3 Hardcoded local network IP address (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      const localIpRegex =
        /\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g;
      let ipMatch: RegExpExecArray | null;

      while ((ipMatch = localIpRegex.exec(content)) !== null) {
        findings.push({
          id: 'environment.hardcoded-local-ip',
          category: 'environment',
          severity: SEVERITIES.WARNING,
          title: 'Hardcoded local network address detected',
          description:
            'A hardcoded local network IP address was detected in project configuration.',
          evidence: [
            {
              type: 'local-ip',
              source: file.relativePath,
              detail: ipMatch[0],
            },
          ],
          impact:
            'The referenced service may not exist on another machine or network.',
          recommendation:
            'Replace hardcoded IP addresses with configurable environment variables or hostnames.',
        });
        break;
      }
    }

    return findings;
  }
}
