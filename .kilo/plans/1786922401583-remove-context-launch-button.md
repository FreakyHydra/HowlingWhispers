# Remove redundant context-launch-button from chat composer

## Problem
The `context-launch-button` (📖) inside the chat `.composer` adds ~38px of height to the chat bar. Because `.messages` uses a hardcoded `bottom` offset, the taller composer now overlaps and hides the `.message-actions` (chat bubble menu) beneath it.

## Decision
Remove the redundant button from the composer. The user confirmed a context manager button already exists in the left side window.

## Changes

### 1. `features/chat/chat-workspace.tsx` (lines 783–790)
Remove the entire `<button className="icon-button context-launch-button">` block.

**Before:**
```jsx
<div className="composer">
  <button
    className="icon-button context-launch-button"
    aria-label="Open context"
    title="Context manager"
    onClick={() => setShowContextWorkspace(true)}
  >
    📖
  </button>
  <>
    <label htmlFor="story-input" className="sr-only">...
```

**After:**
```jsx
<div className="composer">
  <>
    <label htmlFor="story-input" className="sr-only">...
```

### 2. `app/globals.css` (lines 8137–8148)
Remove the now-unused `.context-launch-button` and `.context-launch-button:hover` rules.

**Delete:**
```css
.context-launch-button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 18px;
  padding: 4px 8px;
  opacity: 0.7;
}
.context-launch-button:hover {
  opacity: 1;
}
```

## Validation
1. `npm test` — all pass.
2. `npm run lint` — 0 errors.
3. `npm run build` — succeeds.
4. `systemctl restart thehowlingwhispers-dev.service`
5. `systemctl is-active thehowlingwhispers-dev.service` → `active`
6. `curl -s -o /dev/null -w "%{http_code}" https://sandbox.thehowlingwhispers.com` → `200`
7. Manual browser check: chat bar returns to original height; message bubble menus (Copy/Edit/Delete/Reroll) are fully visible.
