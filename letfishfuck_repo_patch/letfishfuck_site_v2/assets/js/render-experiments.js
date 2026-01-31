(() => {
  window.LFF = window.LFF || {};

  function tile(item){
    const tags = (item.tags || []).slice(0,6).map(t => `<span class="tag">${t}</span>`).join("");
    const href = item.href || "#";
    const cta = href.startsWith("http")
      ? `<a class="btn primary" href="${href}" target="_blank" rel="noreferrer">Open</a>`
      : `<a class="btn primary" href="${href}">Open</a>`;
    return `
      <div class="tile">
        <h3>${item.title || "Untitled experiment"}</h3>
        <p>${item.description || ""}</p>
        <div class="tags">${tags}</div>
        <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
          ${cta}
          ${item.status ? `<span class="tag">${item.status}</span>` : ""}
        </div>
      </div>
    `;
  }

  async function renderExperiments({targetId="experimentsGrid"} = {}){
    const grid = document.getElementById(targetId);
    if(!grid) return;
    let items = [];
    try{ items = await window.LFF.getJSON("/data/experiments.json"); }
    catch(e){
      grid.innerHTML = `<div class="tile"><h3>Couldn't load experiments.json</h3><p class="muted">${String(e)}</p></div>`;
      return;
    }
    if(!items.length){
      grid.innerHTML = `<div class="tile"><h3>Nothing here yet.</h3><p class="muted">Add items to <code>/data/experiments.json</code>.</p></div>`;
      return;
    }
    grid.innerHTML = items.map(tile).join("");
  }

  window.LFF.renderExperiments = renderExperiments;
})();