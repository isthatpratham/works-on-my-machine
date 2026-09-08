/**
 * Exit codes used across the WOMM CLI.
 *
 * 0 = success / no warnings or critical findings
 * 1 = warnings detected
 * 2 = critical findings detected
 * 3 = fatal execution failure
 * 4 = invalid CLI usage or target path
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  WARNINGS: 1,
  CRITICAL: 2,
  FATAL: 3,
  INVALID_USAGE: 4,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
