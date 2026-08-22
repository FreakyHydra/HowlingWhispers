# Character Factory + Trait Library Implementation Plan

## Goal
Build a Character Factory (multi-section character editor with tabbed navigation) that replaces the existing inline edit modal in `character-area.tsx`, and integrate a 111-trait built-in library with primary/secondary/situational tiers that feeds into the context compiler.

---

## 1. Schema Changes

### 1.1 Add trait types
**New file: `lib/characters/traits.ts`**

```ts
export type TraitTier = "primary" | "secondary" | "situational";

export type CharacterTraitAssignment = {
  id: string;
  tier: TraitTier;
};

export type CustomTrait = {
  id: string;
  name: string;
  description: string;
};

export type CharacterTraits = {
  primary: string[];
  secondary: string[];
  situational: string[];
  custom?: CustomTrait[];
};
```

### 1.2 Add built-in trait library data
**New file: `lib/characters/trait-library.ts`**

Export the 111-trait JSON array with stable slug IDs (e.g. `"defiant"`). Each entry: `{ id: string; name: string; description: string; }`.

Also export helper:
- `getTraitById(id: string): TraitDefinition | undefined`
- `searchTraits(query: string): TraitDefinition[]`

### 1.3 Update runtime `Character` type
**File: `app/dreambound-app.tsx`** (around line 135–160)

Add optional field:
```ts
traits?: CharacterTraits;
```

### 1.4 Update `CanonicalCharacterV1`
**File: `lib/characters/canonical.ts`**

Add `traits?: CharacterTraits;` to the type. The compiler will read from this field.

### 1.5 Update `BackupUserCharacter` / `BackupCharacter`
**File: `lib/characters/import-export.ts`**

Add optional `traits?: CharacterTraits;` to `BackupCharacter`.

**File: `lib/backup/format.ts`**

Add optional `traits?: CharacterTraits;` to `BackupUserCharacter`. Update `buildBackupPayload` and `restoreFromBackupPayload` to round-trip this field.

### 1.6 Update V2 conversion functions
**File: `lib/characters/character-card-v2.ts`**

- In `howlingCharacterToV2()`: if `character.traits` exists, serialize into `data.extensions["howling_traits"]` so round-trip is preserved.
- In `characterCardV2ToHowling()`: read `data.extensions["howling_traits"]` back into `character.traits`.
- V2 `tags` remain preserved in `cardV2.tags`; do NOT auto-import them into the trait system.

### 1.7 Backwards-compatibility defaults
All new fields are optional. Missing `traits` → treated as empty `{ primary: [], secondary: [], situational: [], custom: [] }`. No migration needed.

---

## 2. Trait Selector Component

**New file: `app/features/characters/trait-selector.tsx`**

Props:
- `value: CharacterTraits` (current assignments)
- `onChange: (traits: CharacterTraits) => void`
- `disabled?: boolean`

Behavior:
- Compact search input at top.
- Searchable list of all 111 built-in traits (use `searchTraits()`).
- Each item shows trait name; hover/click reveals description in a tooltip or expandable row.
- Three action buttons per item: "Add Primary", "Add Secondary", "Add Situational". Disabled if already assigned in that tier.
- Assigned traits shown in grouped lists below (Primary / Secondary / Situational) with remove buttons and tier-change dropdowns.
- Custom trait creation: text input + optional description → added to `custom` array and then selectable like built-ins.
- Prevent duplicate assignment across all tiers (same `id` cannot appear in more than one tier).
- Keyboard-friendly, accessible.

---

## 3. Character Factory Shell

**New file: `app/features/characters/character-factory.tsx`**

Replaces the edit modal in `character-area.tsx`. State is a full `Character` object (or partial for new characters).

### Tab structure (top nav, horizontal tabs with scroll on mobile):
1. **Identity**
2. **Appearance**
3. **Personality**
4. **Voice**
5. **Background**
6. **Relationships**
7. **RP Behavior**
8. **World**
9. **Advanced**
10. **Preview**

### State management
- Local state: `draft: Character` initialized from props or defaults.
- `onSave(draft)` callback to persist.
- `onCancel` callback to close without saving.
- Dirty tracking optional but recommended.

### Shell UI
- Modal/overlay (matches existing app modal styling).
- Tabs at top.
- Active tab content area.
- Footer: Cancel / Save buttons.

### Tab sections

**3.1 Identity (`character-factory-identity.tsx` inline or extracted)**
Fields: `name`, `role`, `pronouns`, `species` (free text, not select), `ageCategory` (adult/minor/unknown), `isMinor`, `image` (URL input), optional additional images.

