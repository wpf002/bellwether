import { parseIndustryPack, type IndustryPack } from "@bellwether/core";
import { saasPack } from "./packs/saas.js";

/**
 * Industry registry. Each pack is validated at load time, so malformed config
 * fails fast on boot rather than mid-pipeline. Adding a vertical = add a pack
 * file + one line here. No engine changes (Phase 2 success criterion).
 */
const rawPacks: IndustryPack[] = [saasPack];

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

export { saasPack };
