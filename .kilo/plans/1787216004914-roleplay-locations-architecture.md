# Roleplay / Locations Architecture Plan

## Goal
Replace the top-level **Characters** concept with **Roleplay**, expanding the library to support **Characters**, **Locations**, and eventually **Scenarios** as content types under a single Roleplay section.

---

## Phase 1 — View Rename: `"home"` → `"roleplay"`

Rename the internal application view string. This is a mechanical rename pass with a persisted-state migration.

### 1.1 Type definition
**File:** `app/dreambound-app.tsx:356`
```ts
// Before
export type AppView = "home" | "scenes" | "chat" | "changelog" | "settings" | "archive" | "personas" | "living-cast";
// After
export type AppView = "roleplay" | "scenes" | "chat" | "changelog" | "settings" | "archive" | "personas" | "living-cast";
```

### 1.2 Persisted state migration
**File:** `app/dreambound-app.tsx:1527`
```ts
// Before
const [view, setView] = useState<AppView>(() => readSession<AppView>("view", "home"));
// After
const [view, setView] = useState<AppView>(() => {
  const saved = readSession<AppView>("view", "home");
  if (saved === "home") return "roleplay";
  return saved;
});
```
This ensures existing users with `"home"` stored in `localStorage` (`dreambound_view`) are seamlessly migrated on next load.

### 1.3 All `setView("home")` → `setView("roleplay")`
Replace every occurrence:
- `app/dreambound-app.tsx:2094` — `handleEnter`
- `app/dreambound-app.tsx:2099` — `handleSignOut`
- `app/dreambound-app.tsx:3871` — after character import
- `app/dreambound-app.tsx:4066` — after character delete
- `app/dreambound-app.tsx:5038` — brand button
- `app/dreambound-app.tsx:5050` — nav button
- `app/features/characters/character-area.tsx:450` — scene-library back button
- `features/changelog/changelog-view.tsx:15` — changelog back button
- `app/features/settings/settings-page.tsx:244` — settings back button

### 1.4 All `view === "home"` → `view === "roleplay"`
- `app/dreambound-app.tsx:5049` — nav active class
- `app/dreambound-app.tsx:5186` — CharacterArea conditional render
- `app/features/characters/character-area.tsx:93` — gallery rendering guard

### 1.5 Navigation label
**File:** `app/dreambound-app.tsx:5052`
```tsx
// Before
Characters
// After
Roleplay
```

### 1.6 Back-button text updates
- `features/changelog/changelog-view.tsx:15` → `← Back to roleplay`
- `app/features/settings/settings-page.tsx:245` → `← Back to roleplay`
- `app/features/characters/character-area.tsx:451` → `← Back to roleplay`

### 1.7 Brand aria-label
**File:** `app/dreambound-app.tsx:5039`
```tsx
// Before
aria-label="The Howling Whispers home"
// After
aria-label="The Howling Whispers roleplay"
```

### 1.8 Prop type update
**File:** `features/chat/chat-workspace.tsx:52`
Update the `setView` callback type union from `"home"` to `"roleplay"`.

---

## Phase 2 — CharacterArea Restructuring

The `CharacterArea` component currently renders two modes: the character gallery (`view="home"`) and the scene library (`view="scenes"`). After the rename, the gallery mode becomes the Roleplay library with a content-type selector.

### 2.1 Add `roleplayType` to CharacterArea props
**File:** `app/features/characters/character-area.tsx`

Add an internal state:
```ts
const [roleplayType, setRoleplayType] = useState<"characters" | "locations" | "scenarios">("characters");
```
Default to `"characters"` so the existing behavior is preserved.

### 2.2 Content-type tabs
Render three tabs above the library when `props.view === "roleplay"`:
```tsx
<div className="roleplay-type-tabs">
  <button className={roleplayType === "characters" ? "active" : ""} onClick={() => setRoleplayType("characters")}>Characters</button>
  <button className={roleplayType === "locations" ? "active" : ""} onClick={() => setRoleplayType("locations")}>Locations</button>
  <button className={roleplayType === "scenarios" ? "active" : ""} onClick={() => setRoleplayType("scenarios")}>Scenarios</button>
</div>
```
Reuse the existing `.character-tabs` CSS class or add a new `.roleplay-type-tabs` class with the same visual language.

### 2.3 Conditional gallery rendering
Inside the `props.view === "roleplay"` block, branch on `roleplayType`:
- `"characters"` → existing character gallery (unchanged)
- `"locations"` → new location gallery (Phase 5)
- `"scenarios"` → placeholder empty state (out of scope for first pass, but add the tab now)

### 2.4 Dynamic create button
Update the top-right create button text based on `roleplayType`:
- `"characters"` → `+ Create character`
- `"locations"` → `+ Create location`
- `"scenarios"` → `+ Create scenario`

The button handler:
- Characters → `props.setIsCreating(true)` (existing)
- Locations → `props.setIsCreatingLocation(true)` (new)
- Scenarios → no-op or future callback

### 2.5 Section heading
Update the heading area to remain generic or reflect the selected type. The user specified:
> The heading can remain: **Begin a new roleplay**

