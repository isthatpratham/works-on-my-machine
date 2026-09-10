import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ExecResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface ExecOptions {
  readonly timeoutMs?: number;
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly maxBuffer?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_BUFFER = 1024 * 1024; // 1 MB

/**
 * Executes a binary with structured argument arrays.
 *
 * Never uses shell interpolation or arbitrary command string execution.
 * Handles timeouts and non-zero exit codes safely without crashing.
 */
export async function safeExecFile(
  file: string,
  args: readonly string[],
  options: ExecOptions = {},
): Promise<ExecResult> {
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBuffer = options.maxBuffer ?? DEFAULT_MAX_BUFFER;

  try {
    const { stdout, stderr } = await execFileAsync(file, [...args], {
      cwd: options.cwd,
      env: options.env,
      timeout,
      maxBuffer,
      windowsHide: true,
    });

    return {
      exitCode: 0,
      stdout: String(stdout),
      stderr: String(stderr),
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object') {
      const err = error as {
        code?: number | string;
        stdout?: string | Buffer;
        stderr?: string | Buffer;
        status?: number;
      };

      const exitCode =
        typeof err.status === 'number'
          ? err.status
          : typeof err.code === 'number'
            ? err.code
            : 1;

      const stdout = err.stdout
        ? typeof err.stdout === 'string'
          ? err.stdout
          : err.stdout.toString('utf-8')
        : '';

      const stderr = err.stderr
        ? typeof err.stderr === 'string'
          ? err.stderr
          : err.stderr.toString('utf-8')
        : '';

      return {
        exitCode,
        stdout,
        stderr,
      };
    }

    return {
      exitCode: 1,
      stdout: '',
      stderr: String(error),
    };
  }
}
