/* LETFISHFUCK — assets/js/app.js shim
   This file should never become a second engine.
   It only forwards old references to /js/app.js
*/
(() => {
  if (window.__LFF_ENGINE_SHIM__) return;
  window.__LFF_ENGINE_SHIM__ = true;

  const alreadyLoaded = Array.from(document.scripts).some((s) => /\/js\/app\.js(\?|$)/.test(s.src || ''));
  if (alreadyLoaded && window.LFF) return;

  const s = document.createElement('script');
  s.src = '/js/app.js?v=20';
  s.defer = true;
  s.dataset.lffShim = '1';
  document.head.appendChild(s);
})();