Keep `"Begin a new roleplay"` as the main heading. The count badge should update per content type:
- Characters: `3 curated souls` / `2 custom souls`
- Locations: `1 curated location` / `0 custom locations`
- Scenarios: future-safe text

### 2.6 CharacterAreaProps interface
Add new props to `CharacterAreaProps`:
```ts
roleplayType?: "characters" | "locations" | "scenarios"; // optional for backward compat during transition
setIsCreatingLocation?: (value: boolean) => void;
locations?: Location[]; // Phase 4
isUserOwnedLocation?: (location: Location) => boolean; // Phase 4
openLocationLibrary?: (locationId: string) => void; // future
```

Wire these props from `dreambound-app.tsx` in the `<CharacterArea>` render block (line 5186).

---

## Phase 3 — Location Data Model

Create a dedicated location domain under `lib/locations/`, mirroring the character domain structure.

### 3.1 Directory structure
```
lib/locations/
  types.ts          — runtime Location type + LocationArea
  canonical.ts      — CanonicalLocationV1 format + parse/validate
  import-export.ts  — portable Howling location JSON format
  factory.ts        — LocationFactory component (creation/editing UI)
```

### 3.2 Runtime type (`lib/locations/types.ts`)
```ts
export type Location = {
  id: string;
  name: string;
  type?: string;
  description?: string;
  image?: string;

  ageRange?: {
    minimum?: number;
    maximum?: number;
  };

  areas?: LocationArea[];
  features?: string[];
  activities?: string[];
  atmosphere?: string[];
  accessibilityFeatures?: string[];
  staffRoles?: string[];

  tags?: string[];

  source: "curated" | "custom";

  linkedWorldId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LocationArea = {
  id: string;
  name: string;
  description?: string;
  image?: string;
};
```

### 3.3 Canonical format (`lib/locations/canonical.ts`)
Follow the `CanonicalCharacterV1` pattern:
```ts
export type CanonicalLocationV1 = {
  format: "howling-whispers-location";
  version: 1;
  id: string;
  revision: string;
  identity: { name: string; type?: string; description?: string };
  sections: CanonSection[];
  details: {
    ageRange?: { minimum?: number; maximum?: number };
    areas?: LocationArea[];
    features?: string[];
    activities?: string[];
    atmosphere?: string[];
    accessibilityFeatures?: string[];
    staffRoles?: string[];
  };
  tags?: string[];
  linkedWorldId?: string;
  rawSources?: RawCanonSource[];
};
```
Provide `parseCanonicalLocation()` and `locationToCanon()` / `canonToLocation()` helpers.

### 3.4 Portable format (`lib/locations/import-export.ts`)
```ts
export type PortableLocation = {
  format: "howling-whispers-location";
  version: 1;
  location: Location;
};
```
Functions:
- `serializeLocation(location: Location): string`
- `parseLocationImport(text: string): ParseResult`
- `locationToPortable(location: Location): PortableLocation`
- `portableToLocation(portable: PortableLocation): Location`

---

## Phase 4 — Location Storage & State

### 4.1 Storage key
**File:** `app/dreambound-app.tsx`
Add a new localStorage key: `dreambound_locations`.

### 4.2 State initialization
```ts
const [locations, setLocations] = useState<Location[]>(() => {
  const saved = readSession<Location[] | null>("locations", null);
  return saved && saved.length > 0 ? saved : curatedLocations;
});
```
`curatedLocations` is a new constant array of built-in location definitions (initially empty or with a small set of examples).

### 4.3 CRUD functions
Add to `dreambound-app.tsx`:
- `createLocation(draft: Partial<Location>): Location` — generates ID, sets source to `"custom"`, timestamps, adds to state
- `updateLocation(id: string, patch: Partial<Location>): void` — merges update, updates `updatedAt`
- `deleteLocation(id: string): void` — removes from state
- `handleLocationImport(text: string): void` — parses portable JSON, ensures unique IDs, adds to state

### 4.4 Storage write
Persist on every change:
```ts
useEffect(() => { writeSession("locations", locations); }, [locations]);
```
Cap at a reasonable limit (e.g., 50 locations), matching the character cap pattern.

### 4.5 Curated location IDs
Define `curatedLocationIds` set and `isUserOwnedLocation()` helper, mirroring the character pattern.

---

## Phase 5 — Location Cards & Gallery

### 5.1 Location card component
**File:** `app/features/locations/location-card.tsx` (new)

Visual language matches `home-character` cards:
- Portrait background via CSS custom properties (`--card-image`, etc.)
- Name, type badge, description/tagline
- Curated vs custom source indicator
- Edit/Delete buttons (custom only)
- No relationship meter, no status badge, no "Open their stories" button (locations do not have scene libraries in v1)

### 5.2 Location gallery in CharacterArea
When `roleplayType === "locations"`, render:
```tsx
<div className="location-gallery">
  {(locationTab === "curated" ? curatedLocations : customLocations).map((location) => (
    <LocationCard key={location.id} location={location} ... />
  ))}
</div>
```
Add sub-tabs: **Curated** | **Custom** (same visual pattern as character tabs).

