/* media/media.js
   - Theme toggle (shared behaviour, but page-local)
   - Drag/drop MP4 preview cards
   - Safe: no-ops if elements aren't present
*/

(function () {
  const root = document.documentElement;

  // -------------------------
  // Theme toggle (dark/light)
  // -------------------------
  const modeBtn = document.getElementById("modeBtn");

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch (_) {}
  }

  function getSavedTheme() {
    try { return localStorage.getItem("theme"); } catch (_) { return null; }
  }

  const saved = getSavedTheme();
  if (saved === "dark" || saved === "light") applyTheme(saved);

  if (modeBtn) {
    modeBtn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "dark";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  // -------------------------
  // Media dropzone previews
  // -------------------------
  const dropzone = document.getElementById("dropzone");
  const picker = document.getElementById("filePicker");
  const previews = document.getElementById("previews");

  if (!dropzone || !picker || !previews) return;

  const MAX_FILES = 24;

  function isMp4(file) {
    const name = (file.name || "").toLowerCase();
    const type = (file.type || "").toLowerCase();
    return type.includes("mp4") || name.endsWith(".mp4");
  }

  function prettySize(bytes) {
    if (!Number.isFinite(bytes)) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  function createPreviewCard(file) {
    const url = URL.createObjectURL(file);

    const card = document.createElement("div");
    card.className = "preview";

    const meta = document.createElement("div");
    meta.className = "meta";

    const left = document.createElement("div");
    left.innerHTML = `
      <div class="name">${escapeHtml(file.name || "untitled.mp4")}</div>
      <div class="type">mp4 • ${prettySize(file.size)}</div>
    `;

    const xWrap = document.createElement("div");
    const x = document.createElement("button");
    x.className = "x";
    x.type = "button";
    x.setAttribute("aria-label", "Remove preview");
    x.textContent = "✕";
    xWrap.appendChild(x);

    meta.appendChild(left);
    meta.appendChild(xWrap);

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    thumb.style.padding = "10px";

    const video = document.createElement("video");
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true; // iOS
    video.muted = true;       // keeps iOS sane
    video.style.width = "100%";
    video.style.borderRadius = "14px";

    const source = document.createElement("source");
    source.src = url;
    source.type = "video/mp4";
    video.appendChild(source);

    thumb.appendChild(video);

    card.appendChild(meta);
    card.appendChild(thumb);

    x.addEventListener("click", () => {
      try { URL.revokeObjectURL(url); } catch (_) {}
      card.remove();
    });

    return card;
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    const mp4s = files.filter(isMp4);

    if (!mp4s.length) return;

    // cap total cards
    const existing = previews.querySelectorAll(".preview").length;
    const room = Math.max(0, MAX_FILES - existing);
    mp4s.slice(0, room).forEach((f) => previews.appendChild(createPreviewCard(f)));
  }

  // drag UI
  function setDragOver(on) {
    dropzone.classList.toggle("dragover", !!on);
  }

  dropzone.addEventListener("click", () => picker.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    setDragOver(true);
  });

  dropzone.addEventListener("dragleave", () => setDragOver(false));

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  picker.addEventListener("change", (e) => {
    addFiles(e.target.files);
    // allow re-adding same file later
    picker.value = "";
  });

  // keyboard accessibility
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      picker.click();
    }
  });

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
