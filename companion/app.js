// KH1 Second-Screen Companion: bottom-screen UI.
// Gets snapshots from the bridge (polled over http, or pushed by the Android
// wrapper), decodes them with logic.js, and renders.
(function () {
  "use strict";

  const L = window.KH1Logic;
  const params = new URLSearchParams(location.search);
  const STATE_URL = params.get("state") || "state.json";
  const POLL_MS = 250;
  const STALE_MS = 5000;
  const VIEWS = ["here", "map", "worlds", "collect"];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const store = {
    get(k, d) { try { const v = localStorage.getItem("kh1c:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("kh1c:" + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  let state = null, sum = null;
  let lastSeq = null, lastChange = 0;
  let view = VIEWS.includes(store.get("view")) ? store.get("view") : "here";
  let showOpened = store.get("showOpened", false);
  let showContents = store.get("showContents", true);
  let worldDetail = null;   // Worlds tab: world whose chest list is open
  let mapWorld = null;      // Map tab: world shown instead of the current one
  let roomLabels = store.get("rooms", {});

  const icon = (id, cls = "ico") => `<svg class="${cls}"><use href="#${id}"/></svg>`;
  const hex2 = (n) => "0x" + n.toString(16).toUpperCase().padStart(2, "0");
  const hereNode = () => (state ? L.nodeForRoom(state, roomLabels) : null);
  const displayWorld = (w) => (w === "Awakening" ? "Dive to the Heart" : w);

  // ---------- shared pieces ----------

  function chestRow(c, opts) {
    const n = c.node && L.node(c.w, c.node);
    const sub = [opts.showRoom && n ? L.labelOf(n) : null, showContents && c.i ? c.i : null].filter(Boolean).join(" · ");
    return `<li class="${c.got ? "got" : ""} ${opts.here ? "here" : ""}">${icon(c.got ? "ico-chest-open" : "ico-chest")}` +
      `<span class="grow"><span class="name">${esc(c.n.replace(/ Chest$/, ""))}</span>` +
      (sub ? `<div class="sub">${esc(sub)}</div>` : "") + `</span>` +
      (L.isPuppies(c) ? `<span class="tag pup">${icon("ico-paw", "")}Pups</span>` : "") +
      (opts.here ? '<span class="tag here">Here</span>' : "") + `</li>`;
  }

  function chestList(chests, hereId, opts = {}) {
    let rows = showOpened ? chests : chests.filter((c) => !c.got);
    const isHere = (c) => !!hereId && c.node === hereId;
    rows = rows.slice().sort((a, b) => (isHere(b) - isHere(a)) || (a.got - b.got) || a.n.localeCompare(b.n));
    if (!rows.length) return `<div class="empty">${chests.length ? "Every chest here is open." : "No chests here."}</div>`;
    return `<ul class="list">${rows.map((c) => chestRow(c, { here: isHere(c), showRoom: opts.showRoom !== false })).join("")}</ul>`;
  }

  function progressCard(title, got, total, extra = "") {
    const pct = total ? Math.round(got / total * 100) : 0;
    return `<div class="card"><div class="row"><div class="grow"><div class="label">${esc(title)}</div>` +
      `<div class="big">${got}<span class="sub"> / ${total}</span></div></div>${extra}</div>` +
      `<div class="bar ${got === total && total ? "done" : ""}"><i style="width:${pct}%"></i></div></div>`;
  }

  function toggles() {
    return `<button class="chip ${showOpened ? "on" : ""}" data-toggle="showOpened">Opened</button>` +
      `<button class="chip ${showContents ? "on" : ""}" data-toggle="showContents">Contents</button>`;
  }
  function wireToggles(root) {
    root.querySelectorAll("[data-toggle]").forEach((b) => {
      b.onclick = () => {
        if (b.dataset.toggle === "showOpened") { showOpened = !showOpened; store.set("showOpened", showOpened); }
        else { showContents = !showContents; store.set("showContents", showContents); }
        render(true);
      };
    });
  }

  // ---------- header ----------

  function renderHeader() {
    const dot = $("dot");
    const age = Date.now() - lastChange;
    dot.className = "dot" + (!state ? "" : age < STALE_MS ? " live" : " stale");
    dot.title = !state ? "Not connected" : age < STALE_MS ? "Live" : `No update for ${Math.round(age / 1000)}s`;
    if (!state) return;
    $("hWorld").textContent = sum.title ? "Title / menu" : sum.world ? displayWorld(sum.world) : `World ${hex2(state.world)}`;
    const n = hereNode();
    $("hRoom").textContent = sum.title ? "" : (n ? L.labelOf(n) : `Room ${hex2(state.room)}`) +
      (sum.world && !sum.worldVerified ? " · world id unverified" : "");
    $("hLevel").innerHTML = sum.title ? "" : `<b>LV</b>${state.level}`;
  }

  // ---------- Here ----------

  function renderHere() {
    const el = $("v-here");
    if (!state) { el.innerHTML = `<div class="empty">Waiting for <code>${esc(STATE_URL)}</code>…</div>`; return; }
    const world = sum.world;
    if (!world || !L.MAPS[world]) {
      el.innerHTML = `<div class="empty">${sum.title ? "On the title screen." : "Nothing to track in this world."}</div>`;
      return;
    }
    const n = hereNode();
    const chests = L.chestsFor(world, sum.opened);
    const multi = L.nodesOf(world).length > 1;
    el.innerHTML =
      progressCard(displayWorld(world) + " chests", sum.worlds[world].got, sum.worlds[world].total) +
      `<div class="row" style="margin-bottom:10px">` +
      (multi ? `<button class="chip" id="pickRoom">${n ? "In: " + esc(L.labelOf(n)) : "Which room is this?"}</button>` : "") +
      `<span class="grow"></span>${toggles()}</div>` +
      `<div class="card">${chestList(chests, n && n.id)}</div>`;
    if ($("pickRoom")) $("pickRoom").onclick = () => openRoomPicker(world);
    wireToggles(el);
  }

  // ---------- Map ----------

  const CELL_W = 118, CELL_H = 70, BOX_W = 104, BOX_H = 50;

  function mapSvg(world, hereId) {
    const map = L.MAPS[world];
    const chests = L.chestsFor(world, sum.opened);
    const byNode = {};
    for (const c of chests) (byNode[c.node] = byNode[c.node] || []).push(c);
    const cols = Math.max(...map.nodes.map((n) => n.x)) + 1;
    const rows = Math.max(...map.nodes.map((n) => n.y)) + 1;
    const cx = (n) => n.x * CELL_W + CELL_W / 2, cy = (n) => n.y * CELL_H + CELL_H / 2;
    const at = Object.fromEntries(map.nodes.map((n) => [n.id, n]));

    const edges = map.edges.map(([a, b, kind]) => {
      if (!at[a] || !at[b]) return "";
      return `<line x1="${cx(at[a])}" y1="${cy(at[a])}" x2="${cx(at[b])}" y2="${cy(at[b])}" class="edge ${kind === "approx" ? "approx" : ""}"/>`;
    }).join("");

    const nodes = map.nodes.map((n) => {
      const cs = byNode[n.id] || [];
      const left = cs.filter((c) => !c.got).length;
      const pup = cs.some((c) => !c.got && L.isPuppies(c));
      const cls = ["node", n.id === hereId ? "here" : "", cs.length && !left ? "done" : "", cs.length ? "" : "bare"].join(" ");
      const x = cx(n) - BOX_W / 2, y = cy(n) - BOX_H / 2;
      const label = L.labelOf(n);
      const lines = label.length > 13 && label.includes(" ") ? splitLabel(label) : [label];
      return `<g class="${cls}" data-node="${esc(n.id)}">` +
        `<rect x="${x}" y="${y}" width="${BOX_W}" height="${BOX_H}" rx="9"/>` +
        lines.map((t, i) => `<text x="${cx(n)}" y="${cy(n) + (i - (lines.length - 1) / 2) * 14 + (cs.length ? -5 : 4)}" class="nl">${esc(t)}</text>`).join("") +
        (cs.length ? `<text x="${cx(n)}" y="${y + BOX_H - 7}" class="nc">${left ? left + " left" : "✓ all"}</text>` : "") +
        (n.save ? `<use href="#ico-save" x="${x - 6}" y="${y - 6}" width="18" height="18"/>` : "") +
        (pup ? `<use href="#ico-paw" x="${x + BOX_W - 12}" y="${y - 5}" width="16" height="16"/>` : "") +
        `</g>`;
    }).join("");

    return `<svg class="map" viewBox="0 0 ${cols * CELL_W} ${rows * CELL_H}" preserveAspectRatio="xMidYMin meet">${edges}${nodes}</svg>`;
  }

  function splitLabel(s) {
    const words = s.split(" ");
    let best = [s, ""], bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
      const d = Math.abs(a.length - b.length);
      if (d < bestDiff) { best = [a, b]; bestDiff = d; }
    }
    return best;
  }

  function renderMap() {
    const el = $("v-map");
    if (!state) { el.innerHTML = `<div class="empty">Waiting for game…</div>`; return; }
    const world = mapWorld || (L.MAPS[sum.world] ? sum.world : null);
    if (!world) {
      el.innerHTML = `<div class="empty">${sum.title ? "On the title screen." : "No map for this world."}<br><br>` +
        `<button class="chip" id="pickMapWorld">Pick a world</button></div>`;
      $("pickMapWorld").onclick = openWorldPicker;
      return;
    }
    const n = world === sum.world ? hereNode() : null;
    const approx = L.MAPS[world].edges.some((e) => e[2] === "approx");
    el.innerHTML =
      `<div class="row" style="margin-bottom:8px"><button class="chip" id="pickMapWorld">${esc(displayWorld(world))} ▾</button>` +
      (mapWorld && mapWorld !== sum.world && L.MAPS[sum.world] ? `<button class="chip" id="mapHere">Current world</button>` : "") +
      `<span class="grow"></span><span class="sub">${sum.worlds[world].got}/${sum.worlds[world].total}</span></div>` +
      `<div class="card mapcard">${mapSvg(world, n && n.id)}</div>` +
      `<div class="legend"><span><i class="lg here"></i>you</span><span>${icon("ico-save", "")}save</span>` +
      `<span>${icon("ico-paw", "")}puppies</span>${approx ? '<span><i class="lg dash"></i>exit not confirmed</span>' : ""}</div>`;
    $("pickMapWorld").onclick = openWorldPicker;
    if ($("mapHere")) $("mapHere").onclick = () => { mapWorld = null; render(true); };
    el.querySelectorAll("[data-node]").forEach((g) => { g.onclick = () => openNodeSheet(world, g.dataset.node); });
  }

  function openNodeSheet(world, id) {
    const nd = L.node(world, id);
    const chests = L.chestsFor(world, sum.opened).filter((c) => c.node === id);
    const ids = (nd.rooms || []).map(hex2).join(", ");
    openSheet(
      `<h2>${esc(L.labelOf(nd))}</h2><div class="sub">${esc(displayWorld(world))}` +
      `${nd.save ? " · save point" : ""}${ids ? " · room " + ids : ""}</div>` +
      `<div style="margin-top:8px">${chests.length
        ? `<ul class="list">${chests.sort((a, b) => a.got - b.got || a.n.localeCompare(b.n)).map((c) => chestRow(c, { showRoom: false })).join("")}</ul>`
        : '<div class="empty">No chests in this room.</div>'}</div>` +
      `<div class="row"><span class="grow"></span><button class="chip" data-close>Close</button></div>`,
    );
  }

  // ---------- Worlds ----------

  function renderWorlds() {
    const el = $("v-worlds");
    if (!state) { el.innerHTML = `<div class="empty">Waiting for game…</div>`; return; }
    if (worldDetail) {
      const w = sum.worlds[worldDetail];
      el.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="chip" id="back">‹ All</button>` +
        `<button class="chip" id="toMap">Map</button><span class="grow"></span>${toggles()}</div>` +
        progressCard(displayWorld(worldDetail) + " chests", w.got, w.total) +
        `<div class="card">${chestList(L.chestsFor(worldDetail, sum.opened), null)}</div>`;
      $("back").onclick = () => { worldDetail = null; render(true); };
      $("toMap").onclick = () => { mapWorld = worldDetail; worldDetail = null; setView("map"); };
      wireToggles(el);
      return;
    }
    el.innerHTML = `<div class="grid">${Object.entries(sum.worlds).map(([w, { got, total }]) =>
      `<button data-w="${esc(w)}" class="${w === sum.world ? "cur" : ""}"><div class="wn">${esc(displayWorld(w))}</div>` +
      `<div class="wc">${got} / ${total}</div><div class="bar ${got === total ? "done" : ""}"><i style="width:${total ? got / total * 100 : 0}%"></i></div></button>`
    ).join("")}</div>`;
    el.querySelectorAll("[data-w]").forEach((b) => { b.onclick = () => { worldDetail = b.dataset.w; render(true); }; });
  }

  // ---------- Collect ----------

  function renderCollect() {
    const el = $("v-collect");
    if (!state) { el.innerHTML = `<div class="empty">Waiting for game…</div>`; return; }
    const pupLeft = sum.puppyChests.filter((c) => !c.got);
    el.innerHTML =
      progressCard("All chests", sum.chestsGot, sum.chestsTotal) +
      progressCard("Dalmatians found", sum.puppies, 99) +
      `<div class="card"><div class="label">Puppy chests left · ${pupLeft.length} of ${sum.puppyChests.length}</div>` +
      (pupLeft.length
        ? `<ul class="list">${pupLeft.sort((a, b) => a.w.localeCompare(b.w) || a.n.localeCompare(b.n)).map((c) =>
          `<li>${icon("ico-chest")}<span class="grow"><span class="name">${esc(c.n.replace(/ Chest$/, ""))}</span>` +
          `<div class="sub">${esc(displayWorld(c.w))}${c.node ? " · " + esc(L.labelOf(L.node(c.w, c.node))) : ""}</div></span></li>`).join("")}</ul>`
        : '<div class="empty">All puppy chests opened.</div>') + `</div>` +
      progressCard("Postcards mailed", sum.postcards, 10) +
      `<div class="card"><div class="label">Ansem's Reports · ${sum.reports.filter((r) => r.got).length} / ${sum.reports.length}</div>` +
      `<ul class="list">${sum.reports.map((r) =>
        `<li class="${r.got ? "got" : ""}">${icon(r.got ? "ico-report" : "ico-report-missing")}<span class="grow"><span class="name">Report ${r.num}</span>` +
        `<div class="sub">${esc(r.w)}: ${esc(r.n.replace(/ Ansem's Report \d+$/, ""))}</div></span></li>`).join("")}</ul></div>`;
  }

  // ---------- sheets ----------

  function openSheet(html) {
    $("sheetBody").innerHTML = html;
    $("sheet").classList.add("on");
    $("sheetBody").querySelectorAll("[data-close]").forEach((b) => { b.onclick = closeSheet; });
  }
  function closeSheet() { $("sheet").classList.remove("on"); render(true); }
  $("sheet").onclick = (e) => { if (e.target.id === "sheet") closeSheet(); };

  function openRoomPicker(world) {
    const key = state.world + ":" + state.room, cur = hereNode();
    openSheet(
      `<h2>Which room is this?</h2><div class="sub">${esc(displayWorld(world))}, room ${hex2(state.room)}. ` +
      `Saved on this device; that room's chests get pinned to the top and it lights up on the map.</div>` +
      `<div class="opts">${L.nodesOf(world).map((n) =>
        `<button class="chip ${cur && n.id === cur.id ? "on" : ""}" data-n="${esc(n.id)}">${esc(L.labelOf(n))}</button>`).join("")}</div>` +
      `<div class="row"><button class="chip" data-n="">Clear</button><span class="grow"></span><button class="chip" data-close>Cancel</button></div>`,
    );
    $("sheetBody").querySelectorAll("[data-n]").forEach((b) => {
      b.onclick = () => {
        if (b.dataset.n) roomLabels[key] = b.dataset.n; else delete roomLabels[key];
        store.set("rooms", roomLabels);
        closeSheet();
      };
    });
  }

  function openWorldPicker() {
    openSheet(
      `<h2>Show map for</h2><div class="opts">${Object.keys(sum.worlds).map((w) =>
        `<button class="chip" data-w="${esc(w)}">${esc(displayWorld(w))}</button>`).join("")}</div>` +
      `<div class="row"><span class="grow"></span><button class="chip" data-close>Cancel</button></div>`,
    );
    $("sheetBody").querySelectorAll("[data-w]").forEach((b) => {
      b.onclick = () => { mapWorld = b.dataset.w === sum.world ? null : b.dataset.w; closeSheet(); };
    });
  }

  // ---------- render loop ----------

  let lastRendered = null;
  function render(force) {
    renderHeader();
    if ($("sheet").classList.contains("on")) return;  // don't yank the sheet mid-tap
    // Heartbeat writes bump seq/t only; re-rendering on those would swap buttons out from under a tap.
    const data = state ? JSON.stringify({ ...state, seq: 0, t: 0 }) : "";
    const sig = [data, view, showOpened, showContents, worldDetail, mapWorld, JSON.stringify(roomLabels)].join("|");
    if (!force && sig === lastRendered) return;
    lastRendered = sig;
    ({ here: renderHere, map: renderMap, worlds: renderWorlds, collect: renderCollect })[view]();
  }

  function setView(v) {
    view = v; store.set("view", view);
    if (view !== "worlds") worldDetail = null;
    document.querySelectorAll("nav button").forEach((x) => x.classList.toggle("on", x.dataset.view === view));
    document.querySelectorAll(".view").forEach((s) => s.classList.toggle("on", s.id === "v-" + view));
    document.querySelector("main").scrollTop = 0;
    render(true);
  }
  document.querySelectorAll("nav button").forEach((b) => { b.onclick = () => setView(b.dataset.view); });
  setView(view);

  // State arrives either from the Android wrapper (window.KH1Companion.push(json))
  // or by polling STATE_URL over http.
  function accept(next) {
    if (!next || typeof next.seq !== "number") return;
    if (next.seq !== lastSeq) { lastSeq = next.seq; lastChange = Date.now(); }
    state = next;
    sum = L.summarize(state);
    render();
  }
  window.KH1Companion = { push: (s) => accept(typeof s === "string" ? JSON.parse(s) : s) };

  async function poll() {
    try {
      const r = await fetch(STATE_URL + (STATE_URL.includes("?") ? "&" : "?") + "_=" + Date.now(), { cache: "no-store" });
      if (r.ok) accept(await r.json());
    } catch { /* file mid-swap or not there yet */ }
    renderHeader();
    setTimeout(poll, POLL_MS);
  }
  if (params.has("native")) setInterval(renderHeader, 1000);
  else poll();
})();
