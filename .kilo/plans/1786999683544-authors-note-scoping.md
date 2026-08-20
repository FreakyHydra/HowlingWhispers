# Author's Note Scoping Fix

## Problem
All Author's Notes are stored in a single flat `contextLibrary.authorNotes` array and injected into every character's prompt unconditionally. A note created for Senako is sent to Coda, Heather, Peony, etc.

## Root Cause
- `AuthorNoteEntry` has no `scope` or `characterId` field.
- `renderAuthorNoteBlock()` in `lib/context/compile.ts` renders every enabled note.
- `compileContext()` in `lib/generation/compile-context.ts` passes the full unfiltered array.
- The UI (ContextWorkspace / ContextPanel) has no scope selector and no awareness of which character is active.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Scope values | `"character" \| "scene" \| "global"` |
| Default for new notes | `"character"`, with `characterId` set to the currently selected character |
| Backward compat for existing notes | Missing `scope` → treat as `"global"` (preserves current behavior) |
| Imported notes default | `"global"` (no source character context at import time) |
| Filtering location | In `compileContext()` before calling `renderAuthorNoteBlock()` |
| Character ID source | `input.character.id` (already in `CompileContextInput`) |
| Scene ID source | `input.sceneId` (already in `CompileContextInput`) |
| UI scope display | Show scope label in each note card (e.g. "Scope: This Character — Senako Steel") |

## Implementation Tasks

### 1. Update data model
**File:** `lib/context/types.ts`
- Add `AuthorNoteScope = "character" | "scene" | "global"`
- Add `scope: AuthorNoteScope` to `AuthorNoteEntry`
- Add `characterId?: string` (used when `scope === "character"`)
- Add `sceneId?: string` (used when `scope === "scene"`)

### 2. Update storage validator
**File:** `lib/context/storage.ts`
- Update `isAuthorNoteEntry()` to allow `scope`, `characterId`, `sceneId`

### 3. Update backup validator
**File:** `lib/backup/format.ts` (~line 625)
- Update the author note type guard in `sanitizeContextLibrary()` to allow the new fields

### 4. Update import logic
**File:** `lib/context/import-export.ts`
- `authorNoteEntryFromString()`: set `scope: "global"` for imported notes
- `importAuthorNote()`: no other changes needed

### 5. Filter notes during context compilation
**File:** `lib/generation/compile-context.ts`
- Before `renderAuthorNoteBlock()`, filter `input.contextInput?.authorNotes` by scope:
  - `!scope` or `"global"` → include
  - `"character"` → include only if `note.characterId === input.character.id`
  - `"scene"` → include only if `note.sceneId === input.sceneId`
- Update `includedAuthorNotes` manifest count to use the filtered list

### 6. Set default scope on note creation
**File:** `app/dreambound-app.tsx`
- `createContextEntry("author-note")`: set `scope: "character"` and `characterId: selected.id`

### 7. Pass active identity to context UI
**File:** `features/chat/chat-workspace.tsx`
- Pass `selected.id` as `activeCharacterId` and `activeSession?.sceneId` as `activeSceneId` to `ContextWorkspace`

**File:** `features/context/context-workspace.tsx`
- Add `activeCharacterId?: string` and `activeSceneId?: string` to props
- Add a scope selector (`<select>`) to each note card
- When scope changes to `"character"`, auto-populate `characterId` with `activeCharacterId`
- Show scope label in note card header (e.g. "Scope: This Character" or "Scope: Global")

**File:** `features/context/context-panel.tsx`
- Same prop additions and UI updates as ContextWorkspace (for consistency)

### 8. Update tests
**File:** `tests/context-compile.test.mjs`
- Add test: character-scoped note appears only when `character.id` matches
- Add test: scene-scoped note appears only when `sceneId` matches
- Add test: global note appears for all characters
- Add test: backward-compat note (no `scope`) is treated as global

## Validation
After implementation:
1. `npm test` — all tests pass
2. `npm run lint` — clean
3. `npm run build` — clean
4. Create a character-scoped note for Senako, switch to Coda, generate — Senako's note must NOT appear in Coda's prompt
5. Create a global note — it must appear for all characters
6. Create a scene-scoped note — it must appear only in that scene
