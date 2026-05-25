/**
 * Utility to execute a Prisma query with automatic Supabase HTTP fallback.
 * Eliminates the repeated try/catch pattern across all routes.
 */
export async function withFallback<T>(
  prismaFn: () => Promise<T>,
  supabaseFn: () => Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  try {
    const result = await Promise.race([
      prismaFn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Prisma Timeout')), timeoutMs)
      ),
    ]);
    return result;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[DB] Prisma failed (${errMsg}). Falling back to Supabase HTTP...`);
    return supabaseFn();
  }
}

/**
 * Same as withFallback but returns null on both failures instead of throwing.
 */
export async function withFallbackSafe<T>(
  prismaFn: () => Promise<T>,
  supabaseFn: () => Promise<T>,
  timeoutMs: number = 5000
): Promise<T | null> {
  try {
    return await withFallback(prismaFn, supabaseFn, timeoutMs);
  } catch (error) {
    console.error('[DB] Both Prisma and Supabase fallback failed:', error);
    return null;
  }
}
