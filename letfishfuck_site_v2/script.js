(() => {
  const $ = (sel, el = document) => el.querySelector(sel);

  // ---------------------------
  // Theme toggle (persisted)
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
  const path = (location.pathname || "/").toLowerCase();
  const PAGE_MODE =
    path.includes("/music") ? "music" :
    path.includes("/media") ? "media" :
    "all";

  // ---------------------------
  // DOM refs
  // ---------------------------
  const previewsEl = $("#previews");
  const dropzone = $("#dropzone");
  const filePicker = $("#filePicker");
  const toastEl = $("#toast");
  const copyLinkBtn = $("#copyLink");
  const copyEmailBtn = $("#copyEmail");

  // ---------------------------
  // Helpers
  // ---------------------------
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
      body = `<div class="thumb" style="padding:10px">
        <audio controls preload="metadata" style="width:100%" src="${url}"></audio>
      </div>`;
    } else if (kind === "video") {
      body = `<div class="thumb" style="padding:10px">
        <video controls playsinline preload="metadata" style="width:100%; border-radius:14px;" src="${url}"></video>
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
  // Toast + copy helpers (root only, but safe everywhere)
  // ---------------------------
  let toastTimer = null;

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", async () => {
      const ok = await copyToClipboard(location.href);
      toast(ok ? "Link copied ✅" : "Couldn’t copy link 😵");
    });
  }

  if (copyEmailBtn) {
    copyEmailBtn.addEventListener("click", async () => {
      const email = "arts-internships-info@unimelb.edu.au";
      const ok = await copyToClipboard(email);
      toast(ok ? "Email copied ✅" : "Couldn’t copy email 😵");
    });
  }

  // ---------------------------
  // Asset detection (dead-streak stop)
  // ---------------------------
  async function exists(url) {
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-store" });
      return res.ok;
    } catch {
      return false;
    }
  }

  function slotCandidates(n) {
    const nn = String(n).padStart(2, "0");
    const out = [];

    out.push(`assets/work-${nn}.mp3`, `assets/work-${nn}.wav`, `assets/work-${nn}.m4a`);
    out.push(`assets/work-${nn}.pdf`);

    out.push(`assets/work-${nn}.jpg`, `assets/work-${nn}.jpeg`, `assets/work-${nn}.png`, `assets/work-${nn}.webp`);

    out.push(`assets/work-${nn}.mp4`, `assets/work-${nn}.mov`, `assets/work-${nn}.webm`);

    out.push(`assets/media-${nn}.mp4`, `assets/media-${nn}.mov`, `assets/media-${nn}.webm`);

    return out.filter((p) => allowed(typeFromExt(ext(p))));
  }

  async function detectAndRender() {
    if (!previewsEl) return;

    const found = [];

    const portfolioCandidates = [`/PORTFOLIO.pdf`, `/assets/PORTFOLIO.pdf`];
    for (const u of portfolioCandidates) {
      if (allowed("pdf") && (await exists(u))) {
        found.push({ name: u.split("/").pop(), url: u, kind: "pdf" });
        break;
      }
    }

    const MAX_SLOTS = 30;
    const DEAD_STREAK_STOP = 8;
    let dead = 0;

    for (let i = 1; i <= MAX_SLOTS; i++) {
      const candidates = slotCandidates(i);
      let hit = false;

      for (const p of candidates) {
        const url = `/${p}`;
        if (await exists(url)) {
          hit = true;
          found.push({ name: p.split("/").pop(), url, kind: typeFromExt(ext(p)) });
        }
      }

      if (hit) dead = 0;
      else dead++;

      if (i >= 6 && dead >= DEAD_STREAK_STOP) break;
    }

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
  // Drag + drop preview (local)
  // ---------------------------
  function bindDropzone() {
    if (!dropzone || !previewsEl) return;

    function handleFiles(fileList) {
      const items = [];
      for (const f of fileList) {
        const k = typeFromExt(ext(f.name));
        if (!allowed(k)) continue;
        items.push({ name: f.name, url: URL.createObjectURL(f), kind: k });
      }
      if (items.length) renderCards(items);
    }

    function setDragOver(on) {
      dropzone.classList.toggle("dragover", !!on);
    }

    window.addEventListener("dragover", (e) => e.preventDefault());
    window.addEventListener("drop", (e) => e.preventDefault());

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

    if (filePicker) {
      dropzone.addEventListener("click", () => filePicker.click());
      filePicker.addEventListener("change", (e) => {
        if (e.target.files?.length) handleFiles(e.target.files);
        filePicker.value = "";
      });
    }

    dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        filePicker?.click();
      }
    });
  }

  // ---------------------------
  // NEW: Auto-focus dropzone on /music and /media (and ?drop=1 anywhere)
  // ---------------------------
  function autoFocusDropzone() {
    if (!dropzone) return;

    const params = new URLSearchParams(location.search);
    const force = params.get("drop") === "1";
    const should = force || PAGE_MODE === "music" || PAGE_MODE === "media";
    if (!should) return;

    // wait a tick so layout is stable
    setTimeout(() => {
      try {
        dropzone.scrollIntoView({ behavior: "smooth", block: "center" });
        dropzone.classList.add("flash");
        setTimeout(() => dropzone.classList.remove("flash"), 900);
      } catch {}
    }, 150);
  }

  // ---------------------------
  // Go
  // ---------------------------
  detectAndRender();
  bindDropzone();
  autoFocusDropzone();
})();
