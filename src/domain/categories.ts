/**
 * Detection categories supported by WOMM V1.
 *
 * Each category represents an independent domain of portability and
 * reproducibility risks.
 */
export const DETECTION_CATEGORIES = {
  RUNTIME: 'runtime',
  DEPENDENCIES: 'dependencies',
  ENVIRONMENT: 'environment',
  CONFIGURATION: 'configuration',
  GIT: 'git',
} as const;

export type DetectionCategory =
  (typeof DETECTION_CATEGORIES)[keyof typeof DETECTION_CATEGORIES];

export const ALL_DETECTION_CATEGORIES: readonly DetectionCategory[] = [
  DETECTION_CATEGORIES.RUNTIME,
  DETECTION_CATEGORIES.DEPENDENCIES,
  DETECTION_CATEGORIES.ENVIRONMENT,
  DETECTION_CATEGORIES.CONFIGURATION,
  DETECTION_CATEGORIES.GIT,
] as const;

export function isDetectionCategory(value: string): value is DetectionCategory {
  return (ALL_DETECTION_CATEGORIES as readonly string[]).includes(value);
}
