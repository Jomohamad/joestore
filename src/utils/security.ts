export function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const blocked = /^(localhost|127\.|0\.0\.0\.0|169\.254\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;
    return !blocked.test(parsed.hostname);
  } catch { return false; }
}

export function isSafeRedirectPath(p: string): boolean {
  return typeof p === 'string'
    && p.startsWith('/')
    && !p.startsWith('//')
    && !p.includes('://');
}

export function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''");
}