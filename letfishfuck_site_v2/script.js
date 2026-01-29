(() => {
  const $ = (sel, el = document) => el.querySelector(sel);

  // ---------------------------
  // Theme toggle
  // ---------------------------
  const root = document.documentElement;
  const modeBtn = $("#modeBtn");

  function setTheme(next) {
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch {}
  }
  function getTheme() {
    try { return localStorage.getItem("theme"); } catch { return null; }
  }

  const saved = getTheme();
  if (saved === "dark" || saved === "light") setTheme(saved);

  if (modeBtn) {
    modeBtn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "dark";
      setTheme(current === "dark" ? "light" : "dark");
    });
  }

  // ---------------------------
  // Page mode auto-detect
  // ---------------------------
  // root page: /
  // music page: /music/
  // media page: /media/
  const path = (location.pathname || "/").toLowerCase();
  const PAGE_MODE =
    path.includes("/music") ? "music" :
    path.includes("/media") ? "media" :
    "all";

  // ---------------------------
  // Helpers
  // ---------------------------
  const previewsEl = $("#previews");
  const dropzone = $("#dropzone");
  const filePicker = $("#filePicker");

  function ext(name) {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
  }

  function typeFromExt(e) {
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(e)) return "image";
    if (["mp3", "wav", "m4a", "aac", "ogg", "flac", "aif", "aiff"].includes(e)) return "audio";
    if (["mp4", "mov", "webm"].includes(e)) return "video";
    if (e === "pdf") return "pdf";
    return "file";
  }

  function allowed(kind) {
    if (PAGE_MODE === "music") return kind === "audio" || kind === "pdf";
    if (PAGE_MODE === "media") return kind === "video" || kind === "image";
    return true;
  }

  function niceType(t) {
    if (t === "image") return "Image";
    if (t === "audio") return "Audio";
    if (t === "video") return "Video";
    if (t === "pdf") return "PDF";
    return "File";
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cardHTML({ name, url, kind }) {
    const safeName = escapeHtml(name);
    const typeLabel = niceType(kind);

    let body = "";
    if (kind === "image") {
      body = `<div class="thumb"><img src="${url}" alt="${safeName}" loading="lazy"></div>`;
    } else if (kind === "audio") {
      body = `<div class="thumb" style="padding:10px"><audio controls preload="metadata" src="${url}"></audio></div>`;
    } else if (kind === "video") {
      body = `<div class="thumb" style="padding:10px">
        <video controls playsinline muted preload="metadata" style="width:100%; border-radius:14px;" src="${url}"></video>
      </div>`;
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
  // Asset detection
  // (static hosting can't list directories — we probe likely filenames)
  // ---------------------------
  // We support both naming styles:
  //  - work-01.mp3 / work-01.jpg / work-01.mp4
  //  - media-01.mp4 for media page
  const CANDIDATES = (() => {
    const out = [];

    // common numbered slots
    for (let i = 1; i <= 24; i++) {
      const n = String(i).padStart(2, "0");

      // work-xx.*
      out.push(`assets/work-${n}.jpg`, `assets/work-${n}.jpeg`, `assets/work-${n}.png`, `assets/work-${n}.webp`);
      out.push(`assets/work-${n}.mp3`, `assets/work-${n}.wav`, `assets/work-${n}.m4a`);
      out.push(`assets/work-${n}.mp4`, `assets/work-${n}.mov`, `assets/work-${n}.webm`);
      out.push(`assets/work-${n}.pdf`);

      // media-xx.mp4 (media page)
      out.push(`assets/media-${n}.mp4`, `assets/media-${n}.mov`, `assets/media-${n}.webm`);
    }

    // portfolio locations
    out.push(`PORTFOLIO.pdf`, `assets/PORTFOLIO.pdf`);

    return out;
  })();

  async function exists(url) {
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-store" });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function detectAndRender() {
    if (!previewsEl) return;

    const found = [];
    const filtered = CANDIDATES.filter((p) => allowed(typeFromExt(ext(p))));

    // keep it sane on mobile Safari
    const CONCURRENCY = 6;
    let idx = 0;

    async function worker() {
      while (idx < filtered.length) {
        const i = idx++;
        const path = filtered[i];
        const url = path.startsWith("/") ? path : `/${path}`;

        const ok = await exists(url);
        if (ok) {
          const name = path.split("/").pop();
          const k = typeFromExt(ext(path));
          found.push({ name, url, kind: k });
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    found.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (found.length === 0) {
      previewsEl.innerHTML = `
        <div class="note">
          <div class="big">Nothing detected yet.</div>
          <div class="muted">
            Drop files into <code>/assets</code> using
            <code>work-01.mp3</code>, <code>work-01.mp4</code>, <code>work-01.jpg</code>… then refresh.
          </div>
        </div>
      `;
      return;
    }

    renderCards(found);
  }

  // ---------------------------
  // Drag + drop preview (LOCAL only)
  // ---------------------------
  function bindDropzone() {
    if (!dropzone || !previewsEl) return;

    function handleFiles(fileList) {
      const items = [];
      for (const f of fileList) {
        const k = typeFromExt(ext(f.name));
        if (!allowed(k)) continue;
        const url = URL.createObjectURL(f);
        items.push({ name: f.name, url, kind: k });
      }
      if (items.length) renderCards(items);
    }

    function setDragOver(on) {
      dropzone.classList.toggle("dragover", !!on);
    }

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      setDragOver(true);
    });

    dropzone.addEventListener("dragleave", () => setDragOver(false));

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
    });

    // click-to-pick if present
    if (filePicker) {
      dropzone.addEventListener("click", () => filePicker.click());
      filePicker.addEventListener("change", (e) => {
        if (e.target.files?.length) handleFiles(e.target.files);
        filePicker.value = "";
      });
    }

    // keyboard accessibility
    dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        filePicker?.click();
      }
    });
  }

  // ---------------------------
  // Go
  // ---------------------------
  detectAndRender();
  bindDropzone();
})();
