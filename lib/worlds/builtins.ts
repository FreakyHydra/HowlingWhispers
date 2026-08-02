import { CODA_WORLD_ID, CODA_WORLD_LORE } from "./builtins/coda.ts";
import { HEATHER_WORLD_ID, HEATHER_WORLD_LORE } from "./builtins/heather.ts";
import { PEONY_WORLD_ID, PEONY_WORLD_LORE } from "./builtins/peony.ts";
import { SENAKO_WORLD_ID, SENAKO_WORLD_LORE } from "./builtins/senako.ts";
import type { WorldLorebookV1 } from "./schema.ts";

const BUILTIN_WORLD_LORE: Readonly<Record<string, WorldLorebookV1>> = {
  [CODA_WORLD_ID]: CODA_WORLD_LORE,
  [HEATHER_WORLD_ID]: HEATHER_WORLD_LORE,
  [PEONY_WORLD_ID]: PEONY_WORLD_LORE,
  [SENAKO_WORLD_ID]: SENAKO_WORLD_LORE,
};

export function resolveBuiltinWorldLore(worldId: string): WorldLorebookV1 | null {
  return BUILTIN_WORLD_LORE[worldId] ?? null;
}
