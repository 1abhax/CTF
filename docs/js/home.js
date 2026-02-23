async function init() {
  const timeline = document.getElementById("timeline");

  const res = await fetch("./data/order_CTF.json");
  const data = await res.json();

  data.ctf_order.forEach(name => {
    const div = document.createElement("div");
    div.className = "timeline-item";
    div.innerHTML = `
      <div class="tag">#CTF</div>
      <h3 style="margin:0 0 6px;font-size:16px;">${name}</h3>
      <small style="color:var(--muted);">Click to open</small>
    `;

    div.onclick = () => {
      window.location.href = `./archive.html#${encodeURIComponent(name)}`;
    };

    timeline.appendChild(div);
  });
}

init();