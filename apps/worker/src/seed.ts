import type { Database } from "@bellwether/db";
import { schema } from "@bellwether/db";
import type { IndustryPack } from "@bellwether/core";

/**
 * Idempotently persists a pack's industry + source rows. Raw records and signals
 * reference these via foreign keys, so this must run before the first scrape of
 * a pack. Safe to call repeatedly — existing rows are left untouched.
 */
export async function ensurePackPersisted(db: Database, pack: IndustryPack): Promise<void> {
  await db
    .insert(schema.industries)
    .values({ id: pack.id, label: pack.label, description: pack.description })
    .onConflictDoNothing();

  if (pack.sources.length > 0) {
    await db
      .insert(schema.sources)
      .values(
        pack.sources.map((s) => ({
          id: s.id,
          industryId: pack.id,
          label: s.label,
          kind: s.kind,
          adapter: s.adapter,
          url: s.url,
        })),
      )
      .onConflictDoNothing();
  }
}
