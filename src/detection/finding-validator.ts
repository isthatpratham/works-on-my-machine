import type { Finding } from '../domain/finding.js';
import type { Evidence } from '../domain/evidence.js';
import { isDetectionCategory } from '../domain/categories.js';
import { isSeverity } from '../domain/severity.js';

export type ValidationResult =
  | { readonly valid: true; readonly finding: Finding }
  | { readonly valid: false; readonly reason: string };

function isValidEvidence(item: unknown): item is Evidence {
  if (!item || typeof item !== 'object') {
    return false;
  }
  const candidate = item as Record<string, unknown>;
  if (typeof candidate.type !== 'string' || candidate.type.trim() === '') {
    return false;
  }
  if (typeof candidate.source !== 'string' || candidate.source.trim() === '') {
    return false;
  }
  if (candidate.detail !== undefined && typeof candidate.detail !== 'string') {
    return false;
  }
  return true;
}

/**
 * Validates the structural integrity of a Finding object.
 *
 * Ensures all required domain fields are present and properly typed.
 */
export function validateFinding(candidate: unknown): ValidationResult {
  if (!candidate || typeof candidate !== 'object') {
    return { valid: false, reason: 'Finding must be a non-null object.' };
  }

  const f = candidate as Record<string, unknown>;

  if (typeof f.id !== 'string' || f.id.trim() === '') {
    return { valid: false, reason: 'Finding must have a non-empty string ID.' };
  }

  if (typeof f.category !== 'string' || !isDetectionCategory(f.category)) {
    return {
      valid: false,
      reason: `Finding '${String(f.id)}' has invalid category '${String(f.category)}'.`,
    };
  }

  if (typeof f.severity !== 'string' || !isSeverity(f.severity)) {
    return {
      valid: false,
      reason: `Finding '${String(f.id)}' has invalid severity '${String(f.severity)}'.`,
    };
  }

  if (typeof f.title !== 'string' || f.title.trim() === '') {
    return {
      valid: false,
      reason: `Finding '${String(f.id)}' must have a non-empty title.`,
    };
  }

  if (typeof f.description !== 'string' || f.description.trim() === '') {
    return {
      valid: false,
      reason: `Finding '${String(f.id)}' must have a non-empty description.`,
    };
  }

  if (typeof f.impact !== 'string' || f.impact.trim() === '') {
    return {
      valid: false,
      reason: `Finding '${String(f.id)}' must have a non-empty impact.`,
    };
  }

  if (typeof f.recommendation !== 'string' || f.recommendation.trim() === '') {
    return {
      valid: false,
      reason: `Finding '${String(f.id)}' must have a non-empty recommendation.`,
    };
  }

  if (f.evidence !== undefined) {
    if (!Array.isArray(f.evidence)) {
      return {
        valid: false,
        reason: `Finding '${String(f.id)}' evidence must be an array.`,
      };
    }

    for (let i = 0; i < f.evidence.length; i++) {
      if (!isValidEvidence(f.evidence[i])) {
        return {
          valid: false,
          reason: `Finding '${String(f.id)}' has malformed evidence item at index ${i}.`,
        };
      }
    }
  }

  return {
    valid: true,
    finding: {
      id: f.id.trim(),
      category: f.category,
      severity: f.severity,
      title: f.title.trim(),
      description: f.description.trim(),
      evidence: f.evidence as readonly Evidence[] | undefined,
      impact: f.impact.trim(),
      recommendation: f.recommendation.trim(),
    },
  };
}
