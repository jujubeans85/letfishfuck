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
    // Dark is the default. Toggle is disabled, so we force dark and clear any old saved preference.
    try { localStorage.removeItem(THEME_KEY); } catch(_) {}
    applyTheme("dark");
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
  function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href || ''));
}

function resolveHref(it, kind) {
  if (it && typeof it.url === 'string' && it.url.trim()) return it.url.trim();

  const k = String(kind || it?._kind || it?.kind || '').toLowerCase();

  // projects can hint where they belong
  if (k === 'project' && it && typeof it.type === 'string') {
    const t = it.type.toLowerCase();
    if (t.includes('media')) return '/app/media.html';
    if (t.includes('play')) return '/app/playground.html';
    return '/app/work.html';
  }

  const map = {
    hub: '/app/',
    notes: '/app/notes.html',
    note: '/app/notes.html',
    work: '/app/work.html',
    media: '/app/media.html',
    playground: '/app/playground.html',
    experiment: '/app/playground.html',
    experiments: '/app/playground.html',
    project: '/app/work.html',
    projects: '/app/work.html',
  };

  return map[k] || '';
}

function labelForUrl(u) {
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, '');
    if (host.includes('netlify')) return 'Live site';
    if (host.includes('github')) return 'Repo';
    if (host.includes('replit')) return 'Replit';
    return host;
  } catch {
    return 'Link';
  }
}

function actionLinksHTML(it) {
  const media = Array.isArray(it?.media) ? it.media : [];
  const urls = media.filter(x => typeof x === 'string' && isExternalHref(x)).slice(0, 3);
  if (!urls.length) return '';
  const links = urls.map(u =>
    `<a class="chip chip-link" href="${escapeHTML(u)}" target="_blank" rel="noopener noreferrer">${escapeHTML(labelForUrl(u))}</a>`
  ).join(' ');
  return `<div class="chips actions">${links}</div>`;
}

function cardHTML(it, { kind = '' } = {}) {
  const title = escapeHTML(it?.title || 'Untitled');
  const desc  = escapeHTML(it?.desc  || '');
  const date  = it?.date ? `<div class="small muted">${escapeHTML(it.date)}</div>` : '';

  const href = resolveHref(it, kind);
  const external = isExternalHref(href);
  const titleNode = href
    ? `<a class="card-title-link" href="${escapeHTML(href)}" ${external ? 'target="_blank" rel="noopener noreferrer"' : ''}>${title}</a>`
    : title;

  const tags = tagsHTML(it?.tags);
  const actions = (String(kind).toLowerCase() === 'note' || String(it?._kind).toLowerCase() === 'note') ? actionLinksHTML(it) : '';

  const dh = href ? ` data-href="${escapeHTML(href)}" data-external="${external ? '1' : '0'}"` : '';
  const hasDesc = desc && desc !== 'undefined' && desc !== 'null';

  return `
    <article class="card"${dh}>
      <h3 class="card-title">${titleNode}</h3>
      ${date}
      ${hasDesc ? `<p>${desc}</p>` : ``}
      ${actions}
      ${tags}
    </article>
  `;
}

function enableCardClickDelegation() {
  document.addEventListener('click', (e) => {
    const card = e.target?.closest?.('.card[data-href]');
    if (!card) return;

    // let real controls behave normally
    if (e.target?.closest?.('a,button,input,textarea,select,label')) return;

    const href = card.getAttribute('data-href');
    if (!href) return;

    const external = card.getAttribute('data-external') === '1' || isExternalHref(href);

    if (external) window.open(href, '_blank', 'noopener');
    else window.location.href = href;
  });
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

  function renderCrates() {
    const url = 'https://mimis-music-genre--juice4.replit.app/crates';
    const open = document.getElementById('cratesOpen');
    if (open) {
      open.setAttribute('href', url);
      open.setAttribute('target', '_blank');
      open.setAttribute('rel', 'noopener noreferrer');
    }
    const frame = document.getElementById('cratesFrame');
    if (frame) frame.setAttribute('src', url);
  }


  // Draft UI gate: keep dev/preview controls off in public view.
  const IS_DRAFT = (() => {
    const sp = new URLSearchParams(location.search);
    if (sp.has('draft')) return true;
    try { return localStorage.getItem('LFF_DRAFT') === '1'; } catch (_) { return false; }
  })();

  function hideDraftUIIfNeeded() {
    if (IS_DRAFT) return;

    const selectors = [
      'input[type="file"]',
      '#filePicker',
      '#dropzone',
      '.dropzone',
      '.dz',
      '.dz-wrap'
    ];
    document.querySelectorAll(selectors.join(',')).forEach((el) => {
      const container = el.closest('.dropzone, .dz, .dz-wrap, section, .card, .panel') || el;
      container.style.display = 'none';
    });

    const killPhrases = [
      'Drag files into the drop zone',
      'Drop files here',
      'quick preview',
      'Tomorrow we'
    ];
    document.querySelectorAll('p, div, span, small').forEach((el) => {
      const t = (el.textContent || '').trim();
      if (!t) return;
      if (killPhrases.some(p => t.includes(p)) && t.length <= 200) {
        el.style.display = 'none';
      }
    });
  }

  function ensureCratesNavLink() {
    const navs = Array.from(document.querySelectorAll('nav'));
    for (const nav of navs) {
      const links = Array.from(nav.querySelectorAll('a'));
      if (!links.length) continue;

      const hasAny = links.some(a => ['work','about','contact','projects','experiments','links','notes'].some(k => (a.getAttribute('href')||'').includes(k)));
      const already = links.some(a => (a.getAttribute('href') || '') === '/crates/' || (a.textContent || '').trim().toLowerCase() === 'crates');
      if (!hasAny || already) continue;

      const base = links.find(a => (a.textContent || '').trim().length) || links[0];
      const a = document.createElement('a');
      a.href = '/crates/';
      a.textContent = 'Crates';
      if (base.className) a.className = base.className;

      const iconOnly = links.find(l => (l.textContent || '').trim().length === 0);
      if (iconOnly) nav.insertBefore(a, iconOnly);
      else nav.appendChild(a);
      break;
    }
  }

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

    if (page === 'crates') {
      renderCrates();
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
    enableCardClickDelegation();
    await includePartials();
    ensureCratesNavLink();
    hideDraftUIIfNeeded();
    await initByPage();
    hideDraftUIIfNeeded();
  });
})();
