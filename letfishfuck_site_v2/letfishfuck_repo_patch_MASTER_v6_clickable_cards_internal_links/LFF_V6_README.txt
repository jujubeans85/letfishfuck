LFF v6 patch (hub cards clickable + sane internal routing)

What this fixes:
- Hub cards are now clickable anywhere (not just the tiny title).
- Notes cards now go to /notes/ by default (instead of doing nothing).
- Internal links open in the SAME tab; external links open in a NEW tab.

Important repo cleanup (manual):
- Delete the accidental duplicate folder: "letfishfuck_site_v2 5/" (and any other stray copies like letfishfuck_site_v2_2, _3, _4) once you confirm Netlify is publishing from letfishfuck_site_v2/.
- Netlify settings: Base directory = letfishfuck_site_v2 (or publish dir = letfishfuck_site_v2). Do NOT publish repo root.

Files in this patch:
- letfishfuck_site_v2/js/app.js
