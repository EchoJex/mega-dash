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
  const lines = text.split('\n');
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