### 5.3 "Awaken someone new" equivalent
Add a placeholder card at the end of the custom locations list:
```tsx
<article className="location-card location-card--create" onClick={() => props.setIsCreatingLocation(true)}>
  + Create location
</article>
```

### 5.4 Location creation/editing modal
**File:** `app/features/locations/location-factory.tsx` (new)

A modal form with flexible sections:
- **Identity**: Name, Type/Category, Short description, Image
- **Details**: Age range (optional), Areas/rooms list, Features, Activities, Atmosphere, Accessibility features, Staff/Occupant roles
- **Tags & World**: Tags, Linked world ID
- **Preview**: Read-only summary

The form must not enforce daycare-specific fields on all locations. All fields except Name should be optional.

---

## Phase 6 — Backup Integration

Extend the existing `.hwb` backup format without breaking v1 compatibility.

### 6.1 Add optional `locations` to `BackupData`
**File:** `lib/backup/format.ts:280-298`
```ts
export type BackupData = {
  // ... existing fields ...
  locations?: BackupUserLocation[]; // new, optional
};
```

### 6.2 Define `BackupUserLocation`
```ts
export type BackupUserLocation = {
  id: string;
  name: string;
  type?: string;
  description?: string;
  image?: string;
  ageRange?: { minimum?: number; maximum?: number };
  areas?: LocationArea[];
  features?: string[];
  activities?: string[];
  atmosphere?: string[];
  accessibilityFeatures?: string[];
  staffRoles?: string[];
  tags?: string[];
  linkedWorldId?: string;
  createdAt?: string;
  updatedAt?: string;
};
```

### 6.3 Update `buildBackupPayload`
**File:** `lib/backup/format.ts:431-508`
Add location serialization to the returned payload data. Only user-owned locations are included (curated locations are not backed up, matching the character pattern).

### 6.4 Update `validatePayload`
**File:** `lib/backup/format.ts:865-910`
Accept optional `locations` array. If missing or not an array, default to `[]`. Add `sanitizeLocations()` helper.

### 6.5 Update `applyBackupPayload`
**File:** `app/dreambound-app.tsx:4115+`
After restoring characters, restore locations:
```ts
if (data.locations && Array.isArray(data.locations)) {
  const owned = ensureUniqueLocationIds(data.locations, locations.map(l => l.id));
  setLocations(current => [...current, ...owned]);
}
```

### 6.6 Backward compatibility
Because `locations` is optional in `BackupData`, v1 backups (without locations) parse and restore cleanly. No version bump required.

### 6.7 Individual location export/import
- **Export**: Add `exportLocation(location: Location)` in `dreambound-app.tsx` — serializes as portable JSON and downloads.
- **Import**: Add "Import location" button in the location gallery backup bar. Parses via `parseLocationImport()`.

---

## Phase 7 — RP Context Behavior

This is the behavioral contract for how locations enter roleplay context.

### 7.1 No global injection
Custom locations in the user's library are **not** automatically injected into every conversation's prompt. They are library items only.

### 7.2 Explicit activation paths
A location enters RP context only when:
1. The user explicitly selects/opens a location from the library (future: set as active location for current session)
2. A scenario explicitly references the location by ID
3. Another RP feature deliberately links to it

### 7.3 Session-scoped active location
Add `activeLocationId` to the current session state (or a new top-level `activeLocationId` state in `dreambound-app.tsx`). When a location is "opened", it becomes the active location for the session. The context compiler reads `activeLocationId` and includes only that location's details in the prompt.

### 7.4 Context compiler integration
**File:** `lib/generation/compile-context.ts`
When compiling context, if `activeLocationId` is set, resolve the location from state and append its description/details as a non-commanding lore entry. Do not aggregate all library locations.

### 7.5 Future scenario linking
When Scenarios are implemented, a scenario can carry an optional `locationId`. Starting a scenario with a `locationId` automatically activates that location for the session.

---

## Validation & Testing

1. **Unit tests**: Update any tests that assert on view strings or localStorage keys.
2. **Lint**: `npm run lint`
3. **Build**: `npm run build`
4. **Restart sandbox**: `systemctl restart thehowlingwhispers-dev.service`
5. **Smoke test**:
   - Load app → verify `view` defaults to `"roleplay"`
   - Navigate to Roleplay → verify Characters tab is active by default
   - Switch to Locations tab → verify empty or curated library renders
   - Switch to Scenarios tab → verify placeholder renders
   - Create a custom location → verify it appears in Custom tab
   - Edit/delete custom location → verify state updates
   - Export backup → verify locations are included
   - Import old v1 backup → verify it restores without error (no locations field)
   - Clear localStorage `dreambound_view` → set to `"home"` → reload → verify it migrates to `"roleplay"` and app loads

---

## Out of Scope (Explicitly Deferred)
- Location-specific scene libraries (locations use the same scene flow as characters for now, or none at all)
- Scenario content type implementation (tab UI only)
- World/Location linking UI in the factory
- Location portrait storage via IndexedDB (use URL strings for v1)
- Advanced location search/filtering
