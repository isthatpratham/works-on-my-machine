import os from 'node:os';

/**
 * Operating system and platform fact collection.
 *
 * Uses authoritative Node.js process and OS APIs.
 */

export function getOperatingSystem(): string {
  return process.platform;
}

export function getCpuArchitecture(): string {
  return process.arch;
}

export function getDefaultShell(): string | undefined {
  if (process.platform === 'win32') {
    return process.env.ComSpec || process.env.SHELL || undefined;
  }
  return process.env.SHELL || undefined;
}

export function getSystemNodeVersion(): string {
  return process.version;
}

export function getSystemHostname(): string {
  return os.hostname();
}
