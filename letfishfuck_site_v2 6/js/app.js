/* LETFISHFUCK — single source of truth
   Path: /js/app.js
   Rule: pages should load ONLY this file (no mixed script forests).
*/
(() => {
  'use strict';

  // Namespace
  const LFF = window.LFF = window.LFF || {};

  // ---------- tiny utils ----------
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const escapeHTML = (str='') => String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  // Fetch JSON with sane errors
  async function getJSON(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} loading ${path}`);
    return await res.json();
  }
  LFF.getJSON = getJSON;

  // ---------- Partials include (header/footer) ----------
  async function includePartials() {
    const nodes = $$('[data-include]');
    if (!nodes.length) return;

    await Promise.all(nodes.map(async (node) => {
      const url = node.getAttribute('data-include');
      if (!url) return;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        node.innerHTML = await res.text();
      } catch (e) {
        node.innerHTML = `<div class="card"><strong>Couldn't load partial</strong><div class="small muted">${escapeHTML(url)} — ${escapeHTML(e.message)}</div></div>`;
      }
    }));
  }
  LFF.includePartials = includePartials;

  // ---------- Theme ----------
  const THEME_KEY = 'lff-theme';
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
  }
  function initTheme() {
    const saved = (() => { try { return localStorage.getItem(THEME_KEY); } catch(_) { return null; } })();
    if (saved) applyTheme(saved);

    // If there is a toggle button, wire it.
    const btn = $('#modeBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(cur === 'dark' ? 'light' : 'dark');
      });
    }
  }
  LFF.applyTheme = applyTheme;

  // ---------- Media rendering ----------
  function normalizeMedia(media) {
    if (!media) return [];
    if (Array.isArray(media)) return media;
    // backwards compat: single string
    return [media];
  }

  function renderMedia(media) {
    const arr = normalizeMedia(media);
    if (!arr.length) return '';
    const items = arr.map((m) => {
      if (typeof m === 'string') {
        const href = m;
        return `<a class="chip" href="${escapeHTML(href)}" target="_blank" rel="noopener">media</a>`;
      }
      if (m && typeof m === 'object') {
        const type = (m.type || 'link').toLowerCase();
        const src = m.src || m.url || '';
        const title = m.title || m.label || type;
        if (!src) return '';
        if (type === 'image') {
          return `<figure class="media-figure">
            <img class="media-img" src="${escapeHTML(src)}" alt="${escapeHTML(title)}" loading="lazy" />
            ${title ? `<figcaption class="small muted">${escapeHTML(title)}</figcaption>` : ''}
          </figure>`;
        }
        // default: link
        return `<a class="chip" href="${escapeHTML(src)}" target="_blank" rel="noopener">${escapeHTML(title)}</a>`;
      }
      return '';
    }).join('');
    return `<div class="chips media-chips">${items}</div>`;
  }

  // ---------- Cards ----------
  function cardHTML(item, kind) {
    const title = item.title || item.name || '(untitled)';
    const desc  = item.description || item.desc || item.text || '';
    const tags  = Array.isArray(item.tags) ? item.tags : (item.tags ? [item.tags] : []);
    const date  = item.date || item.when || '';
    const href  = item.url || item.link || '';

    const tagHTML = tags.length ? `<div class="tags">${tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join('')}</div>` : '';
    const mediaHTML = renderMedia(item.media);

    const head = href
      ? `<h3><a href="${escapeHTML(href)}" target="_blank" rel="noopener">${escapeHTML(title)}</a></h3>`
      : `<h3>${escapeHTML(title)}</h3>`;

    const meta = date ? `<div class="small muted">${escapeHTML(date)}</div>` : '';

    return `
      <article class="card item" data-kind="${escapeHTML(kind||'')}">
        ${head}
        ${meta}
        ${desc ? `<p>${escapeHTML(desc)}</p>` : ''}
        ${mediaHTML}
        ${tagHTML}
      </article>
    `;
  }

  function renderInto(container, items, kind) {
    if (!container) return;
    if (!Array.isArray(items) || !items.length) {
      container.innerHTML = `<div class="card"><strong>Nothing yet.</strong><div class="small muted">Add items in /data/*.json</div></div>`;
      return;
    }
    container.innerHTML = items.map(it => cardHTML(it, kind)).join('');
  }

  // ---------- Renderers ----------
  async function renderProjects(opts={}) {
    const container = $(opts.container || '#projectsList');
    try {
      const data = await getJSON('/data/projects.json');
      let items = Array.isArray(data) ? data : (data.projects || []);
      if (opts.filterKind) items = items.filter(p => (p.kind||'').toLowerCase() === String(opts.filterKind).toLowerCase());
      renderInto(container, items, 'project');
    } catch (e) {
      if (container) container.innerHTML = `<div class="card error"><strong>Couldn't load projects.json</strong><div class="small muted">${escapeHTML(e.message)}</div></div>`;
    }
  }

  async function renderExperiments(opts={}) {
    const container = $(opts.container || '#experimentsList');
    try {
      const data = await getJSON('/data/experiments.json');
      const items = Array.isArray(data) ? data : (data.experiments || []);
      renderInto(container, items, 'experiment');
    } catch (e) {
      if (container) container.innerHTML = `<div class="card error"><strong>Couldn't load experiments.json</strong><div class="small muted">${escapeHTML(e.message)}</div></div>`;
    }
  }

  async function renderLinks(opts={}) {
    const container = $(opts.container || '#linksList');
    try {
      const data = await getJSON('/data/links.json');
      const items = Array.isArray(data) ? data : (data.links || []);
      renderInto(container, items, 'link');
    } catch (e) {
      if (container) container.innerHTML = `<div class="card error"><strong>Couldn't load links.json</strong><div class="small muted">${escapeHTML(e.message)}</div></div>`;
    }
  }

  async function renderNotes(opts={}) {
    const container = $(opts.container || '#notesList');
    try {
      const data = await getJSON('/data/notes.json');
      const items = Array.isArray(data) ? data : (data.notes || []);
      // newest first if date exists
      items.sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
      renderInto(container, items, 'note');
    } catch (e) {
      if (container) container.innerHTML = `<div class="card error"><strong>Couldn't load notes.json</strong><div class="small muted">${escapeHTML(e.message)}</div></div>`;
    }
  }

  LFF.renderProjects = renderProjects;
  LFF.renderExperiments = renderExperiments;
  LFF.renderLinks = renderLinks;
  LFF.renderNotes = renderNotes;

  // ---------- Hub: "New Drop" ----------
  async function renderNewDrop() {
    const feed = $('#newDrop');
    if (!feed) return;
    try {
      const [projects, experiments, notes] = await Promise.all([
        getJSON('/data/projects.json').catch(() => []),
        getJSON('/data/experiments.json').catch(() => []),
        getJSON('/data/notes.json').catch(() => []),
      ]);

      const arr = []
        .concat(Array.isArray(projects)?projects:(projects.projects||[])).map(x=>({...x,_kind:'project'}))
        .concat(Array.isArray(experiments)?experiments:(experiments.experiments||[])).map(x=>({...x,_kind:'experiment'}))
        .concat(Array.isArray(notes)?notes:(notes.notes||[])).map(x=>({...x,_kind:'note'}));

      arr.sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
      const top = arr.slice(0, 6);

      feed.innerHTML = top.map(it => cardHTML(it, it._kind)).join('');
    } catch (e) {
      feed.innerHTML = `<div class="card error"><strong>Couldn't load New Drop</strong><div class="small muted">${escapeHTML(e.message)}</div></div>`;
    }
  }

  // ---------- Page router ----------
  async function initByPage() {
    const page = document.body.getAttribute('data-page') || '';
    // Hub has three grids
    if (page === 'hub') {
      await Promise.all([
        renderProjects({container:'#projectsGrid'}),
        renderExperiments({container:'#experimentsGrid'}),
        renderLinks({container:'#linksGrid'}),
        renderNewDrop(),
      ]);
      return;
    }
    if (page === 'work') {
      await renderProjects({container:'#projectsList'}); // work list uses projects
      return;
    }
    if (page === 'media') {
      await renderProjects({container:'#mediaList', filterKind:'media'});
      return;
    }
    if (page === 'notes') {
      await renderNotes({container:'#notesList'});
      return;
    }
  }

  // ---------- Boot ----------
  document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await includePartials();
    await initByPage();
  });
})();
