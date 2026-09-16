/**
 * GitHub REST plumbing — shared by the tracker app and the sprite editor.
 *
 * ONE copy on purpose, for the same reason as tracker-md.js. Both apps talk to
 * the same repo, with the same token, against the same draft branch, and both
 * had their own copy of this until the copies started disagreeing:
 *
 *   - the tracker learned that a rejected token must not stop a READ; the
 *     editor still blanked the whole page on one mistyped character.
 *   - the editor learned that a 204 has no body; the tracker still called
 *     res.json() on `/merges`, which returns exactly that when there is
 *     nothing to merge.
 *   - the editor's ensureDraft swallowed EVERY error as "no draft branch", so
 *     an offline moment forked a second one.
 *
 * Each app had half the lesson. This file has both halves.
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

/** Autosaves land here; only PUBLISH moves the working branch. */
export const draftRef = (branch) => `tracker-draft/${branch}`;

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

/** The sha a branch points at, or null if it has none. */
export async function headOf(ref) {
  try {
    const r = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${ref}?t=${Date.now()}`);
    return r.object.sha;
  } catch { return null; }
}

/**
 * Make sure the draft branch exists, forking it from the working branch.
 *
 * Created lazily rather than up front: someone who only ever reads should not
 * leave a branch behind on the repo for having opened a web page.
 */
export async function ensureDraft(branch) {
  const ref = draftRef(branch);
  if (await headOf(ref)) return ref;
  const base = await headOf(branch);
  if (!base) throw new Error(`cannot find branch ${branch}`);
  await gh(`/repos/${OWNER}/${REPO}/git/refs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${ref}`, sha: base }),
  });
  return ref;
}
