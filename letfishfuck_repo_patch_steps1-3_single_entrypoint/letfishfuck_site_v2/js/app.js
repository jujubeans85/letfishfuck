/*
  Deprecated loader path: /js/app.js
  Safety net: if any old page still references /js/app.js, we forward to /assets/js/app.js
*/
(() => {
  if (window.__LFF_APP_INITED) return;
  const s = document.createElement("script");
  s.src = "/assets/js/app.js";
  s.defer = true;
  document.head.appendChild(s);
})();
