LETFISHFUCK — MASTER PATCH (single-entrypoint cleanup)

What this does
- Makes /js/app.js the *only* script pages should load.
- Fixes the "window.LFF.getJSON is not a function" crash by defining window.LFF + getJSON.
- Removes mixed references to /assets/js/app.js and render-*.js from HTML pages.
- Adds Notes rendering from /data/notes.json (media is an ARRAY).
- Hub "New Drop" now pulls Projects + Experiments + Notes (latest first by date).

How to apply
1) Unzip this patch.
2) Copy the `letfishfuck_site_v2/` folder ON TOP of your repo's `letfishfuck_site_v2/` (overwrite files).
3) Commit + push.
4) Netlify should redeploy and Hub errors should be gone.

Optional cleanup (manual)
- If you want zero ghosts: you can delete these files later (once you're sure nothing references them):
  - letfishfuck_site_v2/assets/js/render-projects.js
  - letfishfuck_site_v2/assets/js/render-experiments.js
  - letfishfuck_site_v2/assets/js/app.js (loader / legacy)
But it's safe to leave them — the patched HTML no longer calls them.

Notes schema
/data/notes.json accepts either:
- an ARRAY of note objects (recommended), or
- { "notes": [ ... ] }

Each note supports:
- title, date, text/description, tags[]
- media[]  (strings or objects {type, src, title})

Done.
