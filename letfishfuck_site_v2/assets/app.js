// LFF shim (keeps old pages alive if they still load /assets/js/app.js)
// Prefer loading ONLY /js/app.js everywhere. This file just forwards once.
(() => {
  if (window.__LFF_SHIM_LOADED__) return;
  window.__LFF_SHIM_LOADED__ = true;

  // If /js/app.js already ran, bail.
  if (window.LFF && window.LFF.BUILD) return;

  const s = document.createElement('script');
  s.src = '/js/app.js?v=14';
  s.defer = true;
  document.head.appendChild(s);
})();
