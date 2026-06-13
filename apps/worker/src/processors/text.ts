/**
 * Reduces a raw RSS/Atom entry to plain text for extraction. Raw records are
 * stored verbatim (the provenance invariant), so de-HTML happens here at
 * extract time rather than mutating the stored payload.
 *
 * Prefers the human-readable fields (title + description/summary/content); falls
 * back to the whole block. Output is bounded so a pathological entry can't blow
 * up the prompt.
 */
export function toPlainText(raw: string, maxChars = 8000): string {
  const pick = (re: RegExp) => raw.match(re)?.[1] ?? "";
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const body = pick(
    /<(?:description|summary|content)[^>]*>([\s\S]*?)<\/(?:description|summary|content)>/i,
  );
  const source = `${title}\n\n${body || raw}`;
  return source
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:#\d+|#x[0-9a-f]+|[a-z]+);/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}
