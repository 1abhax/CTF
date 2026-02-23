// =====================================
// 1abhax CTF Writeups main.js (improved)
// =====================================

const CACHE = new Map();        // path -> GitHub contents API result
const ELEM_CACHE = new Map();   // path -> rendered DOM nodes (for faster re-filter)
let CFG = {};
let ORDER = {};

const state = {
  currentFilePath: null,
  isSidebarCollapsed: false,
  searchQuery: "",
  tocObserver: null,
};

window.addEventListener("load", init);

async function init() {
  bindTopbar();
  restoreUIState();

  await loadConfig();
  await loadOrder();

  // Repo link
  const repoLink = document.getElementById("repoLink");
  repoLink.href = `https://github.com/${CFG.user}/${CFG.repo}`;

  // Sidebar tree
  const sidebarTree = document.getElementById("sidebarTree");
  sidebarTree.innerHTML = "";
  setSidebarHint("Loading…");

  await renderDirectory(CFG.content_dir, sidebarTree);

  setSidebarHint("Ready");

  // Router: open hash file if exists
  await handleRouteFromHash();

  window.addEventListener("hashchange", handleRouteFromHash);
}

function bindTopbar() {
  const toggleSidebarBtn = document.getElementById("toggleSidebar");
  toggleSidebarBtn.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
    state.isSidebarCollapsed = document.body.classList.contains("sidebar-collapsed");
    localStorage.setItem("sidebar_collapsed", state.isSidebarCollapsed ? "1" : "0");
  });

  const searchBox = document.getElementById("searchBox");
  const clearSearch = document.getElementById("clearSearch");

  searchBox.addEventListener("input", () => {
    state.searchQuery = (searchBox.value || "").trim().toLowerCase();
    localStorage.setItem("sidebar_search", state.searchQuery);
    applySidebarFilter(state.searchQuery);
  });

  clearSearch.addEventListener("click", () => {
    searchBox.value = "";
    state.searchQuery = "";
    localStorage.setItem("sidebar_search", "");
    applySidebarFilter("");
    searchBox.focus();
  });

  const toggleTheme = document.getElementById("toggleTheme");
  toggleTheme.addEventListener("click", () => {
    const dark = !document.body.classList.contains("dark");
    document.body.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  });
}

function restoreUIState() {
  // Sidebar collapsed
  const collapsed = localStorage.getItem("sidebar_collapsed") === "1";
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  state.isSidebarCollapsed = collapsed;

  // Theme
  const theme = localStorage.getItem("theme") || "light";
  document.body.classList.toggle("dark", theme === "dark");

  // Search
  const q = (localStorage.getItem("sidebar_search") || "").trim();
  state.searchQuery = q.toLowerCase();
  const searchBox = document.getElementById("searchBox");
  searchBox.value = q;
}

function setSidebarHint(text) {
  const hint = document.getElementById("sidebarHint");
  if (hint) hint.textContent = text;
}

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  window.clearTimeout(el._t);
  el._t = window.setTimeout(() => el.classList.remove("show"), 1400);
}

// ------------------------------
// Load config.json
// ------------------------------
async function loadConfig() {
  const res = await fetch("data/config.json");
  if (!res.ok) throw new Error(`Failed to load config.json: ${res.status}`);
  CFG = await res.json();
}

// ------------------------------
// Load order.json (optional)
// ------------------------------
async function loadOrder() {
  try {
    const res = await fetch("data/order.json");
    ORDER = await res.json();
  } catch {
    ORDER = {};
  }
}

// ------------------------------
// GitHub API helpers
// ------------------------------
function githubContentsUrl(path) {
  return `https://api.github.com/repos/${CFG.user}/${CFG.repo}/contents/${path}?ref=${CFG.branch}`;
}

