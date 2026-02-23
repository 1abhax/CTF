// archive.js

import { loadCTF } from "./CTF.js";

const MAJORS = [
  {
    name: "CTF",
    handler: loadCTF
  }
];

function init() {
  const sidebar = document.getElementById("sidebar");

  // 建立左側 tag
  MAJORS.forEach(major => {
    const node = document.createElement("div");
    node.className = "node folder";
    node.textContent = "#" + major.name;

    node.onclick = () => {
      major.handler();
    };

    sidebar.appendChild(node);
  });

  // 讀取 URL 參數
  const urlParams = new URLSearchParams(window.location.search);
  const major = urlParams.get("major");
  const event = urlParams.get("event");

  // 如果是 CTF 並且有 event
  if (major === "CTF") {
    loadCTF(event);
  }
}

init();