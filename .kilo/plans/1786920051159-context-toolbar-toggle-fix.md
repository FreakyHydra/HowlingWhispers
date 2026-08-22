# Context workspace toolbar + toggle visibility fix

## Current state
`features/context/context-workspace.tsx` has two UI regressions:
1. The global `context-workspace-toolbar` still shows `+ Lorebook`, `+ Memory`, `+ Note`, `Import Lorebook`, and `Export All`.
2. The enable toggles show a visible native checkbox above the Apple-style switch because the checkbox inputs are not wrapped in `<span className="switch">`.

## Required changes

### 1. Fix global toolbar
Replace the global `context-workspace-toolbar` so it only contains `Export All`.

Current block (lines ~123-137):
```jsx
           <div className="context-workspace-toolbar">
             <button className="outline-button" onClick={() => addLorebook({...})}>+ Lorebook</button>
             <button className="outline-button" onClick={() => createContextEntry("memory")}>+ Memory</button>
             <button className="outline-button" onClick={() => createContextEntry("author-note")}>+ Note</button>
             <button className="outline-button" onClick={() => handleImport("lorebook")}>Import Lorebook</button>
             <button className="outline-button" onClick={exportAll}>Export All</button>
           </div>
```

New block:
```jsx
           <div className="context-workspace-toolbar">
             <button className="outline-button" onClick={exportAll}>Export All</button>
           </div>
```

### 2. Add Lorebooks-tab-local toolbar
Inside the Lorebooks tab, after the hidden file input and before `{contextLibrary.lorebooks.map(...)}`, add a toolbar with `+ Lorebook` and `Import Lorebook`.

Current block (lines ~209-212):
```jsx
           {tab === "lorebooks" && (
             <div className="context-tab-panel">
               <input ref={lorebookInputRef} type="file" accept=".lorebook,.json" style={{ display: "none" }} onChange={handleFileChange("lorebook")} />
               {contextLibrary.lorebooks.map((book) => (
```

New block:
```jsx
           {tab === "lorebooks" && (
             <div className="context-tab-panel">
               <input ref={lorebookInputRef} type="file" accept=".lorebook,.json" style={{ display: "none" }} onChange={handleFileChange("lorebook")} />
               <div className="context-workspace-toolbar">
                 <button className="outline-button" onClick={() => addLorebook({
                   id: `lorebook-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                   name: "New Lorebook",
                   enabled: true,
                   raw: { lorebookVersion: 3, entries: [] },
                   parsed: { lorebookVersion: 3, entries: [] },
                   createdAt: Date.now(),
                   updatedAt: Date.now(),
                 })}>+ Lorebook</button>
                 <button className="outline-button" onClick={() => handleImport("lorebook")}>Import Lorebook</button>
               </div>
               {contextLibrary.lorebooks.map((book) => (
```

### 3. Fix toggle visibility (wrap checkboxes in `.switch`)
For all four enable toggles, wrap the `<input type="checkbox">` and `<span className="switch-track">` inside `<span className="switch">`, and add an `onKeyDown` handler so Space/Enter toggle the control.

Locations:
- **Memory entry header** (around line 148): `updateContextEntry("memory", entry.id, { enabled: ... })`
- **Author's Note entry header** (around line 179): `updateContextEntry("author-note", entry.id, { enabled: ... })`
- **Lorebook header toggle** (around line 216): `updateLorebook(book.id, { enabled: e.target.checked })`
- **Lorebook entry toggle** (around line 249): inside expanded lorebook entries, `newEntries[idx] = { ...newEntries[idx], enabled: e.target.checked }`

Example transformation for each:
```jsx
<!-- BEFORE -->
<label className="toggle-row">
  <input
    type="checkbox"
    checked={...}
    onChange={(e) => ...}
  />
  <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
</label>

<!-- AFTER -->
<label className="toggle-row">
  <span className="switch">
    <input
      type="checkbox"
      checked={...}
      onChange={(e) => ...}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.target.click();
        }
      }}
    />
    <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
  </span>
</label>
```

### 4. Do NOT touch
- Lorebook Delete buttons (`removeLorebook`) — keep them as-is.
- Lorebook entry delete buttons — keep them as-is.
- Any other file.

## Validation
1. `npm test` — all 322 tests pass.
2. `npm run build` — succeeds.
3. `systemctl restart thehowlingwhispers-dev.service`
4. `systemctl is-active thehowlingwhispers-dev.service` → `active`
5. `curl -s -o /dev/null -w "%{http_code}" https://sandbox.thehowlingwhispers.com` → `200`
6. Manual browser verification:
   - Memory tab: no `+ Memory`, `+ Note`, `Import Lorebook` in global toolbar. In-tab `+ Add Memory` still present.
   - Author's Note tab: no `+ Memory`, `+ Note`, `Import Lorebook` in global toolbar. In-tab `+ Add Note` still present.
   - Lorebooks tab: `+ Lorebook` and `Import Lorebook` visible inside the tab. Lorebook editing controls intact.
   - Active Context tab: no creation/import controls.
   - Debug tab: no creation/import controls.
   - All enable toggles show only the Apple-style switch with a sliding knob; no visible native checkbox.
