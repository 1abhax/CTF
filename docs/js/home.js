async function init() {
  const timeline = document.getElementById("timeline");

  const res = await fetch("./data/order_CTF.json");
  const data = await res.json();

  data.ctf_order.forEach(name => {
    const div = document.createElement("div");
    div.className = "timeline-item";

    div.innerHTML = `
      <div class="tag">#CTF</div>
      <h3>${name}</h3>
    `;

    div.onclick = () => {
      window.location.href =
        `archive.html?major=CTF&event=${encodeURIComponent(name)}`;
    };

    timeline.appendChild(div);
  });
}

init();