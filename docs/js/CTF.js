// CTF.js

const USER = "1abhax";
const REPO = "sec-archive";
const BRANCH = "main";

export async function loadCTFEvent(eventName) {
  const content = document.getElementById("content");
  const toc = document.getElementById("toc");

  content.innerHTML = `<h2>${eventName}</h2><p>Loading...</p>`;
  toc.innerHTML = "";

  const readmes = await collectReadmes(eventName);

  if (readmes.length === 0) {
    content.innerHTML = "<h2>No README found</h2>";
    return;
  }

  renderRightPanel(readmes);

  // 自動載入第一個 README
  loadFile(readmes[0].path);
}

async function collectReadmes(eventName) {
  const result = [];

  const categories = await fetchDir(`CTF/${eventName}`);

  for (const cat of categories) {
    if (cat.type !== "dir") continue;

    const challenges = await fetchDir(cat.path);

    for (const chall of challenges) {
      if (chall.type !== "dir") continue;

      const files = await fetchDir(chall.path);

      const hasReadme = files.find(
        f => f.type === "file" && f.name.toLowerCase() === "readme.md"
      );

      if (hasReadme) {
        result.push({
          category: cat.name.toLowerCase(),
          challenge: chall.name,
          path: hasReadme.path
        });
      }
    }
  }

  return result;
}

async function fetchDir(path) {
  const res = await fetch(
    `https://api.github.com/repos/${USER}/${REPO}/contents/${path}`
  );
  return await res.json();
}

function renderRightPanel(readmes) {
  const toc = document.getElementById("toc");
  toc.innerHTML = "<h3>Challenges</h3>";

  readmes.forEach(item => {
    const div = document.createElement("div");
    div.className = "challenge-item";

    div.textContent = `${item.category} / ${item.challenge}`;

    div.onclick = () => loadFile(item.path);

    toc.appendChild(div);
  });
}

async function loadFile(path) {
  const content = document.getElementById("content");

  const res = await fetch(
    `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}/${path}`
  );

  const text = await res.text();

  content.innerHTML = marked.parse(text);
}