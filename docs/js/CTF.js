// CTF.js

const USER = "1abhax";
const REPO = "sec-archive";
const BRANCH = "main";

export async function loadCTF(eventName = null) {
  const sidebar = document.getElementById("sidebar");
  const content = document.getElementById("content");

  const basePath = eventName
    ? `CTF/${eventName}`
    : "CTF";

  sidebar.innerHTML = "<h3>CTF</h3>";
  content.innerHTML = "<h2>Loading...</h2>";

  const readmes = [];
  await scanDirectory(basePath, readmes);

  sidebar.innerHTML = "<h3>CTF</h3>";

  readmes.forEach(path => {
    const parts = path.split("/");

    // 結構: CTF / LACTF / Web / challenge / README.md
    const category = parts[2];
    const challenge = parts[3];

    const display = `${category} / ${challenge}`;

    const node = document.createElement("div");
    node.className = "node";
    node.textContent = display;

    node.onclick = () => loadFile(path);

    sidebar.appendChild(node);
  });

  content.innerHTML = "<h2>Select a document</h2>";
}

async function scanDirectory(path, result) {
  const res = await fetch(
    `https://api.github.com/repos/${USER}/${REPO}/contents/${path}`
  );

  const data = await res.json();

  for (const item of data) {
    if (item.type === "dir") {
      await scanDirectory(item.path, result);
    }

    if (
      item.type === "file" &&
      item.name.toLowerCase() === "readme.md"
    ) {
      result.push(item.path);
    }
  }
}

async function loadFile(path) {
  const content = document.getElementById("content");
  const toc = document.getElementById("toc");

  const res = await fetch(
    `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}/${path}`
  );

  const text = await res.text();

  content.innerHTML = marked.parse(text);

  generateTOC();
}

function generateTOC() {
  const toc = document.getElementById("toc");
  toc.innerHTML = "<h3>目錄</h3>";

  const headings = document.querySelectorAll("#content h2, #content h3");

  headings.forEach((heading, index) => {
    const id = "section-" + index;
    heading.id = id;

    const div = document.createElement("div");
    div.className = "toc-item";
    div.textContent = heading.textContent;

    div.onclick = () => {
      document.getElementById(id).scrollIntoView({
        behavior: "smooth"
      });
    };

    toc.appendChild(div);
  });
}