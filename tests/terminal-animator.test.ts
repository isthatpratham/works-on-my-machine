import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { PassThrough } from 'node:stream';
import {
  isInteractiveTerminal,
  revealTerminalReport,
} from '../src/reporting/terminal-animator.js';

describe('terminal-animator', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('isInteractiveTerminal', () => {
    it('returns false when stream is not a TTY', () => {
      const mockStream = new PassThrough() as unknown as NodeJS.WriteStream;
      mockStream.isTTY = false;
      expect(isInteractiveTerminal(mockStream)).toBe(false);
    });

    it('returns false when CI environment variable is set', () => {
      process.env.CI = 'true';
      delete process.env.NODE_ENV;
      const mockStream = new PassThrough() as unknown as NodeJS.WriteStream;
      mockStream.isTTY = true;
      expect(isInteractiveTerminal(mockStream)).toBe(false);
    });

    it('returns false when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.CI;
      const mockStream = new PassThrough() as unknown as NodeJS.WriteStream;
      mockStream.isTTY = true;
      expect(isInteractiveTerminal(mockStream)).toBe(false);
    });

    it('returns false when NO_ANIMATION is set', () => {
      delete process.env.CI;
      delete process.env.NODE_ENV;
      process.env.NO_ANIMATION = '1';
      const mockStream = new PassThrough() as unknown as NodeJS.WriteStream;
      mockStream.isTTY = true;
      expect(isInteractiveTerminal(mockStream)).toBe(false);
    });

    it('returns true when in interactive TTY without CI or test flags', () => {
      delete process.env.CI;
      delete process.env.NODE_ENV;
      delete process.env.NO_ANIMATION;
      const mockStream = new PassThrough() as unknown as NodeJS.WriteStream;
      mockStream.isTTY = true;
      expect(isInteractiveTerminal(mockStream)).toBe(true);
    });
  });

  describe('revealTerminalReport', () => {
    it('writes entire report immediately in non-interactive mode', async () => {
      const chunks: string[] = [];
      const mockStream = new PassThrough();
      mockStream.on('data', (chunk) => chunks.push(chunk.toString()));

      const sampleReport = 'Line 1\nLine 2\nLine 3';
      await revealTerminalReport(sampleReport, {
        stream: mockStream,
        isTTY: false,
      });

      expect(chunks.join('')).toBe('Line 1\nLine 2\nLine 3\n');
      expect(chunks.length).toBe(1);
    });

    it('progressively streams report line-by-line in interactive mode', async () => {
      const chunks: string[] = [];
      const mockStream = new PassThrough();
      mockStream.on('data', (chunk) => chunks.push(chunk.toString()));

      const sampleReport = 'Header\nScore: 90\nSummary';
      await revealTerminalReport(sampleReport, {
        stream: mockStream,
        isTTY: true,
        lineDelayMs: 1,
      });

      expect(chunks.join('')).toBe('Header\nScore: 90\nSummary\n');
      expect(chunks).toEqual(['Header\n', 'Score: 90\n', 'Summary\n']);
    });

    it('handles single line report cleanly in interactive mode', async () => {
      const chunks: string[] = [];
      const mockStream = new PassThrough();
      mockStream.on('data', (chunk) => chunks.push(chunk.toString()));

      await revealTerminalReport('Single Line Report', {
        stream: mockStream,
        isTTY: true,
        lineDelayMs: 1,
      });

      expect(chunks.join('')).toBe('Single Line Report\n');
      expect(chunks.length).toBe(1);
    });
  });
});
