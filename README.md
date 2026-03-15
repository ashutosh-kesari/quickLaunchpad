# ⬡ LaunchPad

**Your personal web dashboard** — fast, minimal, installable as a PWA.

Created by **Ashutosh Kesari**

---

## File Structure

```
launchpad/
├── index.html          ← Main HTML entry point
├── style.css           ← All styles
├── script.js           ← All JavaScript logic
├── manifest.json       ← PWA manifest
├── service-worker.js   ← Offline caching
├── vercel.json         ← Vercel deployment config
└── icons/
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    ├── icon-512x512.png
    └── apple-touch-icon.png  ← iOS home screen icon
```

## Deploy to Vercel (GitHub)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Leave all settings as default → Deploy
4. Done ✓

## Deploy to Netlify Drop (instant)

1. Go to [netlify.com/drop](https://app.netlify.com/drop)
2. Drag & drop the entire `launchpad/` folder
3. Done ✓

## Install as PWA

After deploying, open the site on any device:
- **Chrome/Edge desktop**: Click the install icon in the address bar
- **Android**: Menu → "Add to Home Screen"
- **iOS Safari**: Share → "Add to Home Screen"

## Features

- 30 productivity features including drag & drop, folders, Pomodoro, weather widget, notes, tasks
- macOS-style dock magnification on hover
- 4 themes + 6 background wallpapers
- Import / Export JSON bookmarks
- Keyboard shortcuts (/gh /yt /ai etc.)
- Full offline support via Service Worker
- localStorage persistence — data survives refresh
