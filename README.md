# Launchpad

Personal cockpit. Every site I've built plus calendar, todo, pomodoro, clock, and a quote — one page.

## Add a new app

Edit `data.js`. Add an entry under `apps.personal`, `apps.offplate`, or `apps.tools`:

```js
{ name: "Name", glyph: "🔥", tag: "Tag", color: ["#hex1","#hex2"], url: "https://...", desc: "Short description" }
```

Commit. Netlify auto-deploys.

## Stack

Static HTML + React 18 + Babel standalone (UMD via CDN). No build step.
Files: `index.html`, `styles.css`, `data.js`, `widgets.jsx`, `app.jsx`, `tweaks-panel.jsx`.
