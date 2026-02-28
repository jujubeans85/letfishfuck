
LETFiSHFUCK — Portrait Map + New Drop Patch (portrait_newdrop_v1)
=================================================================

This zip contains a single file:

  /js/app.js

HOW TO INSTALL
--------------

1. In your GitHub repo for letfishfuck_site_v2, open the folder:

     letfishfuck_site_v2/js/

2. Upload/replace the existing `app.js` with the one from this zip.

   (If your repo structure is different, just make sure this file ends up
    at `/js/app.js` relative to pages that use it.)

3. Ensure your HTML pages load this script, for example:

     <script src="/js/app.js"></script>

WHAT THIS PATCH DOES
--------------------

• Defines `LFF.PORTRAIT_CARDS` — an array of portrait card metadata
  (id, title, people, filename_hint, playlist_hook, track_seed).

• Wires any elements with `data-portrait-id` so a click will:

    - Remember the last portrait id in localStorage, and
    - If the element ALSO has `data-new-drop-trigger`,
      pre-fill the New Drop form.

• New Drop form fields expected (all optional, safe if missing):

    #newDropTitle
    #newDropArtworkId
    #newDropPlaylistHook
    #newDropTrackSeed
    #newDropNotes

  You can change these by editing NEW_DROP_FIELDS in app.js.

DEV NOTES
---------

• From the browser console you can run:

    LFF.PORTRAIT_CARDS
    LFF.getSuggestedFilename("p-smile-flare", "png")
    LFF.debugDumpFilenameTable()

  to help when exporting artwork out of Procreate/Notes/etc.

• You can extend PORTRAIT_CARDS with more entries as your map grows.
  Just keep `id` unique and slug-friendly.

— Patch: portrait_newdrop_v1 (2026-02-28)
