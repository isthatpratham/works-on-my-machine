/**
 * Zero-dependency SemVer parsing and comparison utility for WOMM runtime compatibility evaluation.
 */

export interface SemverVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease?: string;
  readonly raw: string;
}

/**
 * Parses a semantic version string into major, minor, and patch components.
 */
export function parseSemver(versionStr: string): SemverVersion | null {
  if (!versionStr || typeof versionStr !== 'string') {
    return null;
  }

  const cleaned = versionStr
    .trim()
    .replace(/^v/i, '')
    .replace(/^[=]/, '')
    .trim();

  // Match: X, X.Y, X.Y.Z, optionally followed by -prerelease or +build
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?/.exec(
    cleaned,
  );
  if (!match || match[1] === undefined) {
    return null;
  }

  return {
    major: parseInt(match[1], 10),
    minor: match[2] !== undefined ? parseInt(match[2], 10) : 0,
    patch: match[3] !== undefined ? parseInt(match[3], 10) : 0,
    prerelease: match[4],
    raw: versionStr.trim(),
  };
}

/**
 * Compares two SemVer versions.
 * Returns -1 if a < b, 0 if a == b, 1 if a > b.
 */
export function compareSemver(a: SemverVersion, b: SemverVersion): number {
  if (a.major !== b.major) {
    return a.major > b.major ? 1 : -1;
  }
  if (a.minor !== b.minor) {
    return a.minor > b.minor ? 1 : -1;
  }
  if (a.patch !== b.patch) {
    return a.patch > b.patch ? 1 : -1;
  }
  return 0;
}

/**
 * Checks if a version satisfies a single comparator (e.g. ">=20.0.0", "^20", "~20.1", "20.x").
 */
function satisfiesComparator(
  version: SemverVersion,
  comparator: string,
): boolean {
  const trimmed = comparator.trim();

  if (
    trimmed === '' ||
    trimmed === '*' ||
    trimmed === 'x' ||
    trimmed === 'X' ||
    trimmed.toLowerCase() === 'latest'
  ) {
    return true;
  }

  // Greater than or equal: >=X.Y.Z or >=X
  if (trimmed.startsWith('>=')) {
    const target = parseSemver(trimmed.slice(2));
    if (!target) return false;
    return compareSemver(version, target) >= 0;
  }

  // Greater than: >X.Y.Z or >X
  if (trimmed.startsWith('>')) {
    const rawTarget = trimmed.slice(1).trim();
    const target = parseSemver(rawTarget);
    if (!target) return false;
    // If only major was given (e.g. ">18"), it means >= 19.0.0 or major > 18
    if (!rawTarget.includes('.')) {
      return version.major > target.major;
    }
    return compareSemver(version, target) > 0;
  }

  // Less than or equal: <=X.Y.Z or <=X
  if (trimmed.startsWith('<=')) {
    const rawTarget = trimmed.slice(2).trim();
    const target = parseSemver(rawTarget);
    if (!target) return false;
    if (!rawTarget.includes('.')) {
      return version.major <= target.major;
    }
    return compareSemver(version, target) <= 0;
  }

  // Less than: <X.Y.Z or <X
  if (trimmed.startsWith('<')) {
    const rawTarget = trimmed.slice(1).trim();
    const target = parseSemver(rawTarget);
    if (!target) return false;
    if (!rawTarget.includes('.')) {
      return version.major < target.major;
    }
    return compareSemver(version, target) < 0;
  }

  // Caret range: ^X.Y.Z (compatible with same major for >=1.0.0)
  if (trimmed.startsWith('^')) {
    const target = parseSemver(trimmed.slice(1));
    if (!target) return false;

    if (target.major > 0) {
      return (
        version.major === target.major && compareSemver(version, target) >= 0
      );
    }
    if (target.minor > 0) {
      return (
        version.major === 0 &&
        version.minor === target.minor &&
        version.patch >= target.patch
      );
    }
    return (
      version.major === 0 &&
      version.minor === 0 &&
      version.patch === target.patch
    );
  }

  // Tilde range: ~X.Y.Z (compatible with same minor)
  if (trimmed.startsWith('~')) {
    const target = parseSemver(trimmed.slice(1));
    if (!target) return false;

    return (
      version.major === target.major &&
      version.minor === target.minor &&
      compareSemver(version, target) >= 0
    );
  }

  // Wildcard ranges: "20.x", "20.*", "20.X" or single major number "20"
  if (
    trimmed.endsWith('.x') ||
    trimmed.endsWith('.X') ||
    trimmed.endsWith('.*')
  ) {
    const prefix = trimmed.slice(0, -2);
    const target = parseSemver(prefix);
    if (!target) return false;
    if (!prefix.includes('.')) {
      return version.major === target.major;
    }
    return version.major === target.major && version.minor === target.minor;
  }

  // Single number like "20" (means 20.x)
  if (/^\d+$/.test(trimmed)) {
    const targetMajor = parseInt(trimmed, 10);
    return version.major === targetMajor;
  }

  // Exact version e.g. "20.19.0" or "=20.19.0"
  const target = parseSemver(trimmed);
  if (!target) return false;

  // If user only declared major.minor (e.g. "20.10"), match major & minor
  const parts = trimmed.replace(/^[v=]/i, '').split('.');
  if (parts.length === 1) {
    return version.major === target.major;
  }
  if (parts.length === 2) {
    return version.major === target.major && version.minor === target.minor;
  }

  return compareSemver(version, target) === 0;
}

