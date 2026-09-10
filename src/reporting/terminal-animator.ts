import type { Writable } from 'node:stream';

export interface RevealOptions {
  readonly stream?: Writable;
  readonly isTTY?: boolean;
  readonly lineDelayMs?: number;
}

/**
 * Checks whether the output target is an interactive terminal suitable for progressive reveal.
 */
export function isInteractiveTerminal(
  stream: Writable = process.stdout,
): boolean {
  const isTTY = Boolean((stream as NodeJS.WriteStream).isTTY);
  const isCI = Boolean(process.env.CI);
  const isTest = process.env.NODE_ENV === 'test';
  const isNoAnimation = Boolean(process.env.NO_ANIMATION);

  return isTTY && !isCI && !isTest && !isNoAnimation;
}

/**
 * Progressively reveals the formatted terminal report in an interactive terminal.
 * In non-interactive environments (pipes, redirection, CI, tests), output is written
 * statically and immediately with zero delay.
 */
export async function revealTerminalReport(
  report: string,
  options: RevealOptions = {},
): Promise<void> {
  const stream = options.stream ?? process.stdout;
  const interactive = options.isTTY ?? isInteractiveTerminal(stream);

  if (!interactive) {
    stream.write(report + '\n');
    return;
  }

  const lines = report.split('\n');
  const delay = options.lineDelayMs ?? 10;

  for (let i = 0; i < lines.length; i++) {
    stream.write(lines[i] + '\n');
    if (delay > 0 && i < lines.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
