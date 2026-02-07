/* LETFISHFUCK v2 — keep it simple, ship it */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);

  // Theme
  const modeBtn = $("#modeBtn");
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

  modeBtn?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    toast(next === "dark" ? "Dark mode" : "Light mode");
  });

  // Copy helpers
  const SITE_URL = "https://letfishfuck.netlify.app/";
  const EMAIL = "arts-internships-info@unimelb.edu.au";

  $("#copyLink")?.addEventListener("click", async () => {
    await copyToClipboard(SITE_URL);
    toast("Copied site link");
  });

  $("#copyEmail")?.addEventListener("click", async () => {
    await copyToClipboard(EMAIL);
    toast("Copied email");
  });

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // iOS fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  // Toast
  const toastEl = $("#toast");
  let toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1400);
  }

  // Drag & drop previews
  const dz = $("#dropzone");
  const picker = $("#filePicker");
  const previews = $("#previews");

  const addFiles = (fileList) => {
    if (!previews) return;
    [...fileList].forEach((file) => previews.appendChild(makePreviewCard(file)));
    toast("Added preview cards");
  };

  dz?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dz.classList.add("dragover");
  });
  dz?.addEventListener("dragleave", () => dz.classList.remove("dragover"));
  dz?.addEventListener("drop", (e) => {
    e.preventDefault();
    dz.classList.remove("dragover");
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });

  dz?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      picker?.click();
    }
  });

  picker?.addEventListener("change", (e) => {
    const files = e.target.files;
    if (files?.length) addFiles(files);
    picker.value = "";
  });

  function makePreviewCard(file) {
    const card = document.createElement("div");
    card.className = "preview";

    const meta = document.createElement("div");
    meta.className = "meta";

    const left = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = file.name;

    const type = document.createElement("div");
    type.className = "type";
    type.textContent = humanType(file);

    left.appendChild(name);
    left.appendChild(type);

    const right = document.createElement("button");
    right.className = "x";
    right.type = "button";
    right.textContent = "Remove";
    right.addEventListener("click", () => card.remove());

    meta.appendChild(left);
    meta.appendChild(right);

    const thumb = document.createElement("div");
    thumb.className = "thumb";

    // Render
    if (file.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.alt = file.name;
      img.loading = "lazy";
      img.src = URL.createObjectURL(file);
      thumb.appendChild(img);
    } else if (file.type.startsWith("audio/")) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = URL.createObjectURL(file);
      thumb.appendChild(audio);
    } else if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const iframe = document.createElement("iframe");
      iframe.title = file.name;
      iframe.src = URL.createObjectURL(file);
      thumb.appendChild(iframe);
    } else {
      const p = document.createElement("div");
      p.style.padding = "14px";
      p.style.color = "var(--muted)";
      p.textContent = "Preview not supported — keep it, we’ll place it tomorrow.";
      thumb.appendChild(p);
    }

    card.appendChild(meta);
    card.appendChild(thumb);

    const actions = document.createElement("div");
    actions.className = "actions";

    const open = document.createElement("a");
    open.className = "btn ghost";
    open.href = URL.createObjectURL(file);
    open.target = "_blank";
    open.rel = "noopener";
    open.textContent = "Open";

    actions.appendChild(open);
    card.appendChild(actions);

    return card;
  }

  function humanType(file) {
    if (file.type.startsWith("image/")) return "Image";
    if (file.type.startsWith("audio/")) return "Audio";
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "PDF";
    return file.type ? file.type : "File";
  }
})();
