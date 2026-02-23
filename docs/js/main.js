function generateTOC() {
  const toc = document.getElementById("toc");
  toc.innerHTML = "<h3>On this page</h3>";

  const headings = document.querySelectorAll("#content h2, #content h3");
  const ul = document.createElement("ul");

  headings.forEach(h => {
    const id = h.innerText.replace(/\s+/g, "-").toLowerCase();
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