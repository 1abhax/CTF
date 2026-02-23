// ==============================
// 1abhax CTF Writeups main.js
// ==============================
const CACHE = {};
let CFG = {};
let ORDER = {};

// ------------------------------
// 初始化
// ------------------------------

async function init() {
  await loadConfig();
  await loadOrder();
  loadDirectory(CFG.content_dir, document.getElementById("sidebar"));
}

window.onload = init;

// ------------------------------
// 載入 config.json
// ------------------------------

async function loadDirectory(path, container) {

  // 如果已快取，直接渲染
  if (CACHE[path]) {
    renderItems(CACHE[path], container);
    return;
  }

  const apiUrl =
    `https://api.github.com/repos/${CFG.user}/${CFG.repo}/contents/${path}?ref=${CFG.branch}`;

  const res = await fetch(apiUrl, { cache: "force-cache" });

  if (!res.ok) {
    showError(`無法讀取資料夾: ${res.status}`);
    return;
  }

  const items = await res.json();

  // 存入快取
  CACHE[path] = items;

  renderItems(items, container);
}
function renderItems(items, container) {

  container.innerHTML = "";

  const sorted = sortItems(container.dataset?.path || "", items);

  sorted.forEach(item => {

    if (item.type === "dir") {

      const folder = document.createElement("div");
      folder.className = "folder";
      folder.textContent = "📁 " + item.name;

      const sub = document.createElement("div");
      sub.style.marginLeft = "15px";
      sub.style.display = "none";

      folder.onclick = () => {
        const opened = sub.style.display === "block";
        sub.style.display = opened ? "none" : "block";

        if (!opened && !sub.hasChildNodes()) {
          loadDirectory(item.path, sub);
        }
      };

      container.appendChild(folder);
      container.appendChild(sub);
    }

    if (item.type === "file" &&
        item.name.toLowerCase() === "readme.md") {

      const file = document.createElement("div");
      file.className = "file";
      file.textContent = "📄 README";

      file.onclick = () => {
        openFile(item.path);
      };

      container.appendChild(file);
    }

  });
}
// ------------------------------
// 載入 order.json（可選）
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
// 載入資料夾
// ------------------------------

async function loadDirectory(path, container) {
  const apiUrl =
    `https://api.github.com/repos/${CFG.user}/${CFG.repo}/contents/${path}?ref=${CFG.branch}`;

  const res = await fetch(apiUrl);
  if (!res.ok) {
    showError(`無法讀取資料夾: ${res.status}`);
    return;
  }

  const items = await res.json();

  const sorted = sortItems(path, items);

  sorted.forEach(item => {
    if (item.type === "dir") {
      const folder = document.createElement("div");
      folder.className = "folder";
      folder.textContent = "📁 " + item.name;

      const sub = document.createElement("div");
      sub.style.marginLeft = "15px";
      sub.style.display = "none";

      folder.onclick = () => {
        sub.style.display =
          sub.style.display === "none" ? "block" : "none";

        if (!sub.hasChildNodes()) {
          loadDirectory(item.path, sub);
        }
      };

      container.appendChild(folder);
      container.appendChild(sub);
    }

    if (item.type === "file" && item.name.toLowerCase() === "readme.md") {
      const file = document.createElement("div");
      file.className = "file";
      file.textContent = "📄 " + item.name;

      file.onclick = () => {
        openFile(item.path);
      };

      container.appendChild(file);
    }
  });
}

// ------------------------------
// 排序邏輯（支援 order.json）
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
// 開啟 README.md
// ------------------------------

async function openFile(path) {
  const encodedPath = path
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const rawUrl =
    `https://raw.githubusercontent.com/${CFG.user}/${CFG.repo}/${CFG.branch}/${encodedPath}`;

  const res = await fetch(rawUrl);

  if (!res.ok) {
    showError(`無法載入: HTTP ${res.status}`);
    return;
  }

  const text = await res.text();

  const html = marked.parse(text);

  document.getElementById("content").innerHTML =
    `<div class="markdown-content">${html}</div>`;

}

// ------------------------------
// 產生 TOC
// ------------------------------

function generateTOC() {
  const toc = document.getElementById("toc");
  toc.innerHTML = "<h3>On this page</h3>";

  const headings = document.querySelectorAll(
    "#content h2, #content h3"
  );

  const ul = document.createElement("ul");

  headings.forEach(h => {
    const id = h.innerText
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]/g, "")
      .toLowerCase();

    h.id = id;

    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#" + id;
    a.innerText = h.innerText;

    li.appendChild(a);
    ul.appendChild(li);
  });

  toc.appendChild(ul);
}

// ------------------------------
// 錯誤顯示
// ------------------------------

function showError(msg) {
  document.getElementById("content").innerHTML =
    `<div style="color:red;">❌ ${msg}</div>`;
}

document.getElementById("toggleSidebar").onclick = () => {
  document.body.classList.toggle("sidebar-collapsed");
};