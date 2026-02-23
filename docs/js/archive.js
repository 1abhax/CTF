import { loadCTFEvent } from "./CTF.js";

const DEFAULT_SIDEBAR_PX = 280;
const DEFAULT_TOC_PX = 300;

function qs(id) {
  return document.getElementById(id);
}

function setCSSVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

function saveLayoutWidths(sidebarPx, tocPx) {
  localStorage.setItem("sec_archive_sidebar_px", String(sidebarPx));
  localStorage.setItem("sec_archive_toc_px", String(tocPx));
}

function loadLayoutWidths() {
  const s = parseInt(localStorage.getItem("sec_archive_sidebar_px") || "", 10);
  const t = parseInt(localStorage.getItem("sec_archive_toc_px") || "", 10);
  return {
    sidebar: Number.isFinite(s) ? s : DEFAULT_SIDEBAR_PX,
    toc: Number.isFinite(t) ? t : DEFAULT_TOC_PX
  };
}

function enableThemeToggle() {
  const btn = qs("themeToggle");
  if (!btn) return;

  const saved = localStorage.getItem("sec_archive_theme");
  if (saved === "dark") document.body.classList.add("dark");

  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("sec_archive_theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
}

function enableHomeBtn() {
  const btn = qs("homeBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    window.location.href = "./index.html";
  });
}


function enableResizers() {
  const resLeft = qs("resizerLeft");
  const resRight = qs("resizerRight");
  const layoutRoot = qs("layoutRoot");

  let dragging = null;

  function onDown(which) {
    return (e) => {
      e.preventDefault();
      dragging = which;
      document.body.classList.add("dragging");
    };
  }

  function onMove(e) {
    if (!dragging) return;

    const rect = layoutRoot.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // total width available
    const total = rect.width;

    if (dragging === "left") {
      // Sidebar width = x
      const newSidebar = Math.max(200, Math.min(520, Math.round(x)));
      setCSSVar("--sidebar-w", `${newSidebar}px`);
      saveLayoutWidths(newSidebar, getTocWidth());
    } else if (dragging === "right") {
      // Toc width = total - x
      const newToc = Math.max(220, Math.min(520, Math.round(total - x)));
      setCSSVar("--toc-w", `${newToc}px`);
      saveLayoutWidths(getSidebarWidth(), newToc);
    }
  }

  function onUp() {
    if (!dragging) return;
    dragging = null;
    document.body.classList.remove("dragging");
  }

  function getSidebarWidth() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--sidebar-w").trim();
    return parseInt(v.replace("px", ""), 10) || DEFAULT_SIDEBAR_PX;
  }
  function getTocWidth() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--toc-w").trim();
    return parseInt(v.replace("px", ""), 10) || DEFAULT_TOC_PX;
  }

  resLeft?.addEventListener("mousedown", onDown("left"));
  resRight?.addEventListener("mousedown", onDown("right"));
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

async function buildSidebarCTF() {
  const sidebar = qs("sidebar");
  sidebar.innerHTML = "";

  const titleRow = document.createElement("div");
  titleRow.className = "sidebar-title-row";

  const title = document.createElement("div");
  title.className = "sidebar-title";
  title.textContent = "CTF";

  const foldBtn = document.createElement("button");
  foldBtn.className = "mini-btn";
  foldBtn.id = "foldCTF";
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

  // order list
  const res = await fetch("./data/order_CTF.json");
  const data = await res.json();

  data.ctf_order.forEach((name) => {
    const node = document.createElement("div");
    node.className = "node";
    node.textContent = name;

    node.addEventListener("click", async () => {
      // highlight selected event in sidebar
      sidebar.querySelectorAll(".node.active").forEach(el => el.classList.remove("active"));
      node.classList.add("active");

      await loadCTFEvent(name);
    });

    container.appendChild(node);
  });
}

function applyInitialLayout() {
  const { sidebar, toc } = loadLayoutWidths();
  setCSSVar("--sidebar-w", `${sidebar}px`);
  setCSSVar("--toc-w", `${toc}px`);
}

document.addEventListener("DOMContentLoaded", async () => {
  applyInitialLayout();
  enableThemeToggle();
  enableHomeBtn();
  enableResizers();
  enableTocCollapse();
  await buildSidebarCTF();
});
function enableTocCollapse() {
  const btn = document.getElementById("tocToggleBtn");
  const layout = document.getElementById("layoutRoot");
  if (!btn || !layout) return;

  btn.addEventListener("click", () => {
    layout.classList.toggle("toc-collapsed");
    btn.textContent = layout.classList.contains("toc-collapsed") ? "⮞" : "⮜";
  });
}