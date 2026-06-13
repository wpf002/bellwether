/**
 * Selects records not already seen, deduping both against persisted hashes and
 * within the freshly fetched batch. The storage layer also enforces a
 * `(sourceId, contentHash)` unique index — this is the cheap first pass so we
 * only enqueue extract jobs for genuinely new records.
 */
export function selectNewRecords<T extends { contentHash: string }>(
  fetched: T[],
  existingHashes: Iterable<string>,
): T[] {
  const seen = new Set(existingHashes);
  const fresh: T[] = [];
  for (const record of fetched) {
    if (seen.has(record.contentHash)) continue;
    seen.add(record.contentHash);
    fresh.push(record);
  }
  return fresh;
}
