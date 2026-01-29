(() => {
  const $ = (sel, el = document) => el.querySelector(sel);

  // ---------------------------
  // Theme toggle
  // ---------------------------
  const modeBtn = $("#modeBtn");
  const root = document.documentElement;

  function setTheme(next) {
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch {}
  }
  function getTheme() {
    try { return localStorage.getItem("theme"); } catch { return null; }
  }
  const saved = getTheme();
  if (saved) setTheme(saved);

  if (modeBtn) {
    modeBtn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "dark";
      setTheme(current === "dark" ? "light" : "dark");
    });
  }

  // ---------------------------
  // Helpers
  // ---------------------------
  const previewsEl = $("#previews");

  function ext(name) {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
  }

  function typeFromExt(e) {
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(e)) return "image";
    if (["mp3", "wav", "m4a", "aac", "ogg"].includes(e)) return "audio";
    if (["mp4", "mov", "webm"].includes(e)) return "video";
    if (["pdf"].includes(e)) return "pdf";
    return "file";
  }

  function niceType(t) {
    if (t === "image") return "Image";
    if (t === "audio") return "Audio";
    if (t === "video") return "Video";
    if (t === "pdf") return "PDF";
    return "File";
  }

  function cardHTML({ name, url, kind }) {
    const safeName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const typeLabel = niceType(kind);

    let body = "";
    if (kind === "image") {
      body = `<div class="thumb"><img src="${url}" alt="${safeName}"></div>`;
    } else if (kind === "audio") {
      body = `<div class="thumb" style="padding:10px"><audio controls src="${url}"></audio></div>`;
    } else if (kind === "video") {
      body = `<div class="thumb" style="padding:10px"><video controls style="width:100%" src="${url}"></video></div>`;
    } else if (kind === "pdf") {
      body = `<div class="thumb" style="padding:12px">
        <a class="btn" href="${url}" target="_blank" rel="noreferrer">Open PDF</a>
      </div>`;
    } else {
      body = `<div class="thumb" style="padding:12px">
        <a class="btn" href="${url}" target="_blank" rel="noreferrer">Open file</a>
      </div>`;
    }

    return `
      <div class="preview">
        <div class="meta">
          <div>
            <div class="name">${safeName}</div>
            <div class="type">${typeLabel}</div>
          </div>
          <a class="btn small" href="${url}" target="_blank" rel="noreferrer">Open</a>
        </div>
        ${body}
      </div>
    `;
  }

  function renderCards(items) {
    if (!previewsEl) return;
    previewsEl.innerHTML = items.map(cardHTML).join("");
  }

  // ---------------------------
  // Auto-detect assets (no directory listing in static hosting)
  // We try common filenames, and only render what exists.
  // ---------------------------
  const PAGE_MODE = window.PAGE_MODE || "all"; // "music" | "media" | "all"

  const CANDIDATES = (() => {
    const out = [];

    // image/video/audio slots
    for (let i = 1; i <= 24; i++) {
      const n = String(i).padStart(2, "0");
      out.push(`work-${n}.jpg`, `work-${n}.jpeg`, `work-${n}.png`, `work-${n}.webp`);
      out.push(`work-${n}.mp3`, `work-${n}.wav`, `work-${n}.m4a`);
      out.push(`work-${n}.mp4`, `work-${n}.mov`, `work-${n}.webm`);
      out.push(`work-${n}.pdf`);
    }

    // portfolio locations (root + assets)
    out.push(`PORTFOLIO.pdf`);
    out.push(`assets/PORTFOLIO.pdf`);

    // hero
    out.push(`assets/hero.jpg`, `assets/hero.png`, `assets/hero.webp`);

    return out;
  })();

  function allowed(kind) {
    if (PAGE_MODE === "music") return kind === "audio";
    if (PAGE_MODE === "media") return kind === "image" || kind === "video";
    return true;
  }

  async function exists(url) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function detectAndRender() {
    if (!previewsEl) return;

    const found = [];

    // only check likely ones for the page mode
    const filteredCandidates = CANDIDATES.filter((p) => {
      const e = ext(p);
      const k = typeFromExt(e);
      return allowed(k);
    });

    // limit concurrent checks so mobile Safari doesn’t explode
    const CONCURRENCY = 6;
    let idx = 0;

    async function worker() {
      while (idx < filteredCandidates.length) {
        const i = idx++;
        const path = filteredCandidates[i];
        const url = path.startsWith("assets/") ? `/${path}` : `/${path}`;

        const ok = await exists(url);
        if (ok) {
          const name = path.split("/").pop();
          const k = typeFromExt(ext(path));
          found.push({ name, url, kind: k });
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    // Sort: work-xx first, then PORTFOLIO, then hero
    found.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (found.length === 0) {
      previewsEl.innerHTML = `
        <div class="note">
          <div class="big">Nothing detected yet.</div>
          <div class="muted">Drop files into <code>/assets</code> using <code>work-01.jpg</code>, <code>work-01.mp3</code>, <code>work-01.mp4</code>… then refresh.</div>
        </div>
      `;
      return;
    }

    renderCards(found);
  }

  // ---------------------------
  // Drag + drop preview (local only)
  // ---------------------------
  function bindDropzone() {
    const dz = $(".dropzone") || $(".panel"); // fallback for /music /media pages
    if (!dz || !previewsEl) return;

    function handleFiles(fileList) {
      const items = [];
      for (const f of fileList) {
        const e = ext(f.name);
        const k = typeFromExt(e);
        if (!allowed(k)) continue;

        const url = URL.createObjectURL(f);
        items.push({ name: f.name, url, kind: k });
      }
      if (items.length) renderCards(items);
    }

    // global drop
    window.addEventListener("dragover", (e) => e.preventDefault());
    window.addEventListener("drop", (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
    });
  }

  // ---------------------------
  // Go
  // ---------------------------
  detectAndRender();
  bindDropzone();
})();
