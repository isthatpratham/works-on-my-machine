import { describe, expect, it } from 'vitest';
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
