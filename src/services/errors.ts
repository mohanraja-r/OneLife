/**
 * Narrows an unknown thrown value to a message worth showing the user, falling
 * back when it is not an Error — so no call site has to type its `catch` as
 * `any` to reach `.message`.
 */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
