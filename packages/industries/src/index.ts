import { parseIndustryPack, type IndustryPack } from "@bellwether/core";
import { saasPack } from "./packs/saas.js";
import { ecommercePack } from "./packs/ecommerce.js";
import { catalogPacks } from "./packs/catalog.js";

/**
 * Industry registry. Each pack is validated at load time, so malformed config
 * fails fast on boot rather than mid-pipeline. Adding a vertical = add a pack
 * file + one line here. No engine changes (Phase 2 success criterion).
 *
 * saas + ecommerce are hand-curated flagships; catalogPacks are 18 more
 * verticals (20 total) generated from a template, each pulling live HN signals.
 */
const rawPacks: IndustryPack[] = [saasPack, ecommercePack, ...catalogPacks];

export const industryPacks: Record<string, IndustryPack> = Object.fromEntries(
  rawPacks.map((p) => [p.id, parseIndustryPack(p)]),
);

export function getIndustryPack(id: string): IndustryPack {
  const pack = industryPacks[id];
  if (!pack) throw new Error(`Unknown industry pack: ${id}`);
  return pack;
}

export function listIndustryPacks(): IndustryPack[] {
  return Object.values(industryPacks);
}

export { saasPack, ecommercePack };
