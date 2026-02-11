/* LETFISHFUCK — single source of truth
   Path: /js/app.js
   Rule: pages should load ONLY this file (no mixed script forests).
*/
(() => {
  'use strict';

  // Namespace
  const LFF = window.LFF = window.LFF || {};

const DEBUG = new URLSearchParams(location.search).has('debug');
LFF.DEBUG = DEBUG;
LFF.v = 'v10-single-source';
function debugLog(...args){ if(DEBUG) console.log('[LFF]', ...args); }
LFF.debugLog = debugLog;

// Tiny on-page badge so you can instantly confirm the real app.js loaded (esp iOS cache / wrong folder).
(function showDebugBadge(){
  if(!DEBUG) return;
  try{
    const badge = document.createElement('div');
    badge.id = 'lff-debug-badge';
    badge.style.cssText = 'position:fixed;z-index:99999;top:10px;right:10px;padding:6px 10px;border-radius:999px;background:rgba(0,0,0,.75);color:#fff;font:12px/1.2 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;';
    const page = document.body && document.body.dataset ? (document.body.dataset.page || '-') : '-';
    badge.textContent = `LFF ${LFF.v} • page:${page}`;
    document.addEventListener('DOMContentLoaded', ()=>document.body.appendChild(badge), { once:true });
  }catch(e){}
})();

  // ---------- tiny utils ----------
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const escapeHTML = (str='') => String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  const escapeHtml = escapeHTML;
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
  function cardHTML(item, kind) {
  const title = escapeHtml(item.title || '');
  const desc = escapeHtml(item.desc || '');

  // Card click target:
  // - prefer explicit internal path (item.path)
  // - otherwise, if item.href exists, use it
  // - otherwise, fall back to an internal section route (so cards don't fling you to GitHub by accident)
  const defaultHref = (k) => {
    switch (k) {
      case 'notes': return '/notes/';
      case 'projects': return '/work/';
      case 'experiments': return '/playground/';
      case 'media': return '/media/';
      default: return '';
    }
  };

  const href = (item.path || item.href || defaultHref(kind) || '').trim();

  // Small “chips” (tags)
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const tagsHtml = tags.length
    ? `<div class="tags">${tags.map(t => `<span class="tag">${escapeHtml(String(t))}</span>`).join('')}</div>`
    : '';

  // Optional sub-links rendered as safe anchors (won't get swallowed by card click)
  const links = Array.isArray(item.links) ? item.links : [];
  const linksHtml = links.length
    ? `<div class="card-links">${links.map(l => {
        const lh = (l && l.href) ? String(l.href) : '';
        const ll = escapeHtml((l && (l.label || l.title)) ? String(l.label || l.title) : 'link');
        const isExt = /^https?:\/\//i.test(lh);
        const target = isExt ? ' target="_blank" rel="noopener"' : '';
        return `<a class="chip-link" href="${escapeHtml(lh)}"${target}>${ll}</a>`;
      }).join('')}</div>`
    : '';

  // role/tabindex makes the whole thing feel like a real button on iOS
  const hrefAttr = href ? ` data-href="${escapeHtml(href)}" role="link" tabindex="0"` : '';

  return `
    <div class="card"${hrefAttr}>
      <div class="card-title">${title}</div>
      ${desc ? `<div class="card-desc">${desc}</div>` : ''}
      ${linksHtml}
      ${tagsHtml}
    </div>
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
function wireCardClicks(root = document) {
  if (window.__LFF_cardsDelegated) return;
  window.__LFF_cardsDelegated = true;

  const go = (href) => {
    if (!href) return;
    const isExternal = /^https?:\/\//i.test(href);
    if (isExternal) {
      window.open(href, '_blank', 'noopener');
      return;
    }
    window.location.href = href;
  };

  root.addEventListener('click', (e) => {
    // If the user tapped a real control/link inside the card, let it do its thing.
    if (e.target.closest('a,button,input,textarea,select,label')) return;

    const card = e.target.closest('.card[data-href]');
    if (!card) return;

    const href = card.getAttribute('data-href');
    if (!href) return;

    e.preventDefault();
    go(href);
  }, { passive: false });

  // Keyboard accessibility (Enter/Space on focused card)
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.card[data-href]');
    if (!card) return;
    if (e.target !== card) return; // only when the card itself is focused
    e.preventDefault();
    go(card.getAttribute('data-href'));
  });
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
    await includePartials();
    ensureCratesNavLink();
    hideDraftUIIfNeeded();
    await initByPage();
    wireCardClicks(document);
    hideDraftUIIfNeeded();
  });
})();
