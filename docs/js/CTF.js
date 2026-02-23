const USER = "1abhax";
const REPO = "sec-archive";
const BRANCH = "main";

// 固定結構：CTF/<event>/<category>/<challenge>/README.md
export async function loadCTFEvent(eventName) {
  const content = document.getElementById("content");
  const tocContent = document.getElementById("tocContent");

  content.innerHTML = `<h2>${escapeHTML(eventName)}</h2><p class="muted">Loading...</p>`;
  tocContent.innerHTML = `<p class="muted">Loading...</p>`;

  const readmes = await collectReadmesFixed(eventName);

  if (!readmes.length) {
    content.innerHTML = `<h2>${escapeHTML(eventName)}</h2><p>No README found.</p>`;
    tocContent.innerHTML = `<p class="muted">No entries.</p>`;
    return;
  }

  renderChallengeList(readmes);

  // auto load first
  await loadFile(readmes[0].path);

  // set first active (if not already)
  const first = tocContent.querySelector(".challenge-item");
  if (first) first.classList.add("active");
}

async function collectReadmesFixed(eventName) {
  const result = [];
  const categories = await fetchDir(`CTF/${eventName}`);
  if (!Array.isArray(categories)) return result;

  for (const cat of categories) {
    if (!cat || cat.type !== "dir") continue;

    const challenges = await fetchDir(cat.path);
    if (!Array.isArray(challenges)) continue;

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

  result.sort((a, b) => {
    const c = a.category.localeCompare(b.category);
    return c !== 0 ? c : a.challenge.localeCompare(b.challenge);
  });

  return result;
}

async function fetchDir(path) {
  const url = `https://api.github.com/repos/${USER}/${REPO}/contents/${path}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return await res.json();
}

function renderChallengeList(readmes) {
  const tocContent = document.getElementById("tocContent");
  tocContent.innerHTML = "";

  readmes.forEach((item) => {
    const div = document.createElement("div");
    div.className = "challenge-item";
    div.textContent = `${item.category} / ${item.challenge}`;

    div.addEventListener("click", async () => {
      tocContent.querySelectorAll(".challenge-item.active")
        .forEach(el => el.classList.remove("active"));

      div.classList.add("active");
      await loadFile(item.path);
    });

    tocContent.appendChild(div);
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

  if (window.marked) {
    marked.setOptions({ gfm: true, breaks: false });
  }

  content.innerHTML = marked.parse(md);

  fixRelativeAssetPaths(path);
}

function fixRelativeAssetPaths(readmePath) {
  const baseDir = readmePath.replace(/README\.md$/i, "");

  // images
  document.querySelectorAll("#content img").forEach(img => {
    const src = img.getAttribute("src") || "";
    if (!src) return;
    if (isAbsUrl(src) || src.startsWith("data:")) return;

    img.setAttribute(
      "src",
      `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}/${baseDir}${src}`
    );
  });

  // links -> raw
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