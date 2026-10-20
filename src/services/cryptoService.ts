/**
 * Cryptographic security utilities for ORACLIME DMS
 * Uses Web Crypto API (SHA-256) for secure password & PIN hashing and file checksums.
 * Plain-text passwords and PINs are NEVER stored.
 */

export class CryptoService {
  /**
   * Generates a random hexadecimal salt
   */
  public static generateSalt(length = 16): string {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Cryptographically hashes a string (password or PIN) with a salt using SHA-256
   */
  public static async hashWithSalt(value: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${salt}:${value}:ORACLIME_DMS_SECURE`);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Computes SHA-256 checksum of an ArrayBuffer or binary string
   */
  public static async computeChecksum(data: ArrayBuffer | string): Promise<string> {
    let buffer: BufferSource;
    if (typeof data === 'string') {
      buffer = new TextEncoder().encode(data);
    } else {
      buffer = data;
    }
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hex = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
    return `sha256-${hex}`;
  }

  /**
   * Verifies an input against an existing hash and salt
   */
  public static async verifyHash(input: string, salt: string, expectedHash: string): Promise<boolean> {
    const computed = await this.hashWithSalt(input, salt);
    return computed === expectedHash;
  }
}
