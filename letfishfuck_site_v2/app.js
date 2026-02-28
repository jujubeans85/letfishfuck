
// LETFISHFUCK — Single JS Engine
// Portrait Map + New Drop binding
// Patch: portrait_newdrop_v1 (2026-02-28)
//
// This file is designed to be the *only* script you need to load on pages.
// Drop it into: letfishfuck_site_v2/js/app.js   (or /js/app.js on your host)
//
// It expects:
//   - Visual map cards with data-portrait-id attributes
//   - Optional New Drop form fields with IDs documented below
//
// Nothing here SHOULD be destructive if the DOM doesn't have those elements;
// the handlers will just no-op in that case.

(function () {
  "use strict";

  // -----------------------------
  // 1. UTILITIES
  // -----------------------------
  const LFF = window.LFF || {};

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }
  function $all(selector, root) {
    return Array.prototype.slice.call(
      (root || document).querySelectorAll(selector)
    );
  }

  function log() {
    if (window && window.console) {
      console.log.apply(console, ["[LFF]", ...arguments]);
    }
  }

  // Safe JSON parse
  function safeJson(str, fallback) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  }

  // -----------------------------
  // 2. PORTRAIT CARD DATA
  // -----------------------------
  // These IDs are the "master key" that map:
  //   - visual cards
  //   - suggested filenames when exporting from iPad
  //   - playlist hooks / track seeds for CrateJuice crates
  //
  // You can add more cards later; just keep ids unique + slug‑friendly.

  const PORTRAIT_CARDS = [
    {
      id: "p-smile-flare",
      title: "Heatwave Grin",
      people: ["Juice"],
      image_hint: "cropped jaw + grin in molten yellows",
      filename_hint: "p-smile-flare",
      playlist_hook: "sun‑stung 3am warehouse smiles",
      track_seed: "Floating Points – Nuits Sonores (extended blend)"
    },
    {
      id: "p-mimi-wall",
      title: "Wallflower Halo",
      people: ["Mimi"],
      image_hint: "green‑faced girl in beanie over collage bedroom wall",
      filename_hint: "p-mimi-wall",
      playlist_hook: "bedroom wall mixtape, 2012 Tumblr kid energy",
      track_seed: "AlunaGeorge – You Know You Like It (L‑Vis 1990 remix)"
    },
    {
      id: "p-yakalla-deck",
      title: "#8 Yakalla Deck",
      people: ["Moosh", "House"],
      image_hint: "teal backyard deck exploding into red sky",
      filename_hint: "p-yakalla-deck",
      playlist_hook: "suburban rave in a fibro backyard, dog on patrol",
      track_seed: "The Avalanches – Electricity"
    },
    {
      id: "p-juice-tag",
      title: "Crate Rec Script",
      people: ["Juice"],
      image_hint: "orange and hot‑pink CRATE REC JUICE tag",
      filename_hint: "p-crate-rec-tag",
      playlist_hook: "lo‑fi label office, dubplates and late invoices",
      track_seed: "Theo Parrish – Falling Up (Carl Craig remix)"
    },
    {
      id: "p-anna-side",
      title: "Green Side‑Profile",
      people: ["Dani / Caring Companion ghost"],
      image_hint: "loose green side‑profile sketch",
      filename_hint: "p-anna-side",
      playlist_hook: "quiet victory, slow morning tea",
      track_seed: "Bonobo – Kiara"
    },
    {
      id: "p-bare-bones",
      title: "Bare Bones",
      people: ["Dad", "Baby Juice"],
      image_hint: "sepia father and child pointing to future",
      filename_hint: "p-bare-bones",
      playlist_hook: "memory lane tram‑ride, soft brass + hiss",
      track_seed: "Miles Davis – Flamenco Sketches"
    },
    {
      id: "p-chlobright",
      title: "Shopfront Chlo",
      people: ["Chlo"],
      image_hint: "framed child portrait behind shop glass reflections",
      filename_hint: "p-chlobright",
      playlist_hook: "kids‑in‑the‑window, Saturday market crate dig",
      track_seed: "Fat Freddy's Drop – Wandering Eye"
    },
    {
      id: "p-yakalla-roof",
      title: "Yakalla Roof Shout",
      people: ["Moosh", "Yakalla"],
      image_hint: "yakalla deck piece with flames and corridor perspective",
      filename_hint: "p-yakalla-roof",
      playlist_hook: "shout‑outs in text, late‑night fence chat",
      track_seed: "Burial – Archangel"
    },
    {
      id: "p-juice-script",
      title: "Juice Script",
      people: ["Juice"],
      image_hint: "loose yellow 'Juice' graffiti on white grid",
      filename_hint: "p-juice-script",
      playlist_hook: "marker‑fumes + MPC pads on the floor",
      track_seed: "DJ Shadow – Midnight in a Perfect World"
    },
    {
      id: "p-crate-rec-logo",
      title: "Crate Rec Juice Logo",
      people: ["CrateJuice"],
      image_hint: "stacked orange logo with red REC slab",
      filename_hint: "p-crate-rec-logo",
      playlist_hook: "record button pressed, room goes quiet",
      track_seed: "Moodymann – It's 2 Late 4 U And Me"
    }
  ];

  // Build fast lookup by id.
  const PORTRAIT_INDEX = PORTRAIT_CARDS.reduce((acc, card) => {
    acc[card.id] = card;
    return acc;
  }, {});

  LFF.PORTRAIT_CARDS = PORTRAIT_CARDS;
  LFF.PORTRAIT_INDEX = PORTRAIT_INDEX;

  // -----------------------------
  // 3. FILENAME HELPERS
  // -----------------------------
  // For when you're exporting from iPad and want a quick mapping.
  // You can dump this out from the console if you like.

  LFF.getSuggestedFilename = function (portraitId, ext) {
    const card = PORTRAIT_INDEX[portraitId];
    const base = (card && card.filename_hint) || portraitId || "portrait";
    const clean = (base + "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const suffix = ext ? ("." + ext.replace(/^\./, "")) : "";
    return clean + suffix;
  };

  LFF.debugDumpFilenameTable = function () {
    const rows = PORTRAIT_CARDS.map(c => ({
      id: c.id,
      filename: LFF.getSuggestedFilename(c.id, "png"),
      title: c.title
    }));
    log("Suggested filenames:", rows);
    return rows;
  };

  // -----------------------------
  // 4. NEW DROP BINDING
  // -----------------------------
  // The idea: click a portrait card → pre-fill the New Drop form.
  //
  // Expected New Drop fields (optional, safe if missing):
  //   #newDropTitle
  //   #newDropArtworkId
  //   #newDropPlaylistHook
  //   #newDropTrackSeed
  //   #newDropNotes   (free‑form)
  //
  // You can choose different IDs; just wire them in `NEW_DROP_FIELDS`.

  const NEW_DROP_FIELDS = {
    title: "#newDropTitle",
    artworkId: "#newDropArtworkId",
    playlistHook: "#newDropPlaylistHook",
    trackSeed: "#newDropTrackSeed",
    notes: "#newDropNotes"
  };

  function getNewDropNodes() {
    const nodes = {};
    Object.keys(NEW_DROP_FIELDS).forEach(key => {
      const sel = NEW_DROP_FIELDS[key];
      nodes[key] = sel ? $(sel) : null;
    });
    return nodes;
  }

  function hydrateNewDropFromPortraitId(portraitId) {
    const card = PORTRAIT_INDEX[portraitId];
    if (!card) {
      log("Unknown portrait id for New Drop:", portraitId);
      return;
    }
    const nodes = getNewDropNodes();

    if (nodes.title) {
      nodes.title.value = card.title || "";
    }
    if (nodes.artworkId) {
      nodes.artworkId.value = card.id;
    }
    if (nodes.playlistHook) {
      nodes.playlistHook.value = card.playlist_hook || "";
    }
    if (nodes.trackSeed) {
      nodes.trackSeed.value = card.track_seed || "";
    }
    if (nodes.notes && !nodes.notes.value) {
      nodes.notes.value = (card.people && card.people.length)
        ? "Faces: " + card.people.join(", ")
        : "";
    }

    // Optional UX sugar: scroll to the New Drop panel if present.
    const panel = nodes.title && nodes.title.closest("[data-new-drop-panel]");
    if (panel && typeof panel.scrollIntoView === "function") {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    log("Hydrated New Drop from portrait:", portraitId, card);
  }

  LFF.hydrateNewDropFromPortraitId = hydrateNewDropFromPortraitId;

  // -----------------------------
  // 5. VISUAL MAP WIRING
  // -----------------------------
  // Attach click handlers to any element with data-portrait-id.
  // Example HTML:
  //
  //   <button
  //      class="portrait-card"
  //      data-portrait-id="p-smile-flare">
  //      ...
  //   </button>
  //
  // Optional: If the element also has [data-new-drop-trigger] we send
  // it straight into the New Drop form.

  function wirePortraitCards() {
    const cards = $all("[data-portrait-id]");
    if (!cards.length) {
      log("No portrait cards found on this page (that's fine).");
      return;
    }

    cards.forEach(el => {
      const id = el.getAttribute("data-portrait-id");
      if (!id || !PORTRAIT_INDEX[id]) return;

      el.addEventListener("click", function (evt) {
        const triggerDrop = el.hasAttribute("data-new-drop-trigger");
        if (triggerDrop) {
          hydrateNewDropFromPortraitId(id);
        }

        // Store last-picked portrait for any other parts of the app.
        try {
          window.localStorage.setItem("lff:lastPortraitId", id);
        } catch (e) {
          // ignore
        }

        log("Clicked portrait card:", id, { triggerDrop });
      });
    });

    log("Wired portrait cards:", cards.length);
  }

  // -----------------------------
  // 6. BOOT
  // -----------------------------

  function boot() {
    wirePortraitCards();
    // If nothing else is needed, this is deliberately light.
    log("LFF portrait_newdrop_v1 booted.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.LFF = LFF;
})();