function rawUrl(path) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${CFG.user}/${CFG.repo}/${CFG.branch}/${encoded}`;
}

// ------------------------------
// Sorting logic (supports order.json)
// ------------------------------
function sortItems(path, items) {
  const list = ORDER.order?.[path] || [];
  const map = new Map();
  list.forEach((name, i) => map.set(name, i));

  return items.slice().sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;

    const ia = map.has(a.name) ? map.get(a.name) : 9999;
    const ib = map.has(b.name) ? map.get(b.name) : 9999;
    if (ia !== ib) return ia - ib;

    return a.name.localeCompare(b.name);
  });
}

// ------------------------------
// Render sidebar directory tree
// ------------------------------
async function fetchDirectory(path) {
  if (CACHE.has(path)) return CACHE.get(path);

  const res = await fetch(githubContentsUrl(path), { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`Unable to read dir "${path}": HTTP ${res.status}`);
  }

  const items = await res.json();
  CACHE.set(path, items);
  return items;
}

async function renderDirectory(path, container) {
  container.dataset.path = path;

  // If we already rendered nodes once, reuse them.
  if (ELEM_CACHE.has(path)) {
    container.innerHTML = "";
    container.appendChild(ELEM_CACHE.get(path).cloneNode(true));
    applySidebarFilter(state.searchQuery);
    return;
  }

  const wrap = document.createElement("div");

  let items;
  try {
    items = await fetchDirectory(path);
  } catch (e) {
    showError(String(e.message || e));
    setSidebarHint("Error");
    return;
  }

  const sorted = sortItems(path, items);

  for (const item of sorted) {
    if (item.type === "dir") {
      const folder = document.createElement("div");
      folder.className = "folder";
      folder.dataset.name = item.name.toLowerCase();

      const left = document.createElement("div");
      left.className = "name";
      left.textContent = `📁 ${item.name}`;

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "dir";

      folder.appendChild(left);
      folder.appendChild(badge);

      const sub = document.createElement("div");
      sub.className = "tree-indent";
      sub.dataset.path = item.path;

      folder.addEventListener("click", async () => {
        const isOpen = sub.style.display === "block";
        sub.style.display = isOpen ? "none" : "block";

        if (!isOpen && sub.childNodes.length === 0) {
          await renderDirectory(item.path, sub);
        }

        applySidebarFilter(state.searchQuery);
      });

      wrap.appendChild(folder);
      wrap.appendChild(sub);
      continue;
    }

    // Only show README.md
    if (item.type === "file" && item.name.toLowerCase() === "readme.md") {
      const file = document.createElement("div");
      file.className = "file";
      file.dataset.path = item.path;
      file.dataset.name = item.path.toLowerCase();

      const left = document.createElement("div");
      left.className = "name";
      left.textContent = `📄 README`;

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "md";

      file.appendChild(left);
      file.appendChild(badge);

      file.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        await openFile(item.path, { pushHash: true });
        setActiveFile(item.path);
      });

      wrap.appendChild(file);
    }
  }

  container.innerHTML = "";
  container.appendChild(wrap);

  // Cache rendered DOM
  ELEM_CACHE.set(path, wrap.cloneNode(true));

  // Apply filter now (for restored search query)
  applySidebarFilter(state.searchQuery);
}

function applySidebarFilter(query) {
  const q = (query || "").trim().toLowerCase();

  const sidebar = document.getElementById("sidebarTree");
  const nodes = sidebar.querySelectorAll(".folder, .file, .tree-indent");

  if (!q) {
    // Show folders/files, keep subtrees as user toggled
    nodes.forEach(n => {
      if (n.classList.contains("folder") || n.classList.contains("file")) {
        n.style.display = "flex";
      }
      if (n.classList.contains("tree-indent")) {
        // don't force open/close; only hide if empty
        if (n.childElementCount === 0) n.style.display = n.style.display || "none";
      }
    });
    return;
  }

  // Filtering: show matching folders/files and their ancestors
  // Step 1: hide everything
  nodes.forEach(n => {
    if (n.classList.contains("folder") || n.classList.contains("file")) {
      n.style.display = "none";
    }
    if (n.classList.contains("tree-indent")) {
      n.style.display = "none";
    }
  });

  // Step 2: show matches
  const matchNodes = [];
  sidebar.querySelectorAll(".folder, .file").forEach(n => {
    const name = n.dataset.name || "";
    if (name.includes(q)) matchNodes.push(n);
  });

  // Step 3: reveal matches + parents and open their subtrees
  for (const n of matchNodes) {
    n.style.display = "flex";

    // If it's a file, reveal its parent subtree(s)
    let p = n.parentElement;
    while (p && p !== sidebar) {
      if (p.classList.contains("tree-indent")) {
        p.style.display = "block";
      }
      p = p.parentElement;
    }

    // If it's a folder, reveal its subtree too
    if (n.classList.contains("folder")) {
      const sub = n.nextElementSibling;
      if (sub && sub.classList.contains("tree-indent")) {
        sub.style.display = "block";
      }
    }
  }
}

// ------------------------------
// File open / markdown render
// ------------------------------
async function openFile(path, opts = { pushHash: false }) {
  state.currentFilePath = path;

  if (opts.pushHash) {
    // Route: encode path in hash
    location.hash = `#${encodeURIComponent(path)}`;
  }

  const content = document.getElementById("content");
  content.innerHTML = `<div class="welcome"><div class="welcome-title">Loading…</div><div class="welcome-subtitle">${escapeHtml(path)}</div></div>`;

  let md;
  try {
    const res = await fetch(rawUrl(path), { cache: "no-cache" });
    if (!res.ok) throw new Error(`Unable to load: HTTP ${res.status}`);
    md = await res.text();
  } catch (e) {
    showError(String(e.message || e));
    return;
  }

  // marked config (safe-ish defaults; keep simple)
  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  const html = marked.parse(md);
  content.innerHTML = `<div class="markdown-content">${html}</div>`;

  // Build TOC + headings ids
  buildTOC();

  // Update toc meta
  const tocMeta = document.getElementById("tocMeta");
  tocMeta.textContent = path.replace(/^.*?writeups\//, "writeups/");

  // Small UX
  toast("Loaded");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ------------------------------
// Active highlight in sidebar
// ------------------------------
function setActiveFile(path) {
  document.querySelectorAll(".file").forEach(el => el.classList.remove("active"));
  const target = document.querySelector(`.file[data-path="${cssEscape(path)}"]`);
  if (target) target.classList.add("active");
}

// Minimal CSS.escape fallback
function cssEscape(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return String(s).replaceAll('"', '\\"');
}

// ------------------------------
// TOC generation + scroll spy
// ------------------------------
function buildTOC() {
  const tocBody = document.getElementById("tocBody");
  tocBody.innerHTML = "";

  // Disconnect previous observer
  if (state.tocObserver) {
    state.tocObserver.disconnect();
    state.tocObserver = null;
  }

  const headings = document.querySelectorAll("#content h2, #content h3");
  if (!headings.length) {
    tocBody.innerHTML = `<div style="color: var(--muted); font-size: 13px; padding: 8px 12px;">No headings</div>`;
    return;
  }

  const links = [];
  headings.forEach(h => {
    const id = makeHeadingId(h.innerText);
    h.id = id;

    const a = document.createElement("a");
    a.href = `#${encodeURIComponent(state.currentFilePath || "")}:${id}`;
    a.textContent = h.innerText;

    // indent h3
    if (h.tagName.toLowerCase() === "h3") {
      a.style.paddingLeft = "18px";
    }

    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTOCActive(id);
    });

    tocBody.appendChild(a);
    links.push({ id, a });
  });

  // Scroll spy
  const obs = new IntersectionObserver((entries) => {
    // Choose the top-most visible heading
    const visible = entries.filter(e => e.isIntersecting)
      .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top));

    if (visible.length) {
      setTOCActive(visible[0].target.id);
    }
  }, {
    root: null,
    rootMargin: "-20% 0px -70% 0px",
    threshold: [0, 1.0]
  });

  headings.forEach(h => obs.observe(h));
  state.tocObserver = obs;

  // Default active
  setTOCActive(headings[0].id);

  function setTOCActive(id) {
    links.forEach(x => x.a.classList.toggle("active", x.id === id));
  }
}

function makeHeadingId(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "")
    .slice(0, 80) || "section";
}

// ------------------------------
// Router: #<filePath> or #<filePath>:<headingId>
// ------------------------------
async function handleRouteFromHash() {
  const h = location.hash || "";
  if (!h || h === "#") return;

  // Two formats:
  // 1) #<encodeURIComponent(filePath)>
  // 2) #<encodeURIComponent(filePath)>:<headingId>
  const raw = h.slice(1);
  const parts = raw.split(":");
  const filePart = parts[0] || "";
  const headingId = parts[1] || "";

  let filePath;
  try {
    filePath = decodeURIComponent(filePart);
  } catch {
    return;
  }
  if (!filePath) return;

  if (filePath !== state.currentFilePath) {
    await openFile(filePath, { pushHash: false });
    setActiveFile(filePath);
  }

  if (headingId) {
    // Wait for render
    requestAnimationFrame(() => {
      const el = document.getElementById(headingId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

// ------------------------------
// Error rendering
// ------------------------------
function showError(msg) {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="welcome">
      <div class="welcome-title">Error</div>
      <div class="welcome-subtitle" style="color: var(--muted); line-height: 1.8;">
        ${escapeHtml(msg)}
      </div>
    </div>
  `;
  toast("Error");
}