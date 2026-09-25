/**
 * TRACKER.md parser — shared by the tracker web app and the repo tooling.
 *
 * ONE copy on purpose. An inline copy in the page and another in a build script
 * would drift, and the failure mode is the app silently rewriting the file in a
 * shape the tooling no longer understands. Both import this.
 *
 * The model keeps every line IN ORDER, tagged as either a recognised field or a
 * raw line copied verbatim, which is what makes serialize(parse(x)) === x. The
 * app therefore cannot reorder or drop anything it did not understand.
 */
export const FIELD_RE = /^- \*\*(.+?)\*\* `\[(\w+)\]`\s?(.*)$/;

/**
 * The model keeps every line IN ORDER, tagged as either a recognised field or a
 * raw line copied verbatim. An earlier version bucketed content into "before the
 * fields" and "after the fields", which silently reordered anything that did not
 * fit that shape — it moved the status table in the header above its own prose.
 * Order-preserving means the app physically cannot rearrange your writing.
 */
export function parse(text) {
  /**
   * NORMALISE LINE ENDINGS FIRST — the same first move `docs/sprite-fmt.js`
   * makes, and for a reason this file learned the hard way.
   *
   * In JavaScript `\r` is a line TERMINATOR: `.` does not match it and `$` does
   * not sit before it. So a CRLF file split on '\n' leaves a trailing `\r` that
   * FIELD_RE cannot get past, and it matches NOTHING — every field silently
   * becomes a raw line. `npm run status` then reported 0/13 design fields for
   * all 17 bosses while calling five of them DONE, and `npm run sync` blanked
   * three fields on every boss and printed a success message.
   *
   * `.gitattributes` is the real fix and stops the file arriving that way. This
   * is here so a file pasted in from a Windows editor cannot take the toolchain
   * down a second time. Round-tripping such a file returns LF, which is correct:
   * LF is what the repo stores.
   */
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const d = { pre: [], sections: [] };
  let sec = null, item = null, field = null;

  for (const line of lines) {
    if (/^# /.test(line)) {
      sec = { title: line.slice(2).trim(), items: [] };
      d.sections.push(sec);
      item = { title: null, content: [] };   // the section's own intro lines
      sec.items.push(item);
      field = null;
      continue;
    }
    if (!sec) { d.pre.push(line); continue; }
    if (/^## /.test(line)) {
      item = { title: line.slice(3).trim(), content: [] };
      sec.items.push(item);
      field = null;
      continue;
    }
    const m = FIELD_RE.exec(line);
    if (m) {
      field = { type: 'field', label: m[1], mark: m[2], text: m[3] };
      item.content.push(field);
      continue;
    }
    // A continuation line of a multi-line field is indented by two spaces.
    if (field && /^ {2}\S/.test(line)) { field.text += '\n' + line.slice(2); continue; }
    field = null;
    item.content.push({ type: 'raw', line });
  }
  return d;
}

export function serialize(d) {
  const out = [...d.pre];
  for (const sec of d.sections) {
    out.push('# ' + sec.title);
    for (const it of sec.items) {
      if (it.title !== null) out.push('## ' + it.title);
      for (const c of it.content) {
        if (c.type === 'raw') { out.push(c.line); continue; }
        const body = c.text.split('\n').map((l, i) => (i ? '  ' + l : l)).join('\n');
        out.push(`- **${c.label}** \`[${c.mark}]\` ${body}`.replace(/\s+$/, ''));
      }
    }
  }
  return out.join('\n');
}

/** The recognised fields of an item, in order. */
export const fieldsOf = (it) => it.content.filter((c) => c.type === 'field');
/** Raw prose lines of an item, for the meta strip. */
export const rawOf = (it) => it.content.filter((c) => c.type === 'raw').map((c) => c.line);

/**
 * COMBINE TWO VERSIONS OF THE TRACKER THAT BOTH MOVED ON FROM THE SAME START.
 *
 * Needed because every save replaces the whole file. If the owner is typing in
 * a browser while Claude commits from a session, one of the two is about to be
 * written straight over the other with no warning — that is what ate seven
 * fields once. GitHub refuses the second write, and this is what makes the
 * refusal recoverable instead of just an error message.
 *
 * `theirs` is what is on GitHub now, `mine` is this tab's version, and `base`
 * is the version they both started from. Comparing each side against `base` is
 * what tells a real edit apart from a line that simply has not changed — with
 * only two versions there is no way to know which one moved.
 *
 * STRUCTURE COMES FROM `theirs`, FIELD VALUES FROM WHOEVER CHANGED THEM. New
 * sections and new prose arrive from Claude's side, so that copy is the one
 * worth starting from; then any field this tab actually edited is laid over
 * the top. A field neither side touched keeps the one value it always had, and
 * a field both sides changed keeps this tab's — the owner is sitting in front
 * of it, and their version is the one they can see.
 */
export function mergeTracker(theirs, mine, base) {
  const T = parse(theirs), M = parse(mine), B = parse(base);
  const at = (sec, item, label) => `${sec}\u0000${item}\u0000${label}`;

  const index = (d) => {
    const map = new Map();
    for (const sec of d.sections) {
      for (const it of sec.items) {
        for (const f of it.content) {
          if (f.type === 'field') map.set(at(sec.title, it.title, f.label), f);
        }
      }
    }
    return map;
  };
  const items = (d) => {
    const map = new Map();
    for (const sec of d.sections) {
      for (const it of sec.items) map.set(`${sec.title}\u0000${it.title}`, it);
    }
    return map;
  };

  const tIx = index(T), bIx = index(B), tItems = items(T);

  for (const sec of M.sections) {
    for (const it of sec.items) {
      for (const f of it.content) {
        if (f.type !== 'field') continue;
        const key = at(sec.title, it.title, f.label);
        const was = bIx.get(key);
        // Unchanged here means this side has nothing to contribute to it.
        if (was && was.text === f.text && was.mark === f.mark) continue;
        const there = tIx.get(key);
        if (there) { there.text = f.text; there.mark = f.mark; continue; }
        /**
         * A field this tab has and GitHub does not. The app only edits fields
         * it was given, so in practice this is a field Claude DELETED while it
         * was being edited here. Putting it back is the safe direction: an
         * unwanted line is visible and one keystroke to remove, whereas
         * writing over somebody's sentence is invisible and gone for good.
         */
        const host = tItems.get(`${sec.title}\u0000${it.title}`);
        if (host) host.content.push({ type: 'field', label: f.label, mark: f.mark, text: f.text });
      }
    }
  }
  return serialize(T);
}
