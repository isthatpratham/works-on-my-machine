import { describe, expect, it, beforeEach, afterEach, beforeAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync, execSync } from 'node:child_process';
import { createProgram, runCli } from '../src/cli/index.js';
import { EXIT_CODES } from '../src/cli/exit-codes.js';
import pkg from '../package.json' with { type: 'json' };

function getMismatchedNodeVersion(): string {
  const currentMajor = parseInt(
    process.version.replace(/^v/, '').split('.')[0] || '20',
    10,
  );
  const mismatchMajor = currentMajor >= 50 ? 10 : currentMajor + 10;
  return `${mismatchMajor}.0.0`;
}

function createTestProject(
  dir: string,
  options: {
    nodeEngine?: string;
    hasLockfile?: boolean;
    hasEnv?: boolean;
    hasEnvExample?: boolean;
    initGit?: boolean;
  } = {},
) {
  const hostNodeVersion = process.version.replace(/^v/, '');
  const nodeEngine = options.nodeEngine ?? hostNodeVersion;

  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'test-app',
      version: '1.0.0',
      engines: { node: nodeEngine },
      packageManager: 'npm@10.0.0',
    }),
  );

  if (options.hasLockfile !== false) {
    writeFileSync(join(dir, 'package-lock.json'), '{}');
  }

  writeFileSync(join(dir, '.gitignore'), 'node_modules\n.env\n');

  if (options.hasEnv) {
    writeFileSync(join(dir, '.env'), 'PORT=3000\n');
  }

  if (options.hasEnvExample) {
    writeFileSync(join(dir, '.env.example'), 'PORT=3000\n');
  }

  if (options.initGit !== false) {
    spawnSync('git', ['init'], { cwd: dir });
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
    spawnSync('git', ['config', 'user.email', 'test@example.com'], {
      cwd: dir,
    });
    spawnSync('git', ['add', '.'], { cwd: dir });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: dir });
  }
}

describe('CLI foundation', () => {
  it('should initialize program with name and description', () => {
    const program = createProgram();
    expect(program.name()).toBe('womm');
    expect(program.description()).toBe("Works on my machine. Let's prove it.");
  });

  it('should expose the package version matching package.json', () => {
    const program = createProgram();
    expect(program.version()).toBe(pkg.version);
    expect(program.version()).toBe('0.1.0');
  });

  it('should register the check command', () => {
    const program = createProgram();
    const checkCmd = program.commands.find((cmd) => cmd.name() === 'check');
    expect(checkCmd).toBeDefined();
    expect(checkCmd?.description()).toBe(
      'Analyze project reproducibility and environment risks',
    );
  });

  it('should register global options', () => {
    const program = createProgram();
    const options = program.options.map((opt) => opt.long);
    expect(options).toContain('--verbose');
    expect(options).toContain('--no-color');
    expect(options).toContain('--version');
  });

  it('should handle --version execution', async () => {
    const exitCode = await runCli(['node', 'womm', '--version']);
    expect(exitCode).toBe(EXIT_CODES.SUCCESS);
  });

  it('should handle --help execution', async () => {
    const exitCode = await runCli(['node', 'womm', '--help']);
    expect(exitCode).toBe(EXIT_CODES.SUCCESS);
  });

  it('should return INVALID_USAGE (4) for unknown command', async () => {
    const exitCode = await runCli(['node', 'womm', 'unknown-subcommand']);
    expect(exitCode).toBe(EXIT_CODES.INVALID_USAGE);
  });

  it('should return INVALID_USAGE (4) for unknown options', async () => {
    const exitCode = await runCli(['node', 'womm', '--unknown-flag']);
    expect(exitCode).toBe(EXIT_CODES.INVALID_USAGE);
  });
});

