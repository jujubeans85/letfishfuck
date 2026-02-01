(() => {
  window.LFF = window.LFF || {};
  const root = document.documentElement;

  function setTheme(next){
    root.setAttribute("data-theme", next);
    try{ localStorage.setItem("theme", next); }catch{}
  }
  function getTheme(){
    try{ return localStorage.getItem("theme"); }catch{ return null; }
  }

  const saved = getTheme();
  if (saved === "dark" || saved === "light") setTheme(saved);

  function bindThemeButtons(){
    document.querySelectorAll("#modeBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const current = root.getAttribute("data-theme") || "dark";
        setTheme(current === "dark" ? "light" : "dark");
      });
    });
  }

  async function includePartials(){
    const nodes = document.querySelectorAll("[data-include]");
    if (!nodes.length) { bindThemeButtons(); return; }
    await Promise.all([...nodes].map(async (node) => {
      const url = node.getAttribute("data-include");
      if(!url) return;
      try{
        const res = await fetch(url, { cache: "no-store" });
        if(!res.ok) throw new Error("HTTP " + res.status);
        node.innerHTML = await res.text();
      }catch(e){
        node.innerHTML = `<div class="wrap"><div class="tile">Couldn't load partial: <code>${url}</code></div></div>`;
      }
    }));
    bindThemeButtons();
  }

  async function getJSON(url){
    const res = await fetch(url, { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }
  window.LFF.getJSON = getJSON;

  includePartials();

  // iOS tap hardening
  document.addEventListener("touchstart", () => {}, { passive: true });
})();