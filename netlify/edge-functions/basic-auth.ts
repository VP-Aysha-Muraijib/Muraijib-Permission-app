/**
 * HTTP Basic authentication for the pages that hold staff observation records.
 *
 * Runs on Netlify's edge before the file is served, so the page never reaches
 * a browser that has not authenticated. The credentials live in the Netlify
 * environment variable OBS_AUTH_USERS, never in this repository.
 *
 *   OBS_AUTH_USERS = "aysha:FIRST-PASSWORD noura:SECOND-PASSWORD"
 *
 * Space-separated user:password pairs. Use ASCII characters only: the Basic
 * scheme encodes credentials as latin1, so Arabic letters will not match.
 *
 * With the variable unset every request is refused. A missing password must
 * close the door, not leave it open.
 */

/* HTTP header values are latin1, so the realm stays plain ASCII. */
const REALM = 'Muraijib Classroom Observation';

function refuse(): Response {
  return new Response('مطلوب تسجيل الدخول · Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

/* Compare without leaking how much of the password matched. */
function sameSecret(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function readEnv(name: string): string {
  try {
    // @ts-ignore — Netlify global, present at the edge
    if (typeof Netlify !== 'undefined') return Netlify.env.get(name) ?? '';
  } catch { /* fall through */ }
  try {
    // @ts-ignore — Deno global, the edge runtime
    return Deno.env.get(name) ?? '';
  } catch {
    return '';
  }
}

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const allowed = readEnv('OBS_AUTH_USERS').trim();
  if (!allowed) return refuse();

  const header = request.headers.get('authorization') ?? '';
  if (!/^basic /i.test(header)) return refuse();

  let supplied: string;
  try {
    supplied = atob(header.slice(6).trim());
  } catch {
    return refuse();
  }

  const ok = allowed.split(/\s+/).filter(Boolean)
    .reduce((found, pair) => sameSecret(pair, supplied) || found, false);

  if (!ok) return refuse();

  const response = await context.next();
  /* Records must not sit in a shared or browser cache behind the login. */
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
};

export const config = {
  path: ['/classroom-visits.html', '/admin-dashboard.html'],
};
