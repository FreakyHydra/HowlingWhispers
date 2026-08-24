import { PEONY } from "./builtins/peony.ts";
import { RILEY } from "./builtins/riley.ts";
import type { CanonicalCharacterV1 } from "./canonical.ts";

const PEONY_V2: CanonicalCharacterV1 = {
  ...PEONY,
  id: "peony-v2",
  revision: "2.0.0",
  identity: {
    ...PEONY.identity,
    role: "Someone to get to know eventually",
  },
};

const BUILTIN_CANON: Readonly<Record<string, CanonicalCharacterV1>> = {
  peony: PEONY,
  "peony-v2": PEONY_V2,
  riley: RILEY,
};

export function resolveLatestBuiltinCanon(id: string): CanonicalCharacterV1 | null {
  return BUILTIN_CANON[id] ?? null;
}
