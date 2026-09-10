/**
 * Severity levels for WOMM findings.
 *
 * - CRITICAL: Strong evidence that the project is unlikely to reproduce correctly.
 * - WARNING: A reproducibility risk exists but may not prevent execution.
 * - INFO: Useful contextual information without a meaningful risk.
 */
export const SEVERITIES = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
} as const;

export type Severity = (typeof SEVERITIES)[keyof typeof SEVERITIES];

export const ALL_SEVERITIES: readonly Severity[] = [
  SEVERITIES.CRITICAL,
  SEVERITIES.WARNING,
  SEVERITIES.INFO,
] as const;

export function isSeverity(value: string): value is Severity {
  return (ALL_SEVERITIES as readonly string[]).includes(value);
}