**3.2 Appearance (`character-factory-appearance.tsx`)**
Freeform fields: height, build, hair, eyes, skin, distinguishing features, clothing/style, general description. All optional textareas. No required fields.

**3.3 Personality (`character-factory-personality.tsx`)**
- Freeform `profile` textarea (existing field, preserved).
- `TraitSelector` component (primary/secondary/situational + custom).
- Likes, Dislikes, Habits, Strengths, Weaknesses, Fears, Values/Principles — all optional comma-separated or free-text inputs.

**3.4 Voice (`character-factory-voice.tsx`)**
Fields: speech style, vocabulary level, accent/dialect, typical sentence length, humor style, swearing level, emotional expressiveness, body-language tendencies, common mannerisms, things they would rarely say/do, example dialogue. All optional.

**3.5 Background (`character-factory-background.tsx`)**
Fields: short biography, childhood/upbringing, important past events, family, education, occupation/history, skills, secrets, trauma/major formative events, current situation. All optional.

**3.6 Relationships (`character-factory-relationships.tsx`)**
List of relationships to other Howling Whispers characters. Each entry: character reference (by ID), relationship type, description, trust, affection, familiarity, custom notes. Uses the existing character list from app state. Empty list allowed.

**3.7 RP Behavior (`character-factory-rp.tsx`)**
Fields: character goals, motivations, personal boundaries, things they avoid, things they pursue, conflict behavior, response to danger, response to affection, response to strangers, response to authority. All optional.

**3.8 World (`character-factory-world.tsx`)**
Fields: world association, setting, faction, home/location, default scenario. Optional association only.

**3.9 Advanced (`character-factory-advanced.tsx`)**
Fields: context notes, author note (character-scoped), lore/context injection options. Safety fields: `allowedRelationshipTypes`, `disallowedContent`. V2 metadata: `creatorNotes`, `characterVersion`.

**3.10 Preview (`character-factory-preview.tsx`)**
Read-only compilation of the character as it would appear to the context compiler. Uses a lightweight local render of the trait block + profile + identity. No AI call.

---

## 4. Context Compiler Integration

**File: `lib/generation/compile-context.ts`**

### 4.1 Trait rendering helper
Add function:
```ts
function renderTraits(traits: CharacterTraits | undefined): string {
  if (!traits || (!traits.primary.length && !traits.secondary.length && !traits.situational.length && !traits.custom?.length)) return "";
  
  const lines: string[] = [];
  lines.push("CHARACTER PERSONALITY TRAITS");
  
  if (traits.primary.length) {
    lines.push("\nCore traits:");
    for (const id of traits.primary) {
      const def = getTraitById(id);
      if (def) lines.push(`• ${def.name} — ${def.description}`);
      else lines.push(`• ${id}`);
    }
  }
  
  if (traits.secondary.length) {
    lines.push("\nSecondary traits:");
    for (const id of traits.secondary) {
      const def = getTraitById(id);
      if (def) lines.push(`• ${def.name} — ${def.description}`);
      else lines.push(`• ${id}`);
    }
  }
  
  if (traits.situational.length) {
    lines.push("\nSituational traits:");
    for (const id of traits.situational) {
      const def = getTraitById(id);
      if (def) lines.push(`• ${def.name} — ${def.description}`);
      else lines.push(`• ${id}`);
    }
  }
  
  if (traits.custom?.length) {
    lines.push("\nCustom traits:");
    for (const t of traits.custom) {
      lines.push(`• ${t.name} — ${t.description}`);
    }
  }
  
  lines.push("\nThese are tendencies, not absolute commands. Combine them with the character's history, relationships, current emotional state, and scene context.");
  
  return lines.join("\n");
}
```

### 4.2 Inject into prompt
In `compileContext()` (around line 174–217), add:
```ts
const traitBlock = renderTraits(input.character.traits);
```

Include `traitBlock` in both `buildLegacyPrompt` and `buildNovelAiPrompt` after the role line and before the canon block. This ensures traits are always visible to the model and have higher precedence than canon sections but lower than direct instructions.

---

## 5. Import/Export & Backup Round-Trip

### 5.1 `lib/characters/import-export.ts`
- Update `sanitizeCharacter()`: add `traits` field with max limits (e.g., max 20 primary, 20 secondary, 20 situational, 10 custom). If `traits` missing, default to empty.
- Update `serializeCharacter()` and `parseCharacterImport()` to include/expose `traits`.

### 5.2 `lib/backup/format.ts`
- Add `traits?: CharacterTraits` to `BackupUserCharacter`.
- In `buildBackupPayload()`, copy `character.traits` into backup.
- In `restoreFromBackupPayload()`, copy `traits` back to character.

