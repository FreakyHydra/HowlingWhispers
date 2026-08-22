# Persistent Live Radio Player

## Goal
Add a fixed, persistent radio bar to Howling Whispers that survives navigation, plays a live Icecast stream over HTTPS, and matches the existing app styling.

## Key Constraints
- Mount in `app/layout.tsx` so it is present from the first paint (welcome screen onward) and never unmounted during client-side navigation.
- Do **not** autoplay. User presses Play manually.
- Stop fully disconnects the stream (`pause()` + `src = ""` + `load()`).
- Volume is persisted in `localStorage` (`dreambound_radio_volume`).
- No changes to `dreambound-app.tsx` (hard architecture rule).

## Prerequisite / Risk
`radio.thehowlingwhispers.com` must resolve to this server and the Let's Encrypt certificate must cover it. Current nginx configs use the same cert for `rp.` and `sandbox.` subdomains, so it is likely a wildcard/SAN cert, but this must be verified before the HTTPS proxy is enabled.

## Implementation

### 1. Create `app/components/radio-player.tsx`
New client component (`"use client"`) placed in the existing `app/components/` directory alongside `info-tip.tsx`.

**Behavior:**
- Uses `useRef` for the `Audio` instance so it survives across renders and navigations.
- Creates the `Audio` lazily on Play, never on mount.
- State: `isPlaying` (boolean), `volume` (float 0–1).
- `localStorage` key: `dreambound_radio_volume`. Read once on mount. Write on slider change.
- **Play:** if no Audio, create `new Audio("https://radio.thehowlingwhispers.com/radio.mp3")`, set volume, call `.play()`, set `isPlaying = true`.
- **Stop:** call `.pause()`, `.src = ""`, `.load()`, null the ref, set `isPlaying = false`.

### 2. Wire into `app/layout.tsx`
Import `RadioPlayer` and render it inside `<body>`, alongside `{children}`.

```tsx
import RadioPlayer from "./components/radio-player";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="...">
        {children}
        <RadioPlayer />
      </body>
    </html>
  );
}
```

Because the root layout is shared by all routes (`/`, `/archive/[id]`, `/comparison`, `/concept`), the player appears everywhere. The user explicitly requested the **global/root layout** placement.

### 3. Add CSS classes to `app/globals.css`
Add new class definitions for `.radio-player`, `.radio-bar`, `.radio-label`, `.radio-btn`, `.radio-volume` using the existing palette variables (`--panel`, `--raised`, `--copper`, `--cream`, `--muted`, `--serif`, `--sans`).

Style:
- `position: fixed; bottom: 0; left: 0; right: 0; z-index: 900;`
- Background: `var(--panel)` with a top border using `var(--line)`.
- Layout: flex row, label + Play/Stop buttons + volume slider.
- Use existing button styling patterns (e.g., `.outline-button` or `.primary-button` conventions).
- Add bottom padding to `.app-shell` (e.g., `padding-bottom: 3.5rem`) so the fixed bar does not cover app content.

### 4. Nginx HTTPS proxy for `radio.thehowlingwhispers.com`
Create a new nginx site config that proxies the Icecast stream over HTTPS.

**`/etc/nginx/sites-available/radio.thehowlingwhispers.com`** (mirror for both live and sandbox environments, pointing to the same upstream stream):

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name radio.thehowlingwhispers.com;

    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS stream proxy
server {
    listen 443 ssl http2;
    server_name radio.thehowlingwhispers.com;

    ssl_certificate     /etc/letsencrypt/live/thehowlingwhispers.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/thehowlingwhispers.com/privkey.pem;

    location / {
        proxy_pass http://62.50.185.109:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable with `ln -s /etc/nginx/sites-available/radio.thehowlingwhispers.com /etc/nginx/sites-enabled/` and reload nginx.

**Important:** If `radio.thehowlingwhispers.com` is not covered by the existing certificate, obtain a new Let's Encrypt cert for it before enabling the config.

## Files Changed
| File | Action | Purpose |
|------|--------|---------|
| `app/components/radio-player.tsx` | **Create** | Client radio player component |
| `app/layout.tsx` | **Modify** | Import and render `<RadioPlayer />` globally |
| `app/globals.css` | **Modify** | Add `.radio-player` and related classes |
| `/etc/nginx/sites-available/radio.thehowlingwhispers.com` | **Create** | HTTPS reverse proxy for the stream |
| `/etc/nginx/sites-enabled/radio.thehowlingwhispers.com` | **Create** | Symlink to enable site |

## Why This Works
- Next.js App Router preserves client components inside the root layout across client-side navigations. The `RadioPlayer` instance (and its refs/state) is never unmounted, so the Audio object survives view changes without restarting.
- The stream is served over HTTPS, eliminating mixed-content blocking.
- `localStorage` keeps the volume between visits.
- Stop explicitly tears down the Audio connection rather than muting.

## Validation
1. `npm run lint`
2. `npm run build`
3. `./scripts/verify-dev.sh`
4. Manually verify:
   - Player appears on `/` (welcome screen), `/archive/[id]`, and internal views.
   - Play starts the stream without page reload.
   - Navigate between characters/chat/settings — stream continues.
   - Stop halts the stream (check network tab — request should disappear).
   - Refresh page — volume restores, stream is not autoplayed.
   - Inspect `localStorage` for `dreambound_radio_volume`.
   - No mixed-content warnings in browser console.
