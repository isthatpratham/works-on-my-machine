import type { Detector } from '../domain/detector.js';
import { isDetectionCategory } from '../domain/categories.js';

export class DuplicateDetectorError extends Error {
  constructor(id: string) {
    super(`Detector with ID '${id}' is already registered.`);
    this.name = 'DuplicateDetectorError';
  }
}

export class InvalidDetectorError extends Error {
  constructor(reason: string) {
    super(`Invalid detector: ${reason}`);
    this.name = 'InvalidDetectorError';
  }
}

/**
 * Registry managing detector registration, lookup, and deterministic ordering.
 */
export class DetectorRegistry {
  private readonly detectors = new Map<string, Detector>();

  /**
   * Registers a new detector with structural validation and duplicate prevention.
   */
  register(detector: Detector): this {
    if (!detector || typeof detector !== 'object') {
      throw new InvalidDetectorError('Detector must be an object.');
    }

    if (
      !detector.id ||
      typeof detector.id !== 'string' ||
      detector.id.trim() === ''
    ) {
      throw new InvalidDetectorError(
        'Detector must have a non-empty string ID.',
      );
    }

    if (!detector.category || !isDetectionCategory(detector.category)) {
      throw new InvalidDetectorError(
        `Detector '${detector.id}' has invalid category '${String(detector.category)}'.`,
      );
    }

    if (typeof detector.supports !== 'function') {
      throw new InvalidDetectorError(
        `Detector '${detector.id}' must provide a 'supports' function.`,
      );
    }

    if (typeof detector.analyze !== 'function') {
      throw new InvalidDetectorError(
        `Detector '${detector.id}' must provide an 'analyze' function.`,
      );
    }

    if (this.detectors.has(detector.id)) {
      throw new DuplicateDetectorError(detector.id);
    }

    this.detectors.set(detector.id, detector);
    return this;
  }

  /**
   * Retrieves a detector by its unique ID.
   */
  get(id: string): Detector | undefined {
    return this.detectors.get(id);
  }

  /**
   * Checks if a detector with the given ID is registered.
   */
  has(id: string): boolean {
    return this.detectors.has(id);
  }

  /**
   * Returns all registered detectors sorted deterministically by ID.
   */
  getDetectors(): readonly Detector[] {
    return Array.from(this.detectors.values()).sort((a, b) =>
      a.id.localeCompare(b.id, 'en'),
    );
  }

  /**
   * Removes all registered detectors.
   */
  clear(): void {
    this.detectors.clear();
  }

  /**
   * Returns the count of registered detectors.
   */
  get size(): number {
    return this.detectors.size;
  }
}