describe('CLI exit-code propagation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(
      tmpdir(),
      `womm-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return SUCCESS (0) on a clean project with no warnings or critical findings', async () => {
    createTestProject(tempDir);
    const exitCode = await runCli(['node', 'womm', 'check', tempDir]);
    expect(exitCode).toBe(EXIT_CODES.SUCCESS);
  });

  it('should return WARNINGS (1) when only warnings exist (no critical findings)', async () => {
    createTestProject(tempDir, { hasEnv: true, hasEnvExample: false });
    const exitCode = await runCli(['node', 'womm', 'check', tempDir]);
    expect(exitCode).toBe(EXIT_CODES.WARNINGS);
  });

  it('should return CRITICAL (2) when at least one critical finding exists', async () => {
    createTestProject(tempDir, { nodeEngine: getMismatchedNodeVersion() });
    const exitCode = await runCli(['node', 'womm', 'check', tempDir]);
    expect(exitCode).toBe(EXIT_CODES.CRITICAL);
  });

  it('should return CRITICAL (2) for mixed project with critical and warning findings', async () => {
    createTestProject(tempDir, {
      nodeEngine: getMismatchedNodeVersion(),
      hasEnv: true,
      hasEnvExample: false,
    });
    const exitCode = await runCli(['node', 'womm', 'check', tempDir]);
    expect(exitCode).toBe(EXIT_CODES.CRITICAL);
  });

  it('should return identical exit code with --no-color flag', async () => {
    createTestProject(tempDir, { nodeEngine: getMismatchedNodeVersion() });
    const exitCode = await runCli([
      'node',
      'womm',
      'check',
      tempDir,
      '--no-color',
    ]);
    expect(exitCode).toBe(EXIT_CODES.CRITICAL);
  });
});

describe('CLI real process exit codes', () => {
  const cliDistPath = resolve('dist/index.js');
  let tempDir: string;

  beforeAll(() => {
    if (!existsSync(cliDistPath)) {
      execSync('pnpm build', { cwd: process.cwd() });
    }
  });

  beforeEach(() => {
    tempDir = join(
      tmpdir(),
      `womm-proc-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should exit with SUCCESS (0) in actual OS process for clean project', () => {
    createTestProject(tempDir);
    const result = spawnSync(
      process.execPath,
      [cliDistPath, 'check', tempDir],
      {
        encoding: 'utf-8',
        cwd: process.cwd(),
      },
    );

    expect(result.status).toBe(EXIT_CODES.SUCCESS);
    expect(result.stdout).toContain('WORKS ON MY MACHINE');
    expect(result.stdout).toContain('100 / 100');
  });

  it('should exit with WARNINGS (1) in actual OS process for warning-only project', () => {
    createTestProject(tempDir, { hasEnv: true, hasEnvExample: false });
    const result = spawnSync(
      process.execPath,
      [cliDistPath, 'check', tempDir],
      {
        encoding: 'utf-8',
        cwd: process.cwd(),
      },
    );

    expect(result.status).toBe(EXIT_CODES.WARNINGS);
    expect(result.stdout).toContain('WARNING');
  });

  it('should exit with CRITICAL (2) and render report in actual OS process', () => {
    createTestProject(tempDir, { nodeEngine: getMismatchedNodeVersion() });
    const result = spawnSync(
      process.execPath,
      [cliDistPath, 'check', tempDir],
      {
        encoding: 'utf-8',
        cwd: process.cwd(),
      },
    );

    expect(result.status).toBe(EXIT_CODES.CRITICAL);
    expect(result.stdout).toContain('WORKS ON MY MACHINE');
    expect(result.stdout).toContain('CRITICAL');
    expect(result.stdout).toContain('Summary');
  });

  it('should exit with CRITICAL (2) in actual OS process with --no-color', () => {
    createTestProject(tempDir, { nodeEngine: getMismatchedNodeVersion() });
    const result = spawnSync(
      process.execPath,
      [cliDistPath, 'check', tempDir, '--no-color'],
      {
        encoding: 'utf-8',
        cwd: process.cwd(),
      },
    );

    expect(result.status).toBe(EXIT_CODES.CRITICAL);
    expect(result.stdout).toContain('WORKS ON MY MACHINE');
    expect(result.stdout).toContain('Summary');
  });

  it('should exit with SUCCESS (0) in actual OS process for --help', () => {
    const result = spawnSync(process.execPath, [cliDistPath, '--help'], {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });

    expect(result.status).toBe(EXIT_CODES.SUCCESS);
    expect(result.stdout).toContain('Usage: womm');
  });

  it('should exit with SUCCESS (0) in actual OS process for --version', () => {
    const result = spawnSync(process.execPath, [cliDistPath, '--version'], {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });

    expect(result.status).toBe(EXIT_CODES.SUCCESS);
    expect(result.stdout).toContain('0.1.0');
  });

  it('should exit with INVALID_USAGE (4) in actual OS process for unknown option', () => {
    const result = spawnSync(
      process.execPath,
      [cliDistPath, '--unknown-option-flag'],
      {
        encoding: 'utf-8',
        cwd: process.cwd(),
      },
    );

    expect(result.status).toBe(EXIT_CODES.INVALID_USAGE);
  });

  it('should exit with INVALID_USAGE (4) in actual OS process for unknown command', () => {
    const result = spawnSync(
      process.execPath,
      [cliDistPath, 'invalid-command-name'],
      {
        encoding: 'utf-8',
        cwd: process.cwd(),
      },
    );

    expect(result.status).toBe(EXIT_CODES.INVALID_USAGE);
  });
});
