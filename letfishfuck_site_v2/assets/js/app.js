// Shim loader — keep legacy pages alive if they still reference /assets/js/app.js
// Single source of truth is /js/app.js
(function(){
  if (document.querySelector('script[data-lff-main]')) return;
  var s=document.createElement('script');
  s.src='/js/app.js';
  s.defer=true;
  s.setAttribute('data-lff-main','1');
  document.head.appendChild(s);
})();
