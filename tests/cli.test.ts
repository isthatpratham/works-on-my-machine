import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createProgram, runCli } from '../src/cli/index.js';
import { EXIT_CODES } from '../src/cli/exit-codes.js';
import pkg from '../package.json' with { type: 'json' };

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
    const hostNodeVersion = process.version.replace(/^v/, '');
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'clean-app',
        version: '1.0.0',
        engines: { node: hostNodeVersion },
        packageManager: 'npm@10.0.0',
      }),
    );
    writeFileSync(join(tempDir, 'package-lock.json'), '{}');
    writeFileSync(join(tempDir, '.gitignore'), 'node_modules\n.env\n');

    spawnSync('git', ['init'], { cwd: tempDir });
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: tempDir });
    spawnSync('git', ['config', 'user.email', 'test@example.com'], {
      cwd: tempDir,
    });
    spawnSync('git', ['add', '.'], { cwd: tempDir });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: tempDir });

    const exitCode = await runCli(['node', 'womm', 'check', tempDir]);
    expect(exitCode).toBe(EXIT_CODES.SUCCESS);
  });

  it('should return WARNINGS (1) when only warnings exist (no critical findings)', async () => {
    const hostNodeVersion = process.version.replace(/^v/, '');
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'warn-app',
        version: '1.0.0',
        engines: { node: hostNodeVersion },
        packageManager: 'npm@10.0.0',
      }),
    );
    writeFileSync(join(tempDir, 'package-lock.json'), '{}');
    // .env present without .env.example triggers environment.env.template-missing (WARNING)
    writeFileSync(join(tempDir, '.env'), 'PORT=3000\n');

    const exitCode = await runCli(['node', 'womm', 'check', tempDir]);
    expect(exitCode).toBe(EXIT_CODES.WARNINGS);
  });

  it('should return CRITICAL (2) when at least one critical finding exists', async () => {
    const exitCode = await runCli([
      'node',
      'womm',
      'check',
      'tests/fixtures/node-project',
    ]);
    expect(exitCode).toBe(EXIT_CODES.CRITICAL);
  });

  it('should return CRITICAL (2) for mixed project with critical and warning findings', async () => {
    // tests/fixtures/node-project contains 1 critical (node mismatch) and 3 warnings
    const exitCode = await runCli([
      'node',
      'womm',
      'check',
      'tests/fixtures/node-project',
    ]);
    expect(exitCode).toBe(EXIT_CODES.CRITICAL);
  });

  it('should return identical exit code with --no-color flag', async () => {
    const exitCode = await runCli([
      'node',
      'womm',
      'check',
      'tests/fixtures/node-project',
      '--no-color',
    ]);
    expect(exitCode).toBe(EXIT_CODES.CRITICAL);
  });
});

describe('CLI real process exit codes', () => {
  const cliDistPath = resolve('dist/index.js');

  it('should exit with CRITICAL (2) and render report in actual OS process', () => {
    const result = spawnSync(
      process.execPath,
      [cliDistPath, 'check', 'tests/fixtures/node-project'],
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
    const result = spawnSync(
      process.execPath,
      [cliDistPath, 'check', 'tests/fixtures/node-project', '--no-color'],
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
});
