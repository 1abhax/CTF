import { loadCTFEvent } from "./CTF.js";

const DEFAULT_SIDEBAR_PX = 300;

function setVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

function applyThemeFromStorage() {
  if (localStorage.getItem("sec_archive_theme") === "dark") {
    document.body.classList.add("dark");
  }
}

function enableThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "sec_archive_theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  });
}

function enableHomeBtn() {
  const btn = document.getElementById("homeBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    window.location.href = "./index.html";
  });
}

function enableSidebarResize() {
  const resizer = document.getElementById("resizerLeft");
  const layoutRoot = document.getElementById("layoutRoot");

  let dragging = false;

  resizer.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = true;
    document.body.classList.add("dragging");
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = layoutRoot.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const newW = Math.max(240, Math.min(520, Math.round(x)));
    setVar("--sidebar-w", `${newW}px`);
    localStorage.setItem("sec_archive_sidebar_px", String(newW));
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove("dragging");
  });
}

function applySidebarWidth() {
  const s = parseInt(localStorage.getItem("sec_archive_sidebar_px") || "", 10);
  setVar("--sidebar-w", `${Number.isFinite(s) ? s : DEFAULT_SIDEBAR_PX}px`);
}

function enableTocCollapse() {
  const layout = document.getElementById("layoutRoot");
  const btn = document.getElementById("tocToggleBtn");
  const handle = document.getElementById("tocHandle");

  const toggle = () => {
    layout.classList.toggle("toc-collapsed");
    const collapsed = layout.classList.contains("toc-collapsed");

    // header button icon
    btn.textContent = collapsed ? "⮞" : "⮜";
    // handle icon
    handle.textContent = collapsed ? "⮞" : "⮜";
  };

  btn.addEventListener("click", toggle);
  handle.addEventListener("click", toggle);
}

async function buildSidebarCTF() {
  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = "";

  const titleRow = document.createElement("div");
  titleRow.className = "sidebar-title-row";

  const title = document.createElement("div");
  title.className = "sidebar-title";
  title.textContent = "CTF";

  const foldBtn = document.createElement("button");
  foldBtn.className = "mini-btn";
  foldBtn.textContent = "▾";
  foldBtn.title = "Collapse/Expand";

  titleRow.appendChild(title);
  titleRow.appendChild(foldBtn);
  sidebar.appendChild(titleRow);

  const container = document.createElement("div");
  container.className = "children open";
  sidebar.appendChild(container);

  foldBtn.addEventListener("click", () => {
    const open = container.classList.toggle("open");
    foldBtn.textContent = open ? "▾" : "▸";
  });

  const res = await fetch("./data/order_CTF.json");
  const data = await res.json();

  data.ctf_order.forEach((name) => {
    const node = document.createElement("div");
    node.className = "node";
    node.textContent = name;

    node.addEventListener("click", async () => {
      sidebar.querySelectorAll(".node.active").forEach(el => el.classList.remove("active"));
      node.classList.add("active");
      await loadCTFEvent(name);
    });

    container.appendChild(node);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  applyThemeFromStorage();
  applySidebarWidth();

  enableThemeToggle();
  enableHomeBtn();
  enableSidebarResize();
  enableTocCollapse();

  await buildSidebarCTF();

  const hash = decodeURIComponent(location.hash.slice(1)).trim();
  if (hash) {
    const nodes = [...document.querySelectorAll("#sidebar .node")];
    const node = nodes.find(n => n.textContent.trim() === hash);
    if (node) node.click();
  }
});