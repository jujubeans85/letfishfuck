/* LETFISHFUCK — single source of truth
   Path: /js/app.js
   Rule: pages should load ONLY this file (no mixed script forests).
*/
(() => {
  'use strict';

  // Build id (debug)
  const LFF_BUILD = 'v19-drop-ready';

  // Namespace
  const LFF = (window.LFF = window.LFF || {});
  LFF.BUILD = LFF_BUILD;

  // ---------- tiny utils ----------
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const escapeHTML = (str='') => String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
  const escapeHtml = escapeHTML;

  function suggestedFilename(id, ext='png') {
    const safe = String(id || 'untitled')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'')
      .slice(0, 80);
    return `${safe}.${ext}`;
  }
  LFF.suggestedFilename = suggestedFilename;

  async function getJSON(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} loading ${path}`);
    return await res.json();
  }
  LFF.getJSON = getJSON;

  function normalizeExternalLink(href) {
    let h = String(href || '').trim();
    if (!h) return '';
    if (h.startsWith('spotify:')) {
      const parts = h.split(':');
      if (parts.length >= 3) {
        const type = parts[1];
        const id = parts[2];
        if (type && id) return `https://open.spotify.com/${type}/${id}`;
      }
    }
    if (/^open\.spotify\.com\//i.test(h)) return 'https://' + h;
    if (/^spotify\.link\//i.test(h)) return 'https://' + h;
    if (/^soundcloud:\/\//i.test(h)) return h.replace(/^soundcloud:\/\//i, 'https://soundcloud.com/');
    if (/^https?:\/\//i.test(h)) return h;
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(h)) return 'https://' + h;
    return h;
  }
  LFF.normalizeExternalLink = normalizeExternalLink;

  function normalizeInternalPath(path='') {
    let p = String(path || '').trim();
    if (!p) return '';
    p = p.replace(/potraits/gi, 'portraits').replace(/potrait/gi, 'portrait');
    if (p === '/portrait' || p === '/portrait/') p = '/portraits/';
    if (p === '/portraits') p = '/portraits/';
    if (p === '/contact') p = '/contact/';
    if (p === '/notes') p = '/notes/';
    if (p === '/work') p = '/work/';
    if (p === '/media') p = '/media/';
    if (p === '/playground') p = '/playground/';
    if (p === '/crates') p = '/crates/';
    if (p === '/app') p = '/app/';
    return p;
  }
  LFF.normalizeInternalPath = normalizeInternalPath;

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

  const THEME_KEY = 'lff-theme';
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
  }
  function initTheme() {
    try { localStorage.removeItem(THEME_KEY); } catch(_) {}
    applyTheme("dark");
  }
  LFF.applyTheme = applyTheme;

  function normalizeHookLink(href, fallbackInternal='/crates/') {
    const h = String(href || '').trim();
    if (!h) return '';
    if (/^crate:\/\//i.test(h)) {
      return `${fallbackInternal}?hook=${encodeURIComponent(h)}`;
    }
    if (/^spotify:\/\//i.test(h)) {
      const rest = h.replace(/^spotify:\/\//i, '');
      const parts = rest.split('/');
      if (parts.length >= 2) return `https://open.spotify.com/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}`;
      return h;
    }
    return normalizeExternalLink(h);
  }

  function normalizeMedia(media) {
    if (!media) return [];
    if (Array.isArray(media)) return media;
    return [media];
  }

  function renderMedia(media) {
    const arr = normalizeMedia(media);
    if (!arr.length) return '';
    const items = arr.map((m) => {
      if (typeof m === 'string') {
        return `<a class="chip" href="${escapeHTML(m)}" target="_blank" rel="noopener">media</a>`;
      }
      if (m && typeof m === 'object') {
        const type = (m.type || 'link').toLowerCase();
        const srcRaw = m.src || m.url || '';
        const src = srcRaw.startsWith('/') ? normalizeInternalPath(srcRaw) : (srcRaw ? normalizeExternalLink(srcRaw) : '');
        const title = m.title || m.label || type;
        if (!src) return '';
        if (type === 'image') {
          return `<figure class="media-figure"><img class="media-img" src="${escapeHTML(src)}" alt="${escapeHTML(title)}" loading="lazy" />${title ? `<figcaption class="small muted">${escapeHTML(title)}</figcaption>` : ''}</figure>`;
        }
        return `<a class="chip" href="${escapeHTML(src)}" target="_blank" rel="noopener">${escapeHTML(title)}</a>`;
      }
      return '';
    }).join(' ');
    return `<div class="chips media-chips">${items}</div>`;
  }

  function defaultHref(kind) {
    switch (kind) {
      case 'note':
      case 'notes': return '/notes/';
      case 'project':
      case 'projects': return '/work/';
      case 'experiment':
      case 'experiments': return '/playground/';
      case 'media': return '/media/';
      case 'card':
      case 'cards':
      case 'portrait':
      case 'portraits': return '/portraits/';
      case 'link':
      case 'links': return '';
      default: return '';
    }
  }

  function renderSmartChips(item) {
    const chips = [];
    const addChip = (label, href, mode='auto') => {
      const safe = String(href || '').trim();
      const isExternal = /^https?:\/\//i.test(safe);
      if (!safe) {
        chips.push(`<span class="chip chip--disabled" aria-disabled="true">${escapeHtml(label)}</span>`);
        return;
      }
      const target = (mode === 'newtab' || (mode === 'auto' && isExternal)) ? ` target="_blank" rel="noopener"` : '';
      chips.push(`<a class="chip" href="${escapeHtml(safe)}"${target}>${escapeHtml(label)}</a>`);
    };
    const ph = item.playlist_hook || item.playlist || item.playlist_url;
    addChip('playlist', ph ? normalizeHookLink(ph, '/crates/') : '');
    const seed = item.track_seed || item.seed || item.track || '';
    addChip('seed', seed ? normalizeHookLink(seed, '/crates/') : '');
    const file = item.file || item.filename || item.asset || '';
    const fileHref = file ? (String(file).startsWith('/') || /^https?:\/\//i.test(String(file))
      ? (String(file).startsWith('/') ? normalizeInternalPath(String(file)) : normalizeExternalLink(String(file)))
      : `/media/${String(file)}`) : '';
    addChip('file', fileHref);
    return `<div class="chips smart-chips">${chips.join(' ')}</div>`;
  }

  function cardHTML(item, kind) {
    const title = escapeHtml(item.title || '');
    const desc  = escapeHtml(item.desc || '');
    const rawHref = (item.path || item.href || defaultHref(kind) || '').trim();
    const href = rawHref.startsWith('/') ? normalizeInternalPath(rawHref) : rawHref;
    const hrefAttr = href ? ` data-href="${escapeHtml(href)}" role="link" tabindex="0"` : '';
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const tagsHtml = tags.length ? `<div class="tags">${tags.map(t => `<span class="tag">${escapeHtml(String(t))}</span>`).join('')}</div>` : '';
    const links = Array.isArray(item.links) ? item.links : [];
    const linksHtml = links.length ? `<div class="card-links">${links.map(l => {
      const lhRaw = (l && l.href) ? String(l.href) : '';
      const lh = lhRaw.startsWith('/') ? normalizeInternalPath(lhRaw) : normalizeExternalLink(lhRaw);
      const ll = escapeHtml((l && (l.label || l.title)) ? String(l.label || l.title) : 'link');
      const isExt = /^https?:\/\//i.test(lh);
      const target = isExt ? ' target="_blank" rel="noopener"' : '';
      return `<a class="chip-link" href="${escapeHtml(lh)}"${target}>${ll}</a>`;
    }).join('')}</div>` : '';
    return `<div class="card"${hrefAttr}><div class="card-title">${title}</div>${desc ? `<div class="card-desc">${desc}</div>` : ''}${renderSmartChips(item)}${linksHtml}${renderMedia(item.media)}${tagsHtml}</div>`;
  }

  function renderInto(container, items, kind) {
    if (!container) return;
    if (!Array.isArray(items) || !items.length) {
      container.innerHTML = `<div class="card"><strong>Nothing yet.</strong><div class="small muted">Add items in /data/*.json</div></div>`;
      return;
    }
    container.innerHTML = items.map(it => cardHTML(it, kind)).join('');
  }

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
      items.sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
      renderInto(container, items, 'note');
    } catch (e) {
      if (container) container.innerHTML = `<div class="card error"><strong>Couldn't load notes.json</strong><div class="small muted">${escapeHTML(e.message)}</div></div>`;
    }
  }

  async function renderPortraits(opts={}) {
    const container = $(opts.container || '#portraitsList');
    try {
      const data = await getJSON('/data/portraits.json');
      const items = Array.isArray(data) ? data : (data.cards || data.portraits || []);
      items.sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
      renderInto(container, items, 'portrait');
    } catch (e) {
      if (container) container.innerHTML = `<div class="card error"><strong>Couldn't load portraits.json</strong><div class="small muted">${escapeHTML(e.message)}</div></div>`;
    }
  }

  LFF.renderProjects = renderProjects;
  LFF.renderExperiments = renderExperiments;
  LFF.renderLinks = renderLinks;
  LFF.renderNotes = renderNotes;
  LFF.renderPortraits = renderPortraits;

  async function renderNewDrop() {
    const feed = $('#newDrop');
    if (!feed) return;
    try {
      const [projects, experiments, notes, portraits] = await Promise.all([
        getJSON('/data/projects.json').catch(() => []),
        getJSON('/data/experiments.json').catch(() => []),
        getJSON('/data/notes.json').catch(() => []),
        getJSON('/data/portraits.json').catch(() => []),
      ]);
      const arr = []
        .concat(Array.isArray(projects)?projects:(projects.projects||[])).map(x=>({...x,_kind:'project'}))
        .concat(Array.isArray(experiments)?experiments:(experiments.experiments||[])).map(x=>({...x,_kind:'experiment'}))
        .concat(Array.isArray(notes)?notes:(notes.notes||[])).map(x=>({...x,_kind:'note'}))
        .concat(Array.isArray(portraits)?portraits:((portraits.cards||portraits.portraits||[]))).map(x=>({...x,_kind:'portrait'}));
      arr.sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
      feed.innerHTML = arr.slice(0, 8).map(it => cardHTML(it, it._kind)).join('');
    } catch (e) {
      feed.innerHTML = `<div class="card error"><strong>Couldn't load New Drop</strong><div class="small muted">${escapeHTML(e.message)}</div></div>`;
    }
  }

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

  const IS_DRAFT = (() => {
    const sp = new URLSearchParams(location.search);
    if (sp.has('draft')) return true;
    try { return localStorage.getItem('LFF_DRAFT') === '1'; } catch (_) { return false; }
  })();

  function hideDraftUIIfNeeded() {
    if (IS_DRAFT) return;
    const selectors = ['input[type="file"]','#filePicker','#dropzone','.dropzone','.dz','.dz-wrap'];
    document.querySelectorAll(selectors.join(',')).forEach((el) => {
      const container = el.closest('.dropzone, .dz, .dz-wrap, section, .card, .panel') || el;
      container.style.display = 'none';
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
    let lastNav = { href: '', t: 0 };
    const go = (href) => {
      if (!href) return;
      const h = String(href).trim();
      const now = Date.now();
      if (lastNav.href === h && (now - lastNav.t) < 600) return;
      lastNav = { href: h, t: now };
      const isExternal = /^https?:\/\//i.test(h);
      if (isExternal) {
        window.open(h, '_blank', 'noopener');
        return;
      }
      window.location.href = h;
    };
    const handler = (e) => {
      const card = e.target.closest('.card[data-href]');
      if (!card) return;
      const interactive = e.target.closest('a,button,input,textarea,select,label,[role="button"]');
      if (interactive && card.contains(interactive) && interactive !== card) {
        if (interactive.tagName === 'A') {
          const hrefAttr = (interactive.getAttribute('href') || '').trim();
          if (hrefAttr && hrefAttr !== '#') return;
        } else {
          return;
        }
      }
      const href = card.getAttribute('data-href');
      if (!href) return;
      e.preventDefault();
      e.stopPropagation();
      go(href);
    };
    root.addEventListener('click', handler, { passive: false, capture: true });
    root.addEventListener('touchend', handler, { passive: false, capture: true });
    root.addEventListener('pointerup', handler, { passive: false, capture: true });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.card[data-href]');
      if (!card) return;
      if (e.target !== card) return;
      e.preventDefault();
      go(card.getAttribute('data-href'));
    }, true);
  }

  async function initByPage() {
    const page = document.body.getAttribute('data-page') || '';
    if (page === 'hub') {
      await Promise.all([
        renderProjects({container:'#projectsGrid'}),
        renderExperiments({container:'#experimentsGrid'}),
        renderLinks({container:'#linksGrid'}),
        renderNewDrop(),
      ]);
      return;
    }
    if (page === 'work') { await renderProjects({container:'#projectsList'}); return; }
    if (page === 'media') { await renderProjects({container:'#mediaList', filterKind:'media'}); return; }
    if (page === 'crates') { renderCrates(); return; }
    if (page === 'notes') { await renderNotes({container:'#notesList'}); return; }
    if (page === 'portraits' || page === 'cards') { await renderPortraits({container:'#portraitsList'}); return; }
  }

  function showDebugBadge() {
    const qs = new URLSearchParams(location.search);
    if (qs.get('debug') !== '1') return;
    const el = document.createElement('div');
    el.id = 'debugBadge';
    el.textContent = `LFF ${LFF_BUILD}`;
    el.style.cssText = ['position:fixed','right:10px','bottom:10px','z-index:9999','padding:6px 10px','border-radius:999px','font:12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial','background:rgba(0,0,0,.75)','color:#fff','border:1px solid rgba(255,255,255,.15)','backdrop-filter:saturate(140%) blur(6px)'].join(';');
    document.body.appendChild(el);
  }

  async function debugSelfTest() {
    const qs = new URLSearchParams(location.search);
    if (qs.get('debug') !== '1') return;
    const badge = $('#debugBadge');
    const report = [];
    const probes = [['/data/projects.json','projects'],['/data/experiments.json','experiments'],['/data/links.json','links'],['/data/notes.json','notes'],['/data/portraits.json','portraits']];
    for (const [p, key] of probes) {
      try {
        const data = await getJSON(p);
        const arr = Array.isArray(data) ? data : (data[key] || data.cards || data.portraits || []);
        report.push(`${key}:${arr.length}`);
      } catch (e) {
        report.push(`${key}:ERR`);
      }
    }
    console.log('[LFF debug] self-test:', report.join(' | '));
    if (badge) badge.textContent = `LFF ${LFF_BUILD} • ${report.join(' ')}`;
  }

  function injectLinkSpacingCSS() {
    if (document.getElementById('lffLinkSpacing')) return;
    const s = document.createElement('style');
    s.id = 'lffLinkSpacing';
    s.textContent = `
      .subLinks a{ margin-right:12px; display:inline-block; }
      .chips{ display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
      .chip{ display:inline-block; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,255,255,.16); }
      .media-figure{ margin:10px 0 0; }
      .media-img{ max-width:100%; border-radius:12px; display:block; }
    `;
    document.head.appendChild(s);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    injectLinkSpacingCSS();
    showDebugBadge();
    await includePartials();
    ensureCratesNavLink();
    hideDraftUIIfNeeded();
    await initByPage();
    wireCardClicks(document);
    hideDraftUIIfNeeded();
    await debugSelfTest();
  });
})();
