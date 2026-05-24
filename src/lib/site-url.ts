/**
 * Resolve the public site URL for absolute redirects (email confirmation,
 * password reset, OAuth callbacks).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL — explicit override, recommended for prod
 *   2. NEXT_PUBLIC_VERCEL_URL — auto-populated on Vercel previews
 *   3. window.location.origin — last-resort client fallback (dev only)
 *
 * Always returns a value with a protocol and no trailing slash.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return stripTrailingSlash(ensureProtocol(explicit));

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercel) return stripTrailingSlash(ensureProtocol(vercel));

  if (typeof window !== "undefined") {
    return stripTrailingSlash(window.location.origin);
  }

  return "http://localhost:3000";
}

function ensureProtocol(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
