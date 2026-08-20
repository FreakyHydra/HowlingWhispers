# Phase 2 — CharacterArea Restructuring: `CharacterArea` → `RoleplayArea`

## Goal
Rename and restructure `CharacterArea` into `RoleplayArea` so it can serve as the parent area for Characters, Locations, and Scenarios under the new `"roleplay"` view.

## Context
- Phase 1 renamed the view from `"home"` to `"roleplay"` and migrated persisted state.
- `CharacterArea` currently owns both the character gallery (`view === "roleplay"`) and the scene library (`view === "scenes"`).
- The component must become content-type agnostic at the top level while preserving the existing character gallery behavior exactly.

## Tasks

### 1. Create `app/features/roleplay/` directory
```bash
mkdir -p app/features/roleplay
```

### 2. Create `app/features/roleplay/roleplay-area.tsx`
Base this on `app/features/characters/character-area.tsx` with these changes:

- Rename `CharacterArea` → `RoleplayArea`
- Rename `CharacterAreaProps` → `RoleplayAreaProps`
- Add new optional props:
  ```ts
  setIsCreatingLocation?: (value: boolean) => void;
  ```
- Add internal state:
  ```ts
  const [roleplayType, setRoleplayType] = useState<"characters" | "locations" | "scenarios">("characters");
  ```
- Add top-level roleplay type tabs (reuse `.character-tabs` class):
  ```tsx
  <div className="character-tabs">
    <button className={roleplayType === "characters" ? "active" : ""} onClick={() => setRoleplayType("characters")}>Characters</button>
    <button className={roleplayType === "locations" ? "active" : ""} onClick={() => setRoleplayType("locations")}>Locations</button>
    <button className={roleplayType === "scenarios" ? "active" : ""} onClick={() => setRoleplayType("scenarios")}>Scenarios</button>
  </div>
  ```
- Keep the existing character gallery intact inside `roleplayType === "characters"`:
  - Curated/Custom sub-tabs
  - Backup bar
  - Character cards
  - All modals (create, edit, download, delete)
- Add placeholder states for other types:
  ```tsx
  {roleplayType === "locations" && (
    <div className="empty-roleplay-type">
      <p>Locations are coming soon.</p>
    </div>
  )}
  {roleplayType === "scenarios" && (
    <div className="empty-roleplay-type">
      <p>Scenarios are coming soon.</p>
    </div>
  )}
  ```
- Add dynamic create button in heading area:
  ```tsx
  <div className="home-section-actions">
    <span className="home-section-count">{countLabel}</span>
    <button className="primary-button" onClick={handleCreate} disabled={roleplayType === "scenarios"}>
      {createButtonLabel}
    </button>
  </div>
  ```
  Where `countLabel` updates per type and `handleCreate` routes to the appropriate callback.
- Update eyebrow from `"Your characters"` to `"Your roleplay"` (keep heading `"Begin a new roleplay"`).
- Preserve the `view === "scenes"` scene library block unchanged.
- Preserve all existing modal blocks unchanged.

### 3. Update `app/dreambound-app.tsx`
- Change import:
  ```ts
  // Before
  import { CharacterArea } from "./features/characters/character-area";
  // After
  import { RoleplayArea } from "./features/roleplay/roleplay-area";
  ```
- Update render block at line ~5190:
  ```tsx
  // Before
  <CharacterArea
  // After
  <RoleplayArea
  ```
- Add new prop:
  ```tsx
  setIsCreatingLocation={setIsCreatingLocation}
  ```
  (Wire from the state setter; it can be a no-op stub until Phase 4 implements locations.)

### 4. Delete `app/features/characters/character-area.tsx`
Remove the old file after confirming the new one compiles.

### 5. Verify no remaining `CharacterArea` imports
```bash
grep -r "CharacterArea" app/ features/ --include="*.ts" --include="*.tsx"
```
Expected: zero matches.

## Verification
1. `npm run lint`
2. `npm run build`
3. `npm test`
4. `systemctl restart thehowlingwhispers-dev.service`
5. Smoke test:
   - Load app → Roleplay view opens with Characters tab active
   - Switch to Locations tab → placeholder renders
   - Switch to Scenarios tab → placeholder renders, create button is disabled
   - Switch back to Characters → existing curated/custom gallery renders unchanged
   - Create/Edit/Delete character flows still work
   - Scene library still opens correctly
   - Back buttons return to Roleplay

## Files Changed
- `app/features/roleplay/roleplay-area.tsx` (new)
- `app/features/characters/character-area.tsx` (delete)
- `app/dreambound-app.tsx` (import + render prop update)

## Out of Scope
- Actual location gallery, location factory, location CRUD
- Scenario implementation
- CSS class additions beyond reusing `.character-tabs`
