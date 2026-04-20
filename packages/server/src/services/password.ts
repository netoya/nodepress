/**
 * Password hashing service (ADR-026).
 *
 * Primary: bcrypt@^5.1.1 (native), cost factor 12.
 * Fallback: bcryptjs (pure-JS, same $2b$ hash format) — swap the import below if Alpine build fails.
 *
 * Contract:
 *   - hash()   accepts plaintext, returns stored hash. Plaintext is never stored or logged.
 *   - verify() accepts plaintext + stored hash, returns boolean.
 *
 * bcrypt silently truncates inputs beyond 72 bytes. At min-8-char policy this is unreachable
 * by normal users, but callers should document the constraint if accepting arbitrary-length passwords.
 */

import bcrypt from "bcrypt";

const COST_FACTOR = 12;

/**
 * Hash a plaintext password with bcrypt cost 12.
 * The returned string is self-describing ($2b$12$...) and includes the salt.
 */
export async function hash(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, COST_FACTOR);
}

/**
 * Verify a plaintext password against a stored bcrypt hash.
 */
export async function verify(
  plaintext: string,
  storedHash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, storedHash);
}
