/*
  LETFISHFUCK — single JS entrypoint (assets/js/app.js)
  No-build static engine. This replaces the old loader that injected /js/app.js.

  Design rules:
  - One source of truth: pages should only load /assets/js/app.js
  - Boot-guard (no double init)
  - Flexible selectors (won't break if markup shifts a little)
  - Notes: media is an ARRAY (strings or typed objects). Strings are auto-typed.
*/

(() => {
  'use strict';

  // Boot-guard: prevents double-init if multiple script tags exist.
  if (window.__LFF_APP_INIT__) return;
  window.__LFF_APP_INIT__ = true;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const log = (...args) => {
    // Flip to true while debugging locally if you want.
    const DEBUG = false;
    if (DEBUG) console.log('[LFF]', ...args);
  };

  const safeText = (v) => (v == null ? '' : String(v));
  const escapeHtml = (s) =>
    safeText(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const toArray = (v) => {
    if (v == null) return [];
    if (Array.isArray(v)) return v;
    return [v];
  };

  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

  const fetchText = async (path) => {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed ${res.status} ${path}`);
    return await res.text();
  };

  const fetchJSON = async (path) => {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed ${res.status} ${path}`);
    return await res.json();
  };

  const parseDate = (v) => {
    // Accept ISO strings, epoch ms, epoch sec, or Date-ish.
    if (v == null) return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v;
    if (typeof v === 'number') {
      const ms = v < 2_000_000_000 ? v * 1000 : v;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof v === 'string') {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const bestDate = (obj) => {
    const keys = ['date', 'updated', 'created', 'when', 'timestamp', 'time'];
    for (const k of keys) {
      if (obj && obj[k] != null) {
        const d = parseDate(obj[k]);
        if (d) return d;
      }
    }
    return null;
  };

  const formatDate = (d) => {
    if (!d) return '';
    try {
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    } catch {
      return d.toISOString().slice(0, 10);
    }
  };

  const guessMediaType = (url) => {
    const u = safeText(url).split('?')[0].toLowerCase();
    if (u.match(/\.(png|jpe?g|gif|webp|avif|svg)$/)) return 'image';
    if (u.match(/\.(mp3|wav|m4a|aac|ogg)$/)) return 'audio';
    if (u.match(/\.(mp4|webm|mov|m4v)$/)) return 'video';
    if (u.match(/\.(pdf)$/)) return 'pdf';
    return 'link';
  };

  const mediaNode = (entry) => {
    // entry can be a string URL or object {type, src, title, caption, href}
    if (!entry) return null;

    let type, src, title, caption, href;

    if (typeof entry === 'string') {
      src = entry;
      type = guessMediaType(entry);
    } else if (typeof entry === 'object') {
      type = entry.type || (entry.src ? guessMediaType(entry.src) : 'link');
      src = entry.src || entry.url || entry.href || '';
      title = entry.title || '';
      caption = entry.caption || '';
      href = entry.href || entry.url || '';
    } else {
      return null;
    }

    const wrap = document.createElement('div');
    wrap.className = 'note-media';

    const addCaption = () => {
      const t = safeText(title).trim();
      const c = safeText(caption).trim();
      if (!t && !c) return;
      const cap = document.createElement('div');
      cap.className = 'note-media-caption';
      cap.innerHTML = [
        t ? `<div class="note-media-title">${escapeHtml(t)}</div>` : '',
        c ? `<div class="note-media-text">${escapeHtml(c)}</div>` : '',
      ].join('');
      wrap.appendChild(cap);
    };

    if (type === 'image' && src) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = title || 'image';
      img.src = src;
      wrap.appendChild(img);
      addCaption();
      return wrap;
    }

    if (type === 'audio' && src) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = src;
      wrap.appendChild(audio);
      addCaption();
      return wrap;
    }

    if (type === 'video' && src) {
      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.src = src;
      wrap.appendChild(video);
      addCaption();
      return wrap;
    }

    // pdf/link fallback
    const a = document.createElement('a');
    a.className = 'note-media-link';
    a.href = href || src || '#';
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = title || src || href || 'link';
    wrap.appendChild(a);
    addCaption();
    return wrap;
  };

  // Theme (simple, non-invasive)
  const applyTheme = (theme) => {
    const t = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    localStorage.setItem('lff_theme', t);
  };

  const initTheme = () => {
    const stored = localStorage.getItem('lff_theme');
    if (stored) applyTheme(stored);

    const btn =
      document.querySelector('[data-theme-toggle]') ||
      document.getElementById('themeToggle');

    if (btn) {
      btn.addEventListener('click', () => {
        const current = document.documentElement.dataset.theme || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    }
  };

  // Partials (header/footer) if placeholders exist
  const loadPartials = async () => {
    const headerHost =
      document.getElementById('siteHeader') ||
      document.querySelector('[data-partial="header"]');
    const footerHost =
      document.getElementById('siteFooter') ||
      document.querySelector('[data-partial="footer"]');

    const jobs = [];
    if (headerHost) {
      jobs.push(
        fetchText('/partials/header.html')
          .then((html) => {
            headerHost.innerHTML = html;
          })
          .catch((e) => log('header partial fail', e))
      );
    }
    if (footerHost) {
      jobs.push(
        fetchText('/partials/footer.html')
          .then((html) => {
            footerHost.innerHTML = html;
          })
          .catch((e) => log('footer partial fail', e))
      );
    }
    await Promise.all(jobs);
  };

  const card = ({ title, meta, body, tags, link, media }) => {
    const el = document.createElement('article');
    el.className = 'card';

    const h = document.createElement('div');
    h.className = 'card-head';

    const t = document.createElement('h3');
    t.className = 'card-title';
    t.innerHTML = escapeHtml(title || '');

    const m = document.createElement('div');
    m.className = 'card-meta';
    m.innerHTML = escapeHtml(meta || '');

    h.appendChild(t);
    if (meta) h.appendChild(m);
    el.appendChild(h);

    if (body) {
      const b = document.createElement('div');
      b.className = 'card-body';
      // allow simple line breaks
      b.innerHTML = escapeHtml(body).replaceAll('\n', '<br>');
      el.appendChild(b);
    }

    const tagList = uniq(toArray(tags).flatMap((x) => (typeof x === 'string' ? x.split(',') : [x])))
      .map((x) => safeText(x).trim())
      .filter(Boolean);

    if (tagList.length) {
      const tl = document.createElement('div');
      tl.className = 'card-tags';
      tl.innerHTML = tagList.map((tg) => `<span class="tag">${escapeHtml(tg)}</span>`).join('');
      el.appendChild(tl);
    }

    const mediaArr = toArray(media);
    if (mediaArr.length) {
      const mw = document.createElement('div');
      mw.className = 'card-media';
      for (const me of mediaArr) {
        const node = mediaNode(me);
        if (node) mw.appendChild(node);
      }
      el.appendChild(mw);
    }

    if (link) {
      const a = document.createElement('a');
      a.className = 'card-link';
      a.href = link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Open';
      el.appendChild(a);
    }

    return el;
  };

  const findHost = (candidates) => {
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  };

  const renderList = (host, items, mapper) => {
    if (!host || !Array.isArray(items)) return;
    host.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const it of items) frag.appendChild(mapper(it));
    host.appendChild(frag);
  };

  const renderProjects = async () => {
    const host = findHost([
      '#projectsList',
      '#projects',
      '[data-list=\"projects\"]',
      '.projects-grid',
    ]);
    if (!host) return;

    const data = await fetchJSON('/data/projects.json');
    const items = Array.isArray(data) ? data : (data.items || []);
    renderList(host, items, (p) => {
      const d = bestDate(p);
      const title = p.title || p.name || 'Untitled';
      const meta = [p.role || '', p.stack || '', d ? formatDate(d) : ''].filter(Boolean).join(' • ');
      const body = p.description || p.desc || p.summary || '';
      const tags = p.tags || p.tag || [];
      const link = p.link || p.url || '';
      const media = p.media || [];
      return card({ title, meta, body, tags, link, media });
    });
  };

  const renderExperiments = async () => {
    const host = findHost([
      '#experimentsList',
      '#experiments',
      '[data-list=\"experiments\"]',
      '.experiments-grid',
    ]);
    if (!host) return;

    const data = await fetchJSON('/data/experiments.json');
    const items = Array.isArray(data) ? data : (data.items || []);
    renderList(host, items, (p) => {
      const d = bestDate(p);
      const title = p.title || p.name || 'Untitled';
      const meta = [p.status || '', d ? formatDate(d) : ''].filter(Boolean).join(' • ');
      const body = p.description || p.desc || p.summary || '';
      const tags = p.tags || p.tag || [];
      const link = p.link || p.url || '';
      const media = p.media || [];
      return card({ title, meta, body, tags, link, media });
    });
  };

  const renderLinks = async () => {
    const host = findHost([
      '#linksList',
      '#links',
      '[data-list=\"links\"]',
      '.links-grid',
    ]);
    if (!host) return;

    const data = await fetchJSON('/data/links.json');
    const items = Array.isArray(data) ? data : (data.items || []);
    renderList(host, items, (l) => {
      const title = l.title || l.name || l.label || 'Link';
      const meta = l.category || '';
      const body = l.description || l.desc || '';
      const link = l.href || l.url || l.link || '';
      const tags = l.tags || [];
      return card({ title, meta, body, tags, link });
    });
  };

  const renderNotes = async () => {
    const host = findHost([
      '#notesList',
      '#notes',
      '[data-list=\"notes\"]',
      '.notes-grid',
    ]);
    if (!host) return;

    const data = await fetchJSON('/data/notes.json');
    const itemsRaw = Array.isArray(data) ? data : (data.items || []);

    // enforce array for media, but accept old string (coerce)
    const items = itemsRaw.map((n) => ({
      ...n,
      media: toArray(n.media),
    }));

    // newest first if any dates
    items.sort((a, b) => {
      const da = bestDate(a);
      const db = bestDate(b);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });

    renderList(host, items, (n) => {
      const d = bestDate(n);
      const title = n.title || n.name || 'Note';
      const meta = [
        n.mood ? `mood: ${safeText(n.mood)}` : '',
        d ? formatDate(d) : '',
      ].filter(Boolean).join(' • ');
      const body = n.body || n.text || n.content || n.note || '';
      const tags = n.tags || [];
      const link = n.link || n.url || '';
      const media = n.media || [];
      return card({ title, meta, body, tags, link, media });
    });
  };

  const renderNewDrop = async () => {
    const host = findHost([
      '#newDrop',
      '#new-drop',
      '[data-feed=\"newdrop\"]',
      '[data-list=\"newdrop\"]',
    ]);
    if (!host) return;

    const [projects, experiments, notes] = await Promise.all([
      fetchJSON('/data/projects.json').catch(() => []),
      fetchJSON('/data/experiments.json').catch(() => []),
      fetchJSON('/data/notes.json').catch(() => []),
    ]);

    const normalize = (arr, type) => {
      const items = Array.isArray(arr) ? arr : (arr.items || []);
      return items.map((x) => ({
        type,
        raw: x,
        date: bestDate(x),
        title: x.title || x.name || type,
        link:
          x.link ||
          x.url ||
          // notes route guess: /app/notes (pretty) or /app/notes.html
          (type === 'note' ? '/app/notes' : ''),
        tags: x.tags || [],
        media: toArray(x.media),
        body: x.description || x.desc || x.summary || x.body || x.text || '',
      }));
    };

    const feed = [
      ...normalize(projects, 'project'),
      ...normalize(experiments, 'experiment'),
      ...normalize(notes, 'note'),
    ];

    feed.sort((a, b) => {
      const ta = a.date ? a.date.getTime() : 0;
      const tb = b.date ? b.date.getTime() : 0;
      return tb - ta;
    });

    const top = feed.slice(0, 9);

    host.innerHTML = '';
    const frag = document.createDocumentFragment();

    for (const item of top) {
      const meta = [
        item.type.toUpperCase(),
        item.date ? formatDate(item.date) : '',
      ].filter(Boolean).join(' • ');

      frag.appendChild(
        card({
          title: item.title,
          meta,
          body: item.body,
          tags: item.tags,
          link: item.link,
          media: item.media,
        })
      );
    }

    host.appendChild(frag);
  };

  const init = async () => {
    initTheme();

    // Partials are optional; don't die if missing.
    await loadPartials();

    // Renderers are opportunistic: they only run if their host exists on the page.
    await Promise.all([
      renderProjects().catch((e) => log('projects fail', e)),
      renderExperiments().catch((e) => log('experiments fail', e)),
      renderLinks().catch((e) => log('links fail', e)),
      renderNotes().catch((e) => log('notes fail', e)),
      renderNewDrop().catch((e) => log('newdrop fail', e)),
    ]);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
