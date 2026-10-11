/**
 * Only same-site relative paths are allowed as a post-sign-in destination,
 * so a crafted ?next= link can't bounce someone to another site
 * (docs/SECURITY.md §1). Pure and browser-safe.
 */
export function safeReturnPath(path: string | null | undefined, fallback = "/ride"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  return path;
}
