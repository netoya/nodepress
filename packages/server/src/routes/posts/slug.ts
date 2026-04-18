/**
 * Slug derivation and collision resolution (WordPress-compatible).
 * Pure functions for testing + dependency injection for DB access.
 */

/**
 * Derive a slug from a title.
 * - Lowercase
 * - Replace whitespace with hyphens
 * - Strip non-alphanumeric except hyphens
 * - Max 200 chars
 *
 * If result is empty (only symbols), returns "untitled".
 */
export function deriveSlug(title: string): string {
  if (!title) return "";

  // Lowercase + replace whitespace with hyphen + remove non-alphanumeric except hyphens
  const normalized = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 200);

  return normalized || "untitled";
}

/**
 * Find an available slug by appending suffixes (-2, -3, etc.) if needed.
 *
 * @param baseSlug The base slug to check
 * @param exists Function that checks if slug exists in DB
 * @returns Available slug (baseSlug or baseSlug-N)
 * @throws Error if 100+ collisions (unlikely but defensive)
 */
export async function findAvailableSlug(
  baseSlug: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!baseSlug) {
    return baseSlug; // Empty slug passed; let caller handle
  }

  // Check if base slug is available
  const baseExists = await exists(baseSlug);
  if (!baseExists) {
    return baseSlug;
  }

  // Collision: try suffixes
  for (let i = 2; i <= 100; i++) {
    const candidate = `${baseSlug}-${i}`;
    const candidateExists = await exists(candidate);
    if (!candidateExists) {
      return candidate;
    }
  }

  // 100+ collisions
  throw new Error(
    `Unable to find available slug after 100 attempts. Original: ${baseSlug}. Provide explicit slug.`,
  );
}
