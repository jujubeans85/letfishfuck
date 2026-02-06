/*
  LETFISHFUCK — single-source-of-truth engine
  Target: crusty-grunge + hyper-kind
  Rule: if this file is loaded more than once, it should NOT double-init.
*/
(() => {
  if (window.__LFF_APP_INITED) return;
  window.__LFF_APP_INITED = true;

  const VERSION = "lff-app-ssot-1.0.0";
  const DATA = {
    projects: "/data/projects.json",
    experiments: "/data/experiments.json",
    notes: "/data/notes.json",
    links: "/data/links.json",
  };

  // ---------- tiny utils ----------
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const isArr = Array.isArray;

  const safeDate = (v) => {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v)) return v;
    // accept: "2026-02-06", "2026/02/06", ISO, or year-only "2024"
    const s = String(v).trim();
    if (/^\d{4}$/.test(s)) return new Date(Number(s), 0, 1);
    const d = new Date(s.replace(/\//g, "-"));
    return isNaN(d) ? null : d;
  };

  const getPath = () => {
    // normalize: remove trailing "index.html"
    let p = window.location.pathname || "/";
    p = p.replace(/\/index\.html$/i, "/");
    // pretty route support: /work -> /app/work.html might still exist; we detect by ends.
    return p;
  };

  async function fetchJSON(url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      return data;
    } catch (e) {
      console.warn("[LFF] JSON fetch failed:", url, e);
      return null;
    }
  }

  // ---------- partials (optional) ----------
  async function loadPartials() {
    // supports:
    // <div data-include="header"></div>, <div data-include="footer"></div>
    // OR #siteHeader / #siteFooter
    const headerMounts = qsa('[data-include="header"], #siteHeader');
    const footerMounts = qsa('[data-include="footer"], #siteFooter');
    if (!headerMounts.length && !footerMounts.length) return;

    const [headerHtml, footerHtml] = await Promise.all([
      headerMounts.length ? fetch("/partials/header.html").then(r => r.ok ? r.text() : "") : Promise.resolve(""),
      footerMounts.length ? fetch("/partials/footer.html").then(r => r.ok ? r.text() : "") : Promise.resolve(""),
    ]);

    headerMounts.forEach(m => { if (headerHtml) m.innerHTML = headerHtml; });
    footerMounts.forEach(m => { if (footerHtml) m.innerHTML = footerHtml; });

    // Wire up common nav highlighting if links exist
    const p = getPath();
    qsa('a[href]', document).forEach(a => {
      try {
        const href = a.getAttribute("href") || "";
        if (!href.startsWith("/")) return;
        const norm = href.replace(/\/index\.html$/i, "/");
        if (norm === p) a.setAttribute("aria-current", "page");
      } catch {}
    });
  }

  // ---------- theme ----------
  function applyTheme() {
    const key = "lff_theme";
    const saved = localStorage.getItem(key);
    const theme = saved || document.documentElement.getAttribute("data-theme") || "dark";
    document.documentElement.setAttribute("data-theme", theme);

    const toggles = qsa("[data-theme-toggle]");
    toggles.forEach(btn => {
      btn.addEventListener("click", () => {
        const cur = document.documentElement.getAttribute("data-theme") || "dark";
        const next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem(key, next);
      });
    });
  }

  // ---------- renderers ----------
  function tagPills(tags) {
    const arr = isArr(tags) ? tags : (tags ? [tags] : []);
    if (!arr.length) return "";
    return `<div class="tags">${arr.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>`;
  }

  function linkBlock(item) {
    const out = [];
    if (item?.link) out.push({ label: item.link_label || "Link", href: item.link });
    if (isArr(item?.links)) {
      item.links.forEach(l => {
        if (!l) return;
        if (typeof l === "string") out.push({ label: "Link", href: l });
        else if (l.href) out.push({ label: l.label || l.title || "Link", href: l.href });
      });
    }
    if (!out.length) return "";
    return `<div class="links">${out.map(l => `<a class="chip" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div>`;
  }

  function mediaNode(m) {
    // supports:
    // - string URL
    // - {type:"image"|"audio"|"video"|"link", src:"", title:""}
    if (!m) return "";
    let type = null, src = null, title = "";
    if (typeof m === "string") {
      src = m;
    } else if (typeof m === "object") {
      type = m.type || null;
      src = m.src || m.url || "";
      title = m.title || m.caption || "";
    }
    if (!src) return "";

    const lower = src.toLowerCase();
    const isImg = type === "image" || /\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower);
    const isAudio = type === "audio" || /\.(mp3|wav|ogg|m4a)$/.test(lower);

    if (isImg) {
      return `<figure class="media media-img">
        <img loading="lazy" src="${esc(src)}" alt="${esc(title || "media")}" />
        ${title ? `<figcaption>${esc(title)}</figcaption>` : ""}
      </figure>`;
    }
    if (isAudio) {
      return `<figure class="media media-audio">
        <audio controls preload="none" src="${esc(src)}"></audio>
        ${title ? `<figcaption>${esc(title)}</figcaption>` : ""}
      </figure>`;
    }

    // default: link chip
    return `<a class="chip" href="${esc(src)}" target="_blank" rel="noopener">${esc(title || "Open")}</a>`;
  }

  function mediaBlock(media) {
    const arr = isArr(media) ? media : (media ? [media] : []);
    if (!arr.length) return "";
    const nodes = arr.map(mediaNode).filter(Boolean).join("");
    if (!nodes) return "";
    return `<div class="media-wrap">${nodes}</div>`;
  }

  function card(item, kind) {
    const title = item?.title || item?.name || (kind === "notes" ? "Note" : kind.slice(0,1).toUpperCase()+kind.slice(1, -1));
    const desc = item?.description || item?.desc || item?.text || item?.body || "";
    const date = safeDate(item?.date || item?.updated || item?.when || item?.year);
    const metaBits = [];
    if (item?.role) metaBits.push(item.role);
    if (item?.year && !date) metaBits.push(item.year);
    if (date) metaBits.push(date.toISOString().slice(0,10));
    if (item?.mood) metaBits.push(item.mood);

    const meta = metaBits.length ? `<div class="meta">${metaBits.map(esc).join(" • ")}</div>` : "";
    return `<article class="card card-${esc(kind)}">
      <div class="card-top">
        <h3 class="title">${esc(title)}</h3>
        ${meta}
      </div>
      ${desc ? `<div class="desc">${esc(desc)}</div>` : ""}
      ${tagPills(item?.tags)}
      ${linkBlock(item)}
      ${mediaBlock(item?.media)}
    </article>`;
  }

  function renderList(mount, items, kind) {
    if (!mount) return;
    if (!isArr(items) || !items.length) {
      mount.innerHTML = `<div class="empty">Nothing here yet.</div>`;
      return;
    }
    mount.innerHTML = items.map(i => card(i, kind)).join("");
  }

  function normalizeArray(payload) {
    // allow {items:[...]} or {data:[...]} or direct [...]
    if (!payload) return [];
    if (isArr(payload)) return payload;
    if (isArr(payload.items)) return payload.items;
    if (isArr(payload.data)) return payload.data;
    return [];
  }

  function latestFirst(arr) {
    return [...arr].sort((a,b) => {
      const da = safeDate(a?.date || a?.updated || a?.when || a?.year) || new Date(0);
      const db = safeDate(b?.date || b?.updated || b?.when || b?.year) || new Date(0);
      return db - da;
    });
  }

  function buildNewDrop({projects, experiments, notes}) {
    const stamp = (x) => safeDate(x?.date || x?.updated || x?.when || x?.year) || new Date(0);
    const pack = [];
    latestFirst(notes).slice(0,6).forEach(n => pack.push({ kind:"note", item:n, t:stamp(n) }));
    latestFirst(projects).slice(0,6).forEach(p => pack.push({ kind:"project", item:p, t:stamp(p) }));
    latestFirst(experiments).slice(0,6).forEach(e => pack.push({ kind:"experiment", item:e, t:stamp(e) }));
    pack.sort((a,b) => b.t - a.t);
    return pack.slice(0,10);
  }

  function renderNewDrop(mount, entries) {
    if (!mount) return;
    if (!entries.length) {
      mount.innerHTML = `<div class="empty">No drops yet.</div>`;
      return;
    }
    mount.innerHTML = entries.map(({kind, item}) => {
      const title = item?.title || item?.name || (kind === "note" ? "Note" : kind);
      const d = safeDate(item?.date || item?.updated || item?.when || item?.year);
      const dateStr = d ? d.toISOString().slice(0,10) : "";
      const href =
        kind === "note" ? "/app/notes.html" :
        kind === "project" ? "/app/work.html" :
        "/app/playground.html";
      return `<a class="drop-row" href="${href}">
        <span class="drop-kind">${esc(kind)}</span>
        <span class="drop-title">${esc(title)}</span>
        <span class="drop-date">${esc(dateStr)}</span>
      </a>`;
    }).join("");
  }

  // ---------- main boot ----------
  async function boot() {
    applyTheme();
    await loadPartials();

    const [projectsRaw, experimentsRaw, notesRaw, linksRaw] = await Promise.all([
      fetchJSON(DATA.projects),
      fetchJSON(DATA.experiments),
      fetchJSON(DATA.notes),
      fetchJSON(DATA.links),
    ]);

    const projects = normalizeArray(projectsRaw);
    const experiments = normalizeArray(experimentsRaw);
    const notes = normalizeArray(notesRaw);
    const links = normalizeArray(linksRaw);

    // Mount map (works even if some pages don't have these)
    const mounts = {
      projects: qs("#projects, #projectsGrid, [data-mount='projects']"),
      experiments: qs("#experiments, #experimentsGrid, [data-mount='experiments']"),
      notes: qs("#notes, #notesGrid, [data-mount='notes']"),
      links: qs("#links, #linksGrid, [data-mount='links']"),
      newDrop: qs("#newDrop, #newDropList, [data-mount='newdrop']"),
    };

    // Render per-page (but safe if mounts missing)
    renderList(mounts.projects, latestFirst(projects), "projects");
    renderList(mounts.experiments, latestFirst(experiments), "experiments");
    renderList(mounts.notes, latestFirst(notes), "notes");
    renderList(mounts.links, latestFirst(links), "links");

    const drop = buildNewDrop({projects, experiments, notes});
    renderNewDrop(mounts.newDrop, drop);

    // Debug hook (off by default)
    window.__LFF = { VERSION, projects, experiments, notes, links };
    console.info(`[LFF] booted ${VERSION}`, { path: getPath(), counts: {projects: projects.length, experiments: experiments.length, notes: notes.length, links: links.length} });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
