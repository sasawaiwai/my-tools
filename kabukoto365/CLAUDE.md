# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**かぶこと365** is a static PWA (Progressive Web App) that delivers daily stock market proverbs and investment wisdom. It runs entirely in the browser with no build system, no backend, and no package manager.

- Live site: https://kabukoto.sasadokoro.online/
- Language: Japanese
- Deployment: Copy files directly to web server — no build step required

## Development

Since this is a static site with no build tools:

- **Run locally**: Open `index.html` in a browser, or use any static file server (e.g., `python3 -m http.server 8080`)
- **No build, lint, or test commands exist**
- The `.zip` files (`css.zip`, `js.zip`, `images.zip`) are deployment archives, not used at runtime

## Architecture

### Core JavaScript Modules (`js/`)

| File | Purpose |
|------|---------|
| `app.js` | Main app logic: quote display, date navigation, share menu, modal |
| `quotes-data.js` | Database of 366 daily proverbs (quote, source, explanation, Rakuten affiliate HTML) |
| `daily-tips.js` | Database of 366 daily trivia entries (anniversaries, birthdays, historical events) |
| `date-system.js` | Date formatting and day-of-year calculation utilities |
| `pwa.js` | Service Worker registration and PWA install prompt |

### Data Format

Quotes are indexed 0–365 (covering leap years) in `quotes-data.js`:
```javascript
{
  quote: "格言テキスト",
  source: "出典",
  explanation: "解説文",
  rakutenHtml: "<HTML string for affiliate product card>"
}
```

Tips in `daily-tips.js` are arrays of strings per day, prefixed with category (`記念日：`, `誕生日:`, `歴史:`).

### Pages

- `index.html` — Main daily proverb display (homepage)
- `archive.html` — Browse/search all 366 quotes
- `about.html`, `privacy.html`, `contact.html` — Static info pages

### PWA / Service Worker

`sw.js` uses a **cache-first strategy** for local assets (cache key: `v4`). When modifying cached assets, increment the cache version in `sw.js` so users receive updated files.

External services (TradingView widgets, Google Analytics) are fetched from the network.

### Styling

Single stylesheet at `css/style.css`. Key CSS variables define the color palette:
- Background: `#121212`, Primary: `#1e3a8a`, Accent/gold: `#d4af37`
- Stock up: `#34d399` (green), Stock down: `#f43f5e` (rose)

### External Integrations

- **Google Analytics 4** (`G-EGGKG4WQEV`)
- **TradingView** ticker tape widget (S&P 500, Nikkei 225, USD/JPY)
- **Rakuten affiliate** product HTML embedded per quote in `quotes-data.js`

## Key Conventions

- All UI text and code comments are in Japanese
- Quote/tip arrays must maintain 366-element length (day 0 = January 1, day 365 = December 31 / leap day)
- `app.js` selects the quote by `dayOfYear` computed via `date-system.js`; the archive page iterates all 366 entries
