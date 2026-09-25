/**
 * GitHub REST plumbing — shared by the tracker app and the sprite editor.
 *
 * ONE copy on purpose, for the same reason as tracker-md.js. Both apps talk to
 * the same repo with the same token, and both had their own copy of this until
 * the copies started disagreeing — each app had learned a lesson the other had
 * not, and the tracker blanking on a mistyped token was one of them.
 *
 * WHAT THIS FILE DOES AND DOES NOT DO: it is the talking-to-GitHub part only.
 * Deciding WHEN to write, keeping a copy in the browser until the write lands,
 * and combining two versions that both moved on all live in `autosave.js`.
 *
 * The draft-branch machinery that used to live here is gone with the rest of
 * that design — there is no second branch to fork, publish or reset now that
 * both apps write straight to `main`. See the top of `autosave.js` for why.
 */

export const OWNER = 'EchoJex';
export const REPO = 'mega-dash';

/** Shared between the two apps deliberately — one token, one paste. */
const TOKEN_KEY = 'megadash_gh_token';
export const token = () => localStorage.getItem(TOKEN_KEY) || '';

/**
 * Store or clear the token, forgetting any rejection of the OLD one.
 *
 * The two always move together — a token that has just been retyped has not
 * been rejected yet — so they are one call rather than two the caller has to
 * remember to pair.
 */
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
  tokenBad = false;
}

/** True once the current token has been rejected, so the UI can say read-only. */
export const tokenRejected = () => tokenBad;

// Base64 has to go through UTF-8 explicitly or every em dash and arrow in the
// tracker corrupts on save.
export const b64encode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
};
export const b64decode = (b64) => {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/** True once the current token has been rejected, so we stop re-sending it. */
let tokenBad = false;

/**
 * The repo is PUBLIC, so reading needs no credentials at all.
 *
 * A bad or expired token therefore must never stop you reading — it should only
 * stop you saving. Attaching the token unconditionally meant one mistyped
 * character produced "401 Bad credentials" on a plain read and the whole app
 * went blank, which is a far worse failure than "saving is off". Reads now
 * retry anonymously and the app carries on read-only.
 *
 * A 204 HAS NO BODY. `/merges` returns one when there is nothing to merge, and
 * res.json() on it throws a SyntaxError that reads like a network fault.
 */
export async function gh(path, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  const send = async (withToken) => {
    const headers = { Accept: 'application/vnd.github+json', ...(opts.headers || {}) };
    if (withToken) headers.Authorization = 'Bearer ' + token();
    return fetch('https://api.github.com' + path, { ...opts, headers });
  };
  const body = async (res) => {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  };

  const useToken = !!token() && !tokenBad;
  let res = await send(useToken);

  if (res.status === 401 && useToken) {
    tokenBad = true;
    if (method === 'GET') {
      res = await send(false);            // public read still works without it
      if (res.ok) return body(res);       // caller reports the read-only state
    }
    throw new Error('TOKEN_REJECTED');
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${(await res.text()).slice(0, 200)}`);
  return body(res);
}