/**
 * Checks if a version satisfies a single range clause consisting of one or more
 * space-separated or comma-separated comparators (e.g. ">=20.0.0 <23.0.0").
 */
function satisfiesRangeClause(version: SemverVersion, clause: string): boolean {
  // Normalize commas to spaces and split into individual comparators
  const tokens = clause
    .replace(/,/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return true;
  }

  return tokens.every((comparator) => satisfiesComparator(version, comparator));
}

/**
 * Evaluates whether an installed version string satisfies a declared SemVer range expression.
 * Supports unions (||), compound ranges (>=20.0.0 <23.0.0), carets (^20.0.0), tildes (~20.0.0),
 * wildcards (20.x, 20.*), and exact versions.
 */
export function satisfiesSemver(
  installedVersionStr: string,
  declaredRangeStr: string,
): boolean {
  if (!declaredRangeStr || declaredRangeStr.trim() === '') {
    return true;
  }

  const installed = parseSemver(installedVersionStr);
  if (!installed) {
    return false;
  }

  // Split range expression by union '||'
  const unionClauses = declaredRangeStr.split('||');

  // If installed version satisfies ANY union clause, it is compatible
  return unionClauses.some((clause) =>
    satisfiesRangeClause(installed, clause.trim()),
  );
}

/**
 * Evaluates whether a Node.js version declaration is an unpinned range or wildcard.
 */
export function isUnpinnedNodeVersion(version: string): boolean {
  const trimmed = version.trim();
  if (
    trimmed === '' ||
    trimmed === '*' ||
    trimmed === 'x' ||
    trimmed === 'X' ||
    trimmed.toLowerCase() === 'latest' ||
    trimmed.startsWith('>=') ||
    trimmed.startsWith('>') ||
    trimmed.startsWith('<=') ||
    trimmed.startsWith('<') ||
    trimmed.startsWith('^') ||
    trimmed.startsWith('~') ||
    trimmed.includes('||') ||
    trimmed.toLowerCase().includes('.x') ||
    trimmed.toLowerCase().includes('x.') ||
    trimmed.includes('*')
  ) {
    return true;
  }

  // Check if it's only a major or major.minor version without patch (e.g. "20" or "20.1")
  const parts = trimmed.replace(/^v/, '').split('.');
  if (parts.length < 3) {
    return true;
  }

  return false;
}
