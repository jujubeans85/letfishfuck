/* LETFISHFUCK v2 — edge-board engine (no build tools, no drama) */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  // ---------------------------
  // Toast
  // ---------------------------
  const toastEl = $("#toast");
  let toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1400);
  }

  // ---------------------------
  // Theme (persisted)
  // ---------------------------
  const root = document.documentElement;
  const modeBtn = $("#modeBtn");
  try {
    const saved = localStorage.getItem("theme");
    if (saved) root.setAttribute("data-theme", saved);
  } catch {}

  modeBtn?.addEventListener("click", () => {
    const current = root.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch {}
    toast(next === "dark" ? "Dark mode" : "Light mode");
  });

  // ---------------------------
  // Partials (header/footer)
  // ---------------------------
  async function inject(id, url) {
    const host = document.getElementById(id);
    if (!host) return;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      host.innerHTML = await res.text();
    } catch {
      // soft fail: page still works
    }
  }
  inject("siteHeader", "/partials/header.html");
  inject("siteFooter", "/partials/footer.html");

  // ---------------------------
  // Copy helpers
  // ---------------------------
  const SITE_URL = "https://letfishfuck.netlify.app/";
  const EMAIL = "arts-internships-info@unimelb.edu.au";

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

  $("#copyLink")?.addEventListener("click", async () => {
    const ok = await copyToClipboard(location.href || SITE_URL);
    toast(ok ? "Link copied ✅" : "Couldn’t copy 😵");
  });

  $("#copyEmail")?.addEventListener("click", async () => {
    const ok = await copyToClipboard(EMAIL);
    toast(ok ? "Email copied ✅" : "Couldn’t copy 😵");
  });

  // ---------------------------
  // JSON helpers + card render
  // ---------------------------
  const page = document.body?.dataset?.page || "";

  function esc(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function tagClass(tag) {
    const t = String(tag).toLowerCase();
    if (t.includes("audio") || t.includes("music")) return "tag cold";
    if (t.includes("video") || t.includes("live")) return "tag";
    if (t.includes("interactive") || t.includes("hardware") || t.includes("nfc")) return "tag hot";
    if (t.includes("ship") || t.includes("drop")) return "tag hot";
    return "tag";
  }

  function tileHTML(item, kind) {
    const title = esc(item.title || "Untitled");
    const desc = esc(item.desc || item.text || "");
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const year = item.year ? `<span class="tag">${esc(item.year)}</span>` : "";
    const date = item.date ? `<span class="tag">${esc(item.date)}</span>` : "";
    const mood = item.mood ? `<span class="tag hot">${esc(item.mood)}</span>` : "";

    const route = item.url || item.route || item.link || "#";
    const slug = item.slug ? ` id="${esc(item.slug)}"` : "";

    // Notes can have optional media links
    const media = Array.isArray(item.media) ? item.media : [];
    const mediaBtn = media.length
      ? `<a class="btn ghost" href="${esc(media[0])}" target="_blank" rel="noreferrer">Media</a>`
      : "";

    return `
      <article class="tile"${slug}>
        <h3>${title}</h3>
        ${desc ? `<p>${desc}</p>` : ""}
        <div class="tags">
          ${date}${year}${mood}
          ${tags.map(t => `<span class="${tagClass(t)}">${esc(t)}</span>`).join("")}
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a class="btn ${kind === "primary" ? "primary" : ""}" href="${esc(route)}">Open</a>
          ${mediaBtn}
        </div>
      </article>
    `;
  }

  async function loadJSON(path) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) throw new Error("bad fetch");
      return await res.json();
    } catch {
      return null;
    }
  }

  // ---------------------------
  // NEW DROP (latest items across all)
  // Supports optional: date (YYYY-MM-DD)
  // ---------------------------
  function stamp(x) {
    const d = x.date ? Date.parse(x.date) : NaN;
    if (Number.isFinite(d)) return d;
    if (x.year) return Date.parse(`${x.year}-01-01`);
    return 0;
  }

  function normalizeNewDrop(projects = [], experiments = [], notes = []) {
    const all = [
      ...projects.map(p => ({ ...p, _type: "project", _stamp: stamp(p) })),
      ...experiments.map(e => ({ ...e, _type: "experiment", _stamp: stamp(e) })),
      ...notes.map((n, idx) => ({
        title: n.title || `Note — ${n.date || ""}`.trim(),
        text: n.text || n.desc || "",
        date: n.date,
        mood: n.mood,
        tags: n.tags,
        link: n.link || "/notes",
        media: n.media,
        slug: n.slug || `note-${idx + 1}`,
        _type: "note",
        _stamp: stamp(n)
      }))
    ];

    all.sort((a, b) => (b._stamp || 0) - (a._stamp || 0));
    return all.slice(0, 6);
  }

  // ---------------------------
  // Render per page
  // ---------------------------
  async function renderHub() {
    const projects = (await loadJSON("/data/projects.json")) || [];
    const experiments = (await loadJSON("/data/experiments.json")) || [];
    const links = (await loadJSON("/data/links.json")) || [];
    const notes = (await loadJSON("/data/notes.json")) || [];

    const newDrop = normalizeNewDrop(projects, experiments, notes);

    const newDropGrid = $("#newDropGrid");
    if (newDropGrid) {
      newDropGrid.innerHTML = newDrop.map(x => tileHTML(x, "primary")).join("");
    }

    const projectsGrid = $("#projectsGrid");
    if (projectsGrid) projectsGrid.innerHTML = projects.map(p => tileHTML(p)).join("");

    const experimentsGrid = $("#experimentsGrid");
    if (experimentsGrid) experimentsGrid.innerHTML = experiments.map(e => tileHTML(e, "primary")).join("");

    const linksGrid = $("#linksGrid");
    if (linksGrid) {
      linksGrid.innerHTML = links.map(l => tileHTML({
        title: l.title,
        desc: l.desc,
        tags: l.tags,
        slug: l.slug,
        url: l.url
      })).join("");
    }
  }

  async function renderWork() {
    const projects = (await loadJSON("/data/projects.json")) || [];
    const work = projects.filter(p => (p.category || "").toLowerCase() === "work");

    const workGrid = $("#workGrid");
    if (workGrid) workGrid.innerHTML = work.map(p => tileHTML(p, "primary")).join("");

    await autoDetectNamedFiles("work");
  }

  async function renderMedia() {
    const projects = (await loadJSON("/data/projects.json")) || [];
    const media = projects.filter(p => (p.category || "").toLowerCase() === "media");

    const mediaGrid = $("#mediaGrid");
    if (mediaGrid) mediaGrid.innerHTML = media.map(p => tileHTML(p, "primary")).join("");

    await autoDetectNamedFiles("media");
  }

  async function renderPlayground() {
    const experiments = (await loadJSON("/data/experiments.json")) || [];
    const experimentsGrid = $("#experimentsGrid");
    if (experimentsGrid) experimentsGrid.innerHTML = experiments.map(e => tileHTML(e, "primary")).join("");
  }

  async function renderNotes() {
    const notes = (await loadJSON("/data/notes.json")) || [];

    const sorted = [...notes].sort((a, b) => stamp(b) - stamp(a));

    const grid = $("#notesGrid");
    if (!grid) return;

    if (!sorted.length) {
      grid.innerHTML = `
        <div class="tile">
          <h3>No notes yet.</h3>
          <p>Add entries in <code>/data/notes.json</code> then refresh.</p>
          <div class="tags">
            <span class="tag">date</span>
            <span class="tag">text</span>
            <span class="tag">mood (optional)</span>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = sorted.map((n, idx) => tileHTML({
      title: n.title || (n.mood ? `Note — ${n.mood}` : "Note"),
      text: n.text || n.desc || "",
      date: n.date,
      mood: n.mood,
      tags: n.tags,
      link: n.link || "/app/",
      media: n.media,
      slug: n.slug || `note-${idx + 1}`
    }, "primary")).join("");
  }

  // ---------------------------
  // Drag/drop local preview (work/media)
  // ---------------------------
  function bindDropzone() {
    const dz = $("#dropzone");
    const picker = $("#filePicker");
    const previews = $("#previews");
    if (!dz || !picker || !previews) return;

    const humanType = (file) => {
      if (file.type.startsWith("image/")) return "Image";
      if (file.type.startsWith("audio/")) return "Audio";
      if (file.type.startsWith("video/")) return "Video";
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "PDF";
      return file.type || "File";
    };

    const makeCard = (file) => {
      const card = document.createElement("div");
      card.className = "preview";

      const meta = document.createElement("div");
      meta.className = "meta";

      const left = document.createElement("div");
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = file.name;

      const type = document.createElement("div");
      type.className = "type";
      type.textContent = humanType(file);

      left.appendChild(name);
      left.appendChild(type);

      const rm = document.createElement("button");
      rm.className = "x";
      rm.type = "button";
      rm.textContent = "Remove";
      rm.addEventListener("click", () => card.remove());

      meta.appendChild(left);
      meta.appendChild(rm);

      const thumb = document.createElement("div");
      thumb.className = "thumb";

      const url = URL.createObjectURL(file);

      if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.alt = file.name;
        img.loading = "lazy";
        img.src = url;
        thumb.appendChild(img);
      } else if (file.type.startsWith("audio/")) {
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = url;
        thumb.appendChild(audio);
      } else if (file.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.controls = true;
        video.playsInline = true;
        video.src = url;
        thumb.appendChild(video);
      } else if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const iframe = document.createElement("iframe");
        iframe.title = file.name;
        iframe.src = url;
        thumb.appendChild(iframe);
      } else {
        const p = document.createElement("div");
        p.style.padding = "14px";
        p.style.color = "var(--muted)";
        p.textContent = "Preview not supported — still fine. Commit it and link it.";
        thumb.appendChild(p);
      }

      card.appendChild(meta);
      card.appendChild(thumb);
      previews.appendChild(card);
    };

    const addFiles = (list) => {
      [...list].forEach(makeCard);
      toast("Preview cards added");
    };

    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("dragover");
    });
    dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("dragover");
      if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
    });

    dz.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        picker.click();
      }
    });

    dz.addEventListener("click", () => picker.click());

    picker.addEventListener("change", (e) => {
      const files = e.target.files;
      if (files?.length) addFiles(files);
      picker.value = "";
    });
  }

  // ---------------------------
  // Auto-detect deployed files (naming convention)
  // work: /media/work-01.(jpg|png|mp4...) and /music/work-01.(mp3...)
  // media: /media/media-01.(jpg|mp4...)
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

  async function exists(url) {
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-store" });
      return res.ok;
    } catch {
      return false;
    }
  }

  function detectedCard({ name, url, kind }) {
    const safe = esc(name);
    const label = kind.toUpperCase();
    let body = "";

    if (kind === "image") {
      body = `<div class="thumb"><img src="${url}" alt="${safe}" loading="lazy"></div>`;
    } else if (kind === "audio") {
      body = `<div class="thumb" style="padding:10px"><audio controls preload="metadata" style="width:100%" src="${url}"></audio></div>`;
    } else if (kind === "video") {
      body = `<div class="thumb" style="padding:10px"><video controls playsinline preload="metadata" style="width:100%; border-radius:14px;" src="${url}"></video></div>`;
    } else if (kind === "pdf") {
      body = `<div class="thumb" style="padding:12px"><a class="btn" href="${url}" target="_blank" rel="noreferrer">Open PDF</a></div>`;
    } else {
      body = `<div class="thumb" style="padding:12px"><a class="btn" href="${url}" target="_blank" rel="noreferrer">Open file</a></div>`;
    }

    return `
      <article class="preview">
        <div class="meta">
          <div>
            <div class="name">${safe}</div>
            <div class="type">${label}</div>
          </div>
          <a class="btn ghost" href="${url}" target="_blank" rel="noreferrer">Open</a>
        </div>
        ${body}
      </article>
    `;
  }

  function slotCandidates(mode, n) {
    const nn = String(n).padStart(2, "0");
    const out = [];

    if (mode === "work") {
      out.push(`/media/work-${nn}.jpg`, `/media/work-${nn}.jpeg`, `/media/work-${nn}.png`, `/media/work-${nn}.webp`);
      out.push(`/media/work-${nn}.mp4`, `/media/work-${nn}.mov`, `/media/work-${nn}.webm`);
      out.push(`/music/work-${nn}.mp3`, `/music/work-${nn}.wav`, `/music/work-${nn}.m4a`);
      out.push(`/media/work-${nn}.pdf`, `/music/work-${nn}.pdf`);
    }

    if (mode === "media") {
      out.push(`/media/media-${nn}.mp4`, `/media/media-${nn}.mov`, `/media/media-${nn}.webm`);
      out.push(`/media/media-${nn}.jpg`, `/media/media-${nn}.jpeg`, `/media/media-${nn}.png`, `/media/media-${nn}.webp`);
    }

    return out;
  }

  async function autoDetectNamedFiles(mode) {
    const target = $("#detectedGrid");
    if (!target) return;

    const found = [];
    const MAX_SLOTS = 30;
    const DEAD_STREAK_STOP = 8;
    let dead = 0;

    for (let i = 1; i <= MAX_SLOTS; i++) {
      const candidates = slotCandidates(mode, i);
      let hit = false;

      for (const url of candidates) {
        if (await exists(url)) {
          hit = true;
          const name = url.split("/").pop();
          const kind = typeFromExt(ext(url));
          found.push({ name, url, kind });
        }
      }

      dead = hit ? 0 : dead + 1;
      if (i >= 6 && dead >= DEAD_STREAK_STOP) break;
    }

    if (!found.length) {
      target.innerHTML = `
        <div class="tile">
          <h3>Nothing detected yet.</h3>
          <p>Use the naming convention, commit files, redeploy, refresh.</p>
          <div class="tags">
            <span class="tag">/media/${mode}-01.*</span>
            <span class="tag">/music/work-01.*</span>
          </div>
        </div>
      `;
      return;
    }

    found.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    target.innerHTML = found.map(detectedCard).join("");
  }

  // ---------------------------
  // Boot
  // ---------------------------
  if (page === "hub") renderHub();
  if (page === "work") { renderWork(); bindDropzone(); }
  if (page === "media") { renderMedia(); bindDropzone(); }
  if (page === "playground") renderPlayground();
  if (page === "notes") renderNotes();
})();
