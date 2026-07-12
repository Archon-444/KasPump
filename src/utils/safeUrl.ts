/**
 * URL-scheme allowlist for creator-supplied links (token website / socials).
 *
 * Token metadata is attacker-controlled, so rendering it directly into an
 * anchor `href` allows a stored-XSS vector via `javascript:` (or `data:` /
 * `vbscript:`) URLs that execute in the victim's origin on click. `safeUrl`
 * returns the URL only if it parses to an http(s) scheme; otherwise it returns
 * `undefined` so the caller can omit the link.
 */
export function safeUrl(raw: string | null | undefined): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return undefined;
  } catch {
    // Not an absolute URL. Treat a bare host ("example.com") as https, but never
    // pass through a scheme-bearing string that failed to parse as http(s).
    if (/^[a-zA-Z0-9]/.test(trimmed) && !trimmed.includes(':')) {
      return `https://${trimmed}`;
    }
    return undefined;
  }
}
