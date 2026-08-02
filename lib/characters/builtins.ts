import { PEONY } from "./builtins/peony.ts";
import type { CanonicalCharacterV1 } from "./canonical.ts";

const BUILTIN_CANON: Readonly<Record<string, CanonicalCharacterV1>> = {
  peony: PEONY,
};

export function resolveLatestBuiltinCanon(id: string): CanonicalCharacterV1 | null {
  return BUILTIN_CANON[id] ?? null;
}