### 5.3 `lib/characters/character-card-v2.ts`
- In `howlingCharacterToV2()`: serialize traits to `data.extensions["howling_traits"]`.
- In `characterCardV2ToHowling()`: deserialize traits from extension.
- Round-trip V2 PNG/JSON preserves traits.

---

## 6. UI Wiring

### 6.1 Replace edit modal in `character-area.tsx`
- Remove the existing `editingCharacter` modal content (lines 340–500).
- When `editingCharacter` is set, render `CharacterFactory` instead.
- For new characters (`isCreating`), also render `CharacterFactory` (or keep a simplified create modal that transitions into factory after name entry — decision below).

### 6.2 Create flow
- "Awaken someone new" / "New character" button opens `CharacterFactory` with a blank draft pre-filled with `name` from the create form, then transitions to the factory view.
- Alternatively, keep the simple create modal, and on confirm it opens the factory for the new character. **Recommendation: open factory directly with name pre-filled to avoid modal stacking.**

### 6.3 Save/Cancel behavior
- Save: call `props.updateCharacter(id, draft)` with the full draft (or `props.createCharacter(draft)` for new characters).
- Cancel: close factory, revert to previous state.
- Dirty state: if draft differs from original, prompt before cancel (matches existing UX patterns).

---

## 7. Tests

### 7.1 Trait library tests
**New file: `tests/trait-library.test.mjs`**
- `getTraitById("defiant")` returns correct entry.
- `searchTraits("play")` returns matching traits.
- All 111 traits are present and have stable IDs.

### 7.2 Serialization tests
**Update: `tests/character-import-export.test.mjs`** (or similar)
- Character with traits round-trips through `serializeCharacter` → `parseCharacterImport`.
- Character without traits field round-trips safely with empty defaults.
- Traits are sanitized (max limits enforced).

### 7.3 Backup tests
**Update: `tests/backup.test.mjs`** (or similar)
- Traits are included in backup payload and restored.

### 7.4 V2 tests
**Update: `tests/character-card-v2.test.mjs`** (or similar)
- V2 export includes `howling_traits` extension when traits exist.
- V2 import restores traits from extension.
- V2 tags remain in `cardV2.tags` and are NOT auto-mapped to traits.

### 7.5 Compiler tests
**Update: `tests/context-compiler.test.mjs`**
- Character with primary/secondary/situational traits renders them in the prompt block.
- Character without traits renders no trait block.
- Custom traits render correctly.
- Trait block appears after role line and before canon block.

### 7.6 Factory tests
**New file: `tests/character-factory.test.mjs`**
- Factory opens with correct initial data.
- Changing a field updates draft state.
- Save calls the correct callback with full draft.
- Cancel closes without saving.

---

## 8. Implementation Order

1. **`lib/characters/traits.ts`** — types.
2. **`lib/characters/trait-library.ts`** — data + helpers.
3. **Schema updates** — `Character`, `CanonicalCharacterV1`, `BackupCharacter`, `BackupUserCharacter`.
4. **`app/features/characters/trait-selector.tsx`** — UI component.
5. **`app/features/characters/character-factory.tsx`** — shell + all tab sections.
6. **`lib/generation/compile-context.ts`** — trait rendering + injection.
7. **`lib/characters/import-export.ts`** — serialization round-trip.
8. **`lib/backup/format.ts`** — backup round-trip.
9. **`lib/characters/character-card-v2.ts`** — V2 extension mapping.
10. **`app/features/characters/character-area.tsx`** — wire factory to replace edit modal.
11. **Tests** — trait library, serialization, backup, V2, compiler, factory.
12. **Run full verification**: `npm test`, `npm run lint`, `npm run build`, `./scripts/verify-dev.sh`.

---

## 9. Key Risks & Mitigations

- **Token bloat**: Traits inject descriptions for every assigned trait. Mitigated by: only selected traits are injected (not the full 111), descriptions are concise, and the block is compact.
- **Existing character breakage**: All new fields are optional; missing fields default to empty.
- **V2 round-trip**: Traits are stored in V2 `extensions` to avoid breaking spec compliance. Existing V2 cards without traits continue to work.
- **HW-Card compatibility**: Traits are additive to HW-Card; existing HW-Card fields are untouched.

---

## 10. Out of Scope (Not in This Plan)

- AI-assisted trait generation from personality text.
- Character templates / forking.
- Expression/image sets.
- Character-specific model/provider overrides.
- Dynamic trait relevance weighting at runtime (situational traits are injected statically; situational weighting is semantic, not dynamic).
