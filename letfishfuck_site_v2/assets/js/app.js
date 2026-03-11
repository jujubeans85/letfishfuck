/* LETFISHFUCK shim — only for old pages still pointing at /assets/js/app.js */
(() => {
  'use strict';
  if (window.__LFF_SHIM_LOADED__) return;
  window.__LFF_SHIM_LOADED__ = true;
  const s = document.createElement('script');
  s.src = '/js/app.js?v=19';
  s.defer = true;
  document.head.appendChild(s);
})();
