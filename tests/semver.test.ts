import { describe, expect, it } from 'vitest';
import {
  parseSemver,
  compareSemver,
  satisfiesSemver,
  isUnpinnedNodeVersion,
} from '../src/detection/semver.js';

describe('SemVer Parsing & Comparison', () => {
  it('parses valid version strings into components', () => {
    expect(parseSemver('20.19.0')).toEqual({
      major: 20,
      minor: 19,
      patch: 0,
      prerelease: undefined,
      raw: '20.19.0',
    });

    expect(parseSemver('v22.17.1')).toEqual({
      major: 22,
      minor: 17,
      patch: 1,
      prerelease: undefined,
      raw: 'v22.17.1',
    });

    expect(parseSemver('18')).toEqual({
      major: 18,
      minor: 0,
      patch: 0,
      prerelease: undefined,
      raw: '18',
    });

    expect(parseSemver('3.11.4-rc.1')).toEqual({
      major: 3,
      minor: 11,
      patch: 4,
      prerelease: 'rc.1',
      raw: '3.11.4-rc.1',
    });
  });

  it('returns null for invalid semver strings', () => {
    expect(parseSemver('')).toBeNull();
    expect(parseSemver('abc')).toBeNull();
  });

  it('compares versions correctly', () => {
    const v18 = parseSemver('18.0.0')!;
    const v20 = parseSemver('20.19.0')!;
    const v22 = parseSemver('22.17.1')!;
    const v20Same = parseSemver('20.19.0')!;

    expect(compareSemver(v18, v20)).toBe(-1);
    expect(compareSemver(v22, v20)).toBe(1);
    expect(compareSemver(v20, v20Same)).toBe(0);
  });
});

describe('SemVer Range Satisfaction (satisfiesSemver)', () => {
  describe('Greater-than-or-equal ranges (>=)', () => {
    it('evaluates >=20.0.0 correctly with various installed versions', () => {
      expect(satisfiesSemver('22.17.1', '>=20.0.0')).toBe(true);
      expect(satisfiesSemver('20.19.0', '>=20.0.0')).toBe(true);
      expect(satisfiesSemver('20.0.0', '>=20.0.0')).toBe(true);
      expect(satisfiesSemver('18.19.0', '>=20.0.0')).toBe(false);
      expect(satisfiesSemver('19.9.9', '>=20.0.0')).toBe(false);
    });

    it('evaluates >=20 correctly', () => {
      expect(satisfiesSemver('22.17.1', '>=20')).toBe(true);
      expect(satisfiesSemver('20.0.0', '>=20')).toBe(true);
      expect(satisfiesSemver('18.0.0', '>=20')).toBe(false);
    });
  });

  describe('Caret ranges (^)', () => {
    it('evaluates ^20.0.0 correctly', () => {
      expect(satisfiesSemver('20.19.0', '^20.0.0')).toBe(true);
      expect(satisfiesSemver('20.0.0', '^20.0.0')).toBe(true);
      expect(satisfiesSemver('22.17.1', '^20.0.0')).toBe(false);
      expect(satisfiesSemver('18.19.0', '^20.0.0')).toBe(false);
    });
  });

  describe('Tilde ranges (~)', () => {
    it('evaluates ~20.1.0 correctly', () => {
      expect(satisfiesSemver('20.1.5', '~20.1.0')).toBe(true);
      expect(satisfiesSemver('20.1.0', '~20.1.0')).toBe(true);
      expect(satisfiesSemver('20.2.0', '~20.1.0')).toBe(false);
      expect(satisfiesSemver('22.0.0', '~20.1.0')).toBe(false);
    });
  });

  describe('Wildcards and major-only ranges', () => {
    it('evaluates 20.x, 20.*, and 20 correctly', () => {
      expect(satisfiesSemver('20.19.0', '20.x')).toBe(true);
      expect(satisfiesSemver('20.0.0', '20.*')).toBe(true);
      expect(satisfiesSemver('20.5.1', '20')).toBe(true);
      expect(satisfiesSemver('22.17.1', '20.x')).toBe(false);
      expect(satisfiesSemver('22.17.1', '20')).toBe(false);
    });

    it('evaluates * and latest as universal match', () => {
      expect(satisfiesSemver('22.17.1', '*')).toBe(true);
      expect(satisfiesSemver('18.0.0', 'latest')).toBe(true);
    });
  });

  describe('Exact versions', () => {
    it('evaluates exact version match correctly', () => {
      expect(satisfiesSemver('20.19.0', '20.19.0')).toBe(true);
      expect(satisfiesSemver('20.19.0', '=20.19.0')).toBe(true);
      expect(satisfiesSemver('20.19.0', 'v20.19.0')).toBe(true);
      expect(satisfiesSemver('22.17.1', '20.19.0')).toBe(false);
      expect(satisfiesSemver('20.18.0', '20.19.0')).toBe(false);
    });
  });

  describe('Compound ranges (AND)', () => {
    it('evaluates >=20.0.0 <23.0.0 correctly', () => {
      expect(satisfiesSemver('20.0.0', '>=20.0.0 <23.0.0')).toBe(true);
      expect(satisfiesSemver('22.17.1', '>=20.0.0 <23.0.0')).toBe(true);
      expect(satisfiesSemver('23.0.0', '>=20.0.0 <23.0.0')).toBe(false);
      expect(satisfiesSemver('18.0.0', '>=20.0.0 <23.0.0')).toBe(false);
    });
  });

  describe('Union ranges (OR / ||)', () => {
    it('evaluates 18 || 20 || 22 correctly', () => {
      expect(satisfiesSemver('18.20.0', '18 || 20 || 22')).toBe(true);
      expect(satisfiesSemver('20.19.0', '18 || 20 || 22')).toBe(true);
      expect(satisfiesSemver('22.17.1', '18 || 20 || 22')).toBe(true);
      expect(satisfiesSemver('21.0.0', '18 || 20 || 22')).toBe(false);
      expect(satisfiesSemver('16.0.0', '18 || 20 || 22')).toBe(false);
    });
  });
});

describe('Pinning Evaluator (isUnpinnedNodeVersion)', () => {
  it('identifies unpinned version ranges as true', () => {
    expect(isUnpinnedNodeVersion('>=20.0.0')).toBe(true);
    expect(isUnpinnedNodeVersion('>18')).toBe(true);
    expect(isUnpinnedNodeVersion('^20.0.0')).toBe(true);
    expect(isUnpinnedNodeVersion('~20.1.0')).toBe(true);
    expect(isUnpinnedNodeVersion('20.x')).toBe(true);
    expect(isUnpinnedNodeVersion('20.*')).toBe(true);
    expect(isUnpinnedNodeVersion('20')).toBe(true);
    expect(isUnpinnedNodeVersion('20.1')).toBe(true);
    expect(isUnpinnedNodeVersion('*')).toBe(true);
    expect(isUnpinnedNodeVersion('latest')).toBe(true);
    expect(isUnpinnedNodeVersion('18 || 20')).toBe(true);
  });

  it('identifies exact pinned versions as false', () => {
    expect(isUnpinnedNodeVersion('20.19.0')).toBe(false);
    expect(isUnpinnedNodeVersion('v22.17.1')).toBe(false);
    expect(isUnpinnedNodeVersion('18.20.4')).toBe(false);
  });
});
