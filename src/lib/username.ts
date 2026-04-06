/** Usernames used in public URLs — must not shadow app routes or static files. */
const RESERVED_USERNAMES = new Set([
  'api',
  'auth',
  'dashboard',
  '_next',
  'static',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]);

const MIN_LEN = 2;
const MAX_LEN = 40;

export type UsernameValidation =
  | { ok: true; username: string }
  | { ok: false; error: string };

/** Normalizes input the same way as initial signup usernames (see auth0.ts). */
export function validateUsernameInput(raw: string): UsernameValidation {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (normalized.length < MIN_LEN) {
    return { ok: false, error: 'Username must be at least 2 characters.' };
  }
  if (normalized.length > MAX_LEN) {
    return { ok: false, error: `Username must be at most ${MAX_LEN} characters.` };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return { ok: false, error: 'That username is reserved.' };
  }
  return { ok: true, username: normalized };
}
