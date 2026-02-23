const USER = "1abhax";
const REPO = "sec-archive";
const BRANCH = "main";

// 只找固定位置：CTF/<event>/<category>/<challenge>/README.md
export async function loadCTFEvent(eventName) {
  const content = document.getElementById("content");
const toc = document.getElementById("tocContent");

  content.innerHTML = `<h2>${escapeHTML(eventName)}</h2><p class="muted">Loading...</p>`;
  toc.innerHTML = `<h3>Challenges</h3><p class="muted">Loading...</p>`;

  const readmes = await collectReadmesFixed(eventName);

  if (!readmes.length) {
    content.innerHTML = `<h2>${escapeHTML(eventName)}</h2><p>No README found.</p>`;
    toc.innerHTML = `<h3>Challenges</h3><p class="muted">No entries.</p>`;
    return;
  }

  // 右側：只列出有 README 的 challenge，且可點擊切換
  renderChallengeList(readmes);

  // 中間：自動載入第一個 README
  await loadFile(readmes[0].path);
}

async function collectReadmesFixed(eventName) {
  const result = [];
  const categories = await fetchDir(`CTF/${eventName}`);

  if (!Array.isArray(categories)) return result;

  for (const cat of categories) {
    if (!cat || cat.type !== "dir") continue;

    const challenges = await fetchDir(cat.path);
    if (!Array.isArray(challenges)) continue;

    // 固定下一層才是 challenge
    for (const chall of challenges) {
      if (!chall || chall.type !== "dir") continue;

      const files = await fetchDir(chall.path);
      if (!Array.isArray(files)) continue;

      const readme = files.find(f => f.type === "file" && f.name.toLowerCase() === "readme.md");
      if (!readme) continue;

      result.push({
        category: (cat.name || "").toLowerCase(),
        challenge: chall.name || "",
        path: readme.path
      });
    }
  }

  // 你可以想要固定排序：先 category，再 challenge
  result.sort((a, b) => {
    const c = a.category.localeCompare(b.category);
    return c !== 0 ? c : a.challenge.localeCompare(b.challenge);
  });

  return result;
}

async function fetchDir(path) {
  const url = `https://api.github.com/repos/${USER}/${REPO}/contents/${path}`;
  const res = await fetch(url);

  // rate limit 或 404 時避免直接 throw 讓頁面死掉
  if (!res.ok) return [];
  return await res.json();
}

function renderChallengeList(readmes) {
  const toc = document.getElementById("tocContent");
toc.innerHTML = "";

  readmes.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "challenge-item";
    div.textContent = `${item.category} / ${item.challenge}`;

    div.addEventListener("click", async () => {
      toc.querySelectorAll(".challenge-item.active").forEach(el => el.classList.remove("active"));
      div.classList.add("active");
      await loadFile(item.path);
    });

    if (idx === 0) div.classList.add("active");
    toc.appendChild(div);
  });
}

async function loadFile(path) {
  const content = document.getElementById("content");
  content.innerHTML = `<p class="muted">Loading README...</p>`;

  const rawUrl = `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}/${path}`;
  const res = await fetch(rawUrl);

  if (!res.ok) {
    content.innerHTML = `<p>Failed to load: ${escapeHTML(path)}</p>`;
    return;
  }

  const md = await res.text();

  // marked 設定（可再調）
  if (window.marked) {
    marked.setOptions({
      gfm: true,
      breaks: false
    });
  }

  content.innerHTML = marked.parse(md);

  fixRelativeAssetPaths(path);
}

function fixRelativeAssetPaths(readmePath) {
  const baseDir = readmePath.replace(/README\.md$/i, "");

  // 1) images: ![](img/...)
  document.querySelectorAll("#content img").forEach(img => {
    const src = img.getAttribute("src") || "";
    if (!src) return;
    if (isAbsUrl(src) || src.startsWith("data:")) return;

    img.setAttribute(
      "src",
      `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}/${baseDir}${src}`
    );
  });

  // 2) links: [x](src/...) 也修成 GitHub raw（如果你要點開下載）
  document.querySelectorAll("#content a").forEach(a => {
    const href = a.getAttribute("href") || "";
    if (!href) return;
    if (isAbsUrl(href) || href.startsWith("#") || href.startsWith("mailto:")) return;

    a.setAttribute(
      "href",
      `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}/${baseDir}${href}`
    );
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });
}

function isAbsUrl(u) {
  return /^https?:\/\//i.test(u);
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}