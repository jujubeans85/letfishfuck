/* LFF shim: keep old references alive without split-brain */
(function(){
  if (window.__LFF_APPJS_LOADED__) return;
  window.__LFF_APPJS_LOADED__ = true;
  var s = document.createElement('script');
  s.src = '/js/app.js?v=12';
  s.defer = true;
  document.head.appendChild(s);
})();
