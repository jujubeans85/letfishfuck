(() => {
  window.LFF = window.LFF || {};

  function tagHTML(t){ return `<span class="tag">${String(t)}</span>`; }

  function tile(item){
    const href = item.href || "#";
    const tags = (item.tags || []).slice(0,6).map(tagHTML).join("");
    const meta = item.year ? `<span class="tag">${item.year}</span>` : "";
    const cta = href.startsWith("http")
      ? `<a class="btn primary" href="${href}" target="_blank" rel="noreferrer">Open</a>`
      : `<a class="btn primary" href="${href}">Open</a>`;

    return `
      <div class="tile">
        <h3>${item.title || "Untitled"}</h3>
        <p>${item.description || ""}</p>
        <div class="tags">${meta}${tags}</div>
        <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
          ${cta}
          ${item.source ? `<a class="btn ghost" href="${item.source}" target="_blank" rel="noreferrer">Source</a>` : ""}
        </div>
      </div>
    `;
  }

  async function renderProjects({targetId="projectsGrid", filter} = {}){
    const grid = document.getElementById(targetId);
    if(!grid) return;
    let items = [];
    try{ items = await window.LFF.getJSON("/data/projects.json"); }
    catch(e){
      grid.innerHTML = `<div class="tile"><h3>Couldn't load projects.json</h3><p class="muted">${String(e)}</p></div>`;
      return;
    }

    if(filter?.kind){
      const k = String(filter.kind).toLowerCase();
      items = items.filter(x => String(x.kind || "").toLowerCase() === k);
    }

    if(!items.length){
      grid.innerHTML = `<div class="tile"><h3>Nothing here yet.</h3><p class="muted">Add items to <code>/data/projects.json</code>.</p></div>`;
      return;
    }

    grid.innerHTML = items.map(tile).join("");
  }

  async function renderLinks(){
    const grid = document.getElementById("linksGrid");
    if(!grid) return;
    let items = [];
    try{ items = await window.LFF.getJSON("/data/links.json"); }
    catch(e){
      grid.innerHTML = `<div class="tile"><h3>Couldn't load links.json</h3><p class="muted">${String(e)}</p></div>`;
      return;
    }

    grid.innerHTML = items.map(x => `
      <div class="tile">
        <h3>${x.title || "Link"}</h3>
        <p>${x.description || ""}</p>
        <a class="btn primary" href="${x.href}" target="_blank" rel="noreferrer">Open</a>
      </div>
    `).join("");
  }

  window.LFF.renderProjects = renderProjects;
  window.LFF.renderLinks = renderLinks;

  window.LFF.renderHome = async function(){
    await renderProjects({targetId:"projectsGrid"});
    if(window.LFF.renderExperiments) await window.LFF.renderExperiments({targetId:"experimentsGrid"});
    await renderLinks();
  };
})();