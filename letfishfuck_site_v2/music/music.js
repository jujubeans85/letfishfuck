/* music/music.js
   - Theme toggle
   - Drag/drop audio preview cards (MP3/WAV/etc)
   - Optional PDF preview cards too (handy for setlists / notes)
*/

(function () {
  const root = document.documentElement;

  // -------------------------
  // Theme toggle
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
  // Dropzone previews
  // -------------------------
  const dropzone = document.getElementById("dropzone");
  const picker = document.getElementById("filePicker");
  const previews = document.getElementById("previews");

  if (!dropzone || !picker || !previews) return;

  const MAX_FILES = 36;

  function isAudio(file) {
    const type = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();
    return type.startsWith("audio/") || [".mp3",".wav",".m4a",".aif",".aiff",".flac"].some(ext => name.endsWith(ext));
  }

  function isPdf(file) {
    const type = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();
    return type === "application/pdf" || name.endsWith(".pdf");
  }

  function prettySize(bytes) {
    if (!Number.isFinite(bytes)) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createCard({ file, kind }) {
    const url = URL.createObjectURL(file);

    const card = document.createElement("div");
    card.className = "preview";

    const meta = document.createElement("div");
    meta.className = "meta";

    const left = document.createElement("div");
    left.innerHTML = `
      <div class="name">${escapeHtml(file.name || (kind === "pdf" ? "notes.pdf" : "audio"))}</div>
      <div class="type">${kind} • ${prettySize(file.size)}</div>
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

    if (kind === "audio") {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.preload = "metadata";
      audio.style.width = "100%";
      audio.src = url;
      thumb.appendChild(audio);
    } else {
      // PDF: embed via iframe (works in most browsers; iOS can be picky but still opens)
      const iframe = document.createElement("iframe");
      iframe.src = url;
      iframe.title = "PDF preview";
      iframe.style.width = "100%";
      iframe.style.height = "220px";
      iframe.style.border = "0";
      thumb.appendChild(iframe);
    }

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
    const pick = files.filter(f => isAudio(f) || isPdf(f));
    if (!pick.length) return;

    const existing = previews.querySelectorAll(".preview").length;
    const room = Math.max(0, MAX_FILES - existing);

    pick.slice(0, room).forEach((f) => {
      const kind = isPdf(f) ? "pdf" : "audio";
      previews.appendChild(createCard({ file: f, kind }));
    });
  }

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
    picker.value = "";
  });

  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      picker.click();
    }
  });
})();
