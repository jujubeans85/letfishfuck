/* LFF shim (assets/js/app.js)
   Purpose: catch any pages still loading /assets/js/app.js and forward to /js/app.js.
   Prevents split-brain paths.
*/
(() => {
  'use strict';
  const V = 'v13';
  const target = `/js/app.js?v=${encodeURIComponent(V)}`;
  const s = document.createElement('script');
  s.src = target;
  s.defer = true;
  s.dataset.lffShim = '1';
  document.head.appendChild(s);
})();
