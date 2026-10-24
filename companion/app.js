// KH1 Second-Screen Companion: bottom-screen UI.
// Gets snapshots from the bridge (polled over http, or pushed by the Android
// wrapper), decodes them with logic.js, and renders.
(function () {
  "use strict";

  const L = window.KH1Logic;
  const params = new URLSearchParams(location.search);
  const STATE_URL = params.get("state") || "state.json";
  const POLL_MS = 250;
  const STALE_MS = 8000;  // bridge heartbeat is every 2 s; allow for emulation hiccups
  const VIEWS = ["here", "guide", "map", "progress", "level"];
  const OLD_VIEWS = { worlds: "progress", collect: "progress" };  // tabs merged into Progress
  const TOAST_MS = 4500;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const store = {
    get(k, d) { try { const v = localStorage.getItem("kh1c:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("kh1c:" + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  let state = null, sum = null;
  let lastSeq = null, lastChange = 0;
  // ?view= opens a given tab (screenshots, dev), otherwise the last one used.
  const asView = (v) => OLD_VIEWS[v] || v;
  let view = [asView(params.get("view")), asView(store.get("view"))].find((v) => VIEWS.includes(v)) || "here";
  // "first": the guide and names reveal in layers; "replay": everything shown up front.
  let mode = store.get("mode", "first");
  const replay = () => mode === "replay";
  let showOpened = store.get("showOpened", false);
  let showContents = store.get("showContents", true);
  let showNeeds = store.get("showNeeds", false);  // name what a locked chest needs (mild spoiler)
  let worldDetail = null;   // Worlds tab: world whose chest list is open
  let mapWorld = null;      // Map tab: world shown instead of the current one
  let guideWorld = null;    // Guide tab: world shown instead of the current one
  const hintsShown = new Set();  // guide steps the player chose to reveal in full
  const hintsHidden = new Set(); // replay: steps the player folded back up
  const whereShown = new Set();  // guide steps whose location the player asked for
  const stepFull = (key) => (replay() ? !hintsHidden.has(key) : hintsShown.has(key));
  let mapFocus = null;           // Map tab: room ringed after "Show on map"
  const guideSeen = new Set(store.get("guideSeen", []));  // steps seen done whose evidence can leave the save
  let levelPick = store.get("levelPick", {});  // the player's own path / curve choice
  let levelAll = false;  // Level tab: full table instead of the next few levels
  let waitHelp = false;  // waiting screen: troubleshooting shown
  let visitedRooms = store.get("visited", {});  // world -> map rooms this device has seen the player in
  let allNames = store.get("allNames", false);  // show every room name, visited or not

  const icon = (id, cls = "ico") => `<svg class="${cls}"><use href="#${id}"/></svg>`;
  const hex2 = (n) => "0x" + n.toString(16).toUpperCase().padStart(2, "0");
  const hereNode = () => (state ? L.nodeForRoom(state) : null);
  const displayWorld = (w) => (w === "Awakening" ? "Dive to the Heart" : w);
  // Worlds the save hasn't reached stay unnamed; ones only on the Gummi map show their name, nothing more.
  const visited = (w) => !sum || replay() || sum.found[w] === "visited";
  const visitedWorlds = (list) => list.filter(visited);
  // Room names stay hidden until the player has been there (or asks for all names).
  const knownCache = {};
  function roomKnown(world, id) {
    if (allNames || !id) return true;
    const key = world + "|" + lastRendered;
    if (!knownCache[key]) {
      const set = L.knownRooms(world, state, sum.opened, visitedRooms[world], guideSeen);
      for (const k of Object.keys(knownCache)) delete knownCache[k];
      knownCache[key] = set;
    }
    const step = L.guideFor(world, state, guideSeen).next;
    return knownCache[key].has(id) || !!(step && step.where === id && (whereShown.has(step.key) || stepFull(step.key)));
  }
  const roomLabel = (world, nd) => (nd && roomKnown(world, nd.id) ? L.labelOf(nd) : "???");

  // ---------- shared pieces ----------

  const needText = (lock) => (lock[0] === "story" ? "Opens later in the story" : showNeeds ? "Needs " + lock.join(" + ") : "Can't reach it yet");
  // Reports named after a boss fight would spoil it: say how, not who.
  const reportHow = (r) => r.n.replace(/ Ansem's Report \d+$/, "").replace(/^Defeat .+$/, "After a boss fight");

  function chestRow(c, opts) {
    const n = c.node && L.node(c.w, c.node);
    const known = !n || roomKnown(c.w, n.id);
    const sub = [opts.showRoom && n && known ? L.labelOf(n) : null, showContents && c.i ? c.i : null,
      c.lock ? needText(c.lock) : null].filter(Boolean).join(" · ");
    // Outside a room's own sheet, tapping a chest opens its room (and from there the map).
    const tap = !opts.inSheet && n ? ` data-cw="${esc(c.w)}" data-cn="${esc(n.id)}"` : "";
    return `<li${tap} class="${c.got ? "got" : ""} ${opts.here ? "here" : ""} ${c.lock ? "locked" : ""}">${icon(c.got ? "ico-chest-open" : "ico-chest")}` +
      `<span class="grow"><span class="name">${known ? esc(c.n.replace(/ Chest$/, "")) : "Chest in a room you haven't been to"}</span>` +
      (sub ? `<div class="sub">${esc(sub)}</div>` : "") + `</span>` +
      (L.isPuppies(c) ? `<span class="tag pup">${icon("ico-paw", "")}Pups</span>` : "") +
      (c.lock ? '<span class="tag later">Later</span>' : opts.here ? '<span class="tag here">Here</span>' : "") + `</li>`;
  }

  function chestList(chests, hereId, opts = {}) {
    let rows = showOpened ? chests : chests.filter((c) => !c.got);
    const isHere = (c) => !!hereId && c.node === hereId;
    rows = rows.slice().sort((a, b) => (a.got - b.got) || (!!a.lock - !!b.lock) || (isHere(b) - isHere(a)) || a.n.localeCompare(b.n));
    if (!rows.length) return `<div class="empty">${chests.length ? "Every chest here is open." : "No chests here."}</div>`;
    return `<ul class="list">${rows.map((c) => chestRow(c, { here: isHere(c), showRoom: opts.showRoom !== false })).join("")}</ul>`;
  }

  function progressCard(title, got, total, extra = "") {
    const pct = total ? Math.round(got / total * 100) : 0;
    return `<div class="card"><div class="row"><div class="grow"><div class="label">${esc(title)}</div>` +
      `<div class="big">${got}<span class="sub"> / ${total}</span></div></div>${extra}</div>` +
      `<div class="bar ${got === total && total ? "done" : ""}"><i style="width:${pct}%"></i></div></div>`;
  }

  // Everything about how much the app reveals, in one sheet: the playthrough mode, then each switch.
  const LIST_OPTIONS = [
    ["showOpened", "Opened chests", "Also list the chests you've already opened."],
    ["showContents", "What's inside", "Show what each chest holds."],
    ["showNeeds", "What unlocks them", "For chests you can't reach yet, name the ability or item you need, like Glide or a Trinity."],
    ["allNames", "Room names", "Name rooms you haven't been to yet, on the map and in lists."],
  ];
  const optionOn = { showOpened: () => showOpened, showContents: () => showContents, showNeeds: () => showNeeds, allNames: () => allNames };
  function setOption(k, on) {
    if (k === "showOpened") showOpened = on;
    else if (k === "showContents") showContents = on;
    else if (k === "showNeeds") showNeeds = on;
    else allNames = on;
    store.set(k, on);
  }
  // Replay turns every reveal on; first time puts the spoilers back behind their buttons.
  function setMode(m) {
    mode = m; store.set("mode", m);
    const on = m === "replay";
    setOption("showNeeds", on); setOption("allNames", on);
    if (on) setOption("showContents", true);
    hintsHidden.clear();
  }
  function toggles() {
    const n = ["showOpened", "showContents", "showNeeds"].filter((k) => optionOn[k]()).length;
    return `<button class="chip" data-options>Show${n ? ` (${n})` : ""} ▾</button>`;
  }
  function wireToggles(root) {
    root.querySelectorAll("[data-options]").forEach((b) => { b.onclick = openShowSheet; });
  }
  function openShowSheet() {
    openSheet(`<h2>What to show</h2>` +
      `<div class="seg">${[["first", "First time"], ["replay", "Replay"]].map(([m, t]) =>
        `<button class="chip ${mode === m ? "on" : ""}" data-mode="${m}">${t}</button>`).join("")}</div>` +
      `<div class="sub">${replay()
        ? "Replay: room names, chest contents, what unlocks them and the full guide are all shown up front."
        : "First time: the guide hints in layers and rooms stay unnamed until you've been there. Tap Where? or Show me when you want more."}</div>` +
      `<ul class="list options">${LIST_OPTIONS.map(([k, title, desc]) =>
        `<li data-opt="${k}"><span class="grow"><span class="name">${title}</span><div class="sub">${desc}</div></span>` +
        `<span class="switch ${optionOn[k]() ? "on" : ""}"><i></i></span></li>`).join("")}</ul>` +
      `<div class="row"><span class="grow"></span><button class="chip" data-close>Done</button></div>`);
    $("sheetBody").querySelectorAll("[data-mode]").forEach((b) => {
      b.onclick = () => { if (mode !== b.dataset.mode) { setMode(b.dataset.mode); openShowSheet(); } };
    });
    $("sheetBody").querySelectorAll("[data-opt]").forEach((li) => {
      li.onclick = () => {
        const k = li.dataset.opt;
        setOption(k, !optionOn[k]());
        li.querySelector(".switch").classList.toggle("on", optionOn[k]());
      };
    });
  }

  // Rooms in a world that still hold chests, best first: what you can open now, then the most chests.
  function roomRows(world, chests, hereId) {
    const byRoom = {};
    for (const c of chests) if (c.node !== hereId) (byRoom[c.node] = byRoom[c.node] || []).push(c);
    const open = (cs) => cs.filter((c) => !c.lock).length;
    const rooms = Object.entries(byRoom).sort((a, b) => open(b[1]) - open(a[1]) || b[1].length - a[1].length);
    return rooms.map(([id, cs]) => {
      const nd = id !== "null" && L.node(world, id);
      return `<li${nd ? ` data-cw="${esc(world)}" data-cn="${esc(id)}"` : ""}>${icon("ico-chest")}<span class="grow">` +
        `<span class="name">${esc(nd ? roomLabel(world, nd) : "Elsewhere")}</span>` +
        `<div class="sub">${open(cs) === cs.length ? `${cs.length} chest${cs.length > 1 ? "s" : ""}`
          : open(cs) ? `${open(cs)} now, ${cs.length - open(cs)} later` : `${cs.length} later`}` +
        `${cs.some(L.isPuppies) ? " · puppies" : ""}${nd && !L.nodeAccess(world, nd, state).open ? " · can't get in yet" : ""}</div></span>` +
        (nd ? '<span class="tag more">›</span>' : "") + `</li>`;
    }).join("");
  }

  // ---------- header ----------

  function renderHeader() {
    const dot = $("dot");
    const age = Date.now() - lastChange;
    dot.className = "dot" + (!state ? "" : age < STALE_MS ? " live" : " stale");
    dot.title = !state ? "Not connected" : age < STALE_MS ? "Live" : `No update for ${Math.round(age / 1000)}s`;
    $("modeBtn").hidden = !state || sum.title;
    if (!state) return;
    $("hWorld").textContent = sum.title ? "Title / menu" : sum.world ? displayWorld(sum.world) : `World ${hex2(state.world)}`;
    const n = hereNode();
    $("hRoom").textContent = sum.title ? "" : sum.room || (n ? L.labelOf(n) : `Room ${hex2(state.room)}`);
    $("hLevel").innerHTML = sum.title ? "" : `<b>LV</b>${state.level}`;
  }

  // ---------- Here ----------

  function renderHere() {
    const el = $("v-here");
    const world = sum.world;
    if (!world || !L.MAPS[world]) {
      el.innerHTML = `<div class="empty">${sum.title ? "On the title screen." : "Nothing to track in this world."}</div>`;
      return;
    }
    // What now, at a glance: the story nudge, this room's chests, then where else to look.
    const n = hereNode();
    const chests = L.chestsFor(world, sum.opened, state);
    const { got, total } = sum.worlds[world];
    const next = L.GUIDE[world] ? L.guideFor(world, state, guideSeen).next : null;
    const inRoom = n ? chests.filter((c) => c.node === n.id) : [];
    const elsewhere = chests.filter((c) => !c.got && (!n || c.node !== n.id));
    const reportsLeft = sum.reports.filter((r) => r.w === world && !r.got);
    el.innerHTML =
      `<div class="row here-top"><span class="map-count">${icon("ico-chest", "")}<b>${got} of ${total}</b></span>` +
      `<div class="bar grow ${got === total && total ? "done" : ""}"><i style="width:${total ? got / total * 100 : 0}%"></i></div>${toggles()}</div>` +
      (next ? `<div class="card next-mini" id="toGuide"><div class="label">Next step${next.optional ? " · optional" : ""}</div>` +
        `<div class="row"><div class="step-nudge grow">${esc(stepFull(next.key) ? next.title : next.nudge)}</div><span class="tag more">Guide ›</span></div></div>` : "") +
      (n ? `<div class="card"><div class="label">In ${esc(sum.room || L.labelOf(n))}</div>` +
        (inRoom.some((c) => showOpened || !c.got) ? chestList(inRoom, n.id, { showRoom: false })
          : `<div class="empty small">${inRoom.length ? "Every chest in this room is open." : "No chests in this room."}</div>`) + `</div>` : "") +
      `<div class="card"><div class="label">${n ? "Elsewhere in" : "Left in"} ${esc(displayWorld(world))} · ${elsewhere.length} chest${elsewhere.length === 1 ? "" : "s"}</div>` +
      (elsewhere.length ? `<ul class="list">${roomRows(world, elsewhere, n && n.id)}</ul>` : `<div class="empty small">Nothing left anywhere else here.</div>`) +
      (reportsLeft.length ? `<div class="label" style="margin-top:10px">Ansem's Reports here</div><ul class="list">${reportsLeft.map((r) =>
        `<li>${icon("ico-report-missing")}<span class="grow"><span class="name">Report ${r.num}</span><div class="sub">${esc(reportHow(r))}</div></span></li>`).join("")}</ul>` : "") +
      `</div>`;
    wireToggles(el);
    if ($("toGuide")) $("toGuide").onclick = () => { guideWorld = null; setView("guide"); };
  }

  // ---------- Map ----------

  const CELL_W = 118, CELL_H = 70, BOX_W = 104, BOX_H = 50;

  function mapSvg(world, hereId, goalId) {
    const map = L.MAPS[world];
    const chests = L.chestsFor(world, sum.opened, state);
    const byNode = {};
    for (const c of chests) (byNode[c.node] = byNode[c.node] || []).push(c);
    const cols = Math.max(...map.nodes.map((n) => n.x)) + 1;
    const rows = Math.max(...map.nodes.map((n) => n.y)) + 1;
    const cx = (n) => n.x * CELL_W + CELL_W / 2, cy = (n) => n.y * CELL_H + CELL_H / 2;
    const at = Object.fromEntries(map.nodes.map((n) => [n.id, n]));

    const edges = map.edges.map(([a, b]) => {
      if (!at[a] || !at[b]) return "";
      return `<line x1="${cx(at[a])}" y1="${cy(at[a])}" x2="${cx(at[b])}" y2="${cy(at[b])}" class="edge"/>`;
    }).join("");

    const nodes = map.nodes.map((n) => {
      const cs = byNode[n.id] || [];
      const left = cs.filter((c) => !c.got).length;
      const reachable = cs.filter((c) => !c.got && !c.lock).length;
      const pup = cs.some((c) => !c.got && L.isPuppies(c));
      const shut = !L.nodeAccess(world, n, state).open && n.id !== hereId;
      let cls = ["node", n.id === hereId ? "here" : "", n.id === goalId ? "goal" : "", cs.length && !left ? "done" : "",
        cs.length ? "" : "bare", shut ? "shut" : "", !shut && left && !reachable ? "later" : ""].join(" ");
      const x = cx(n) - BOX_W / 2, y = cy(n) - BOX_H / 2;
      const label = roomLabel(world, n);
      if (label === "???") cls += " unknown";
      const lines = label.length > 13 && label.includes(" ") ? splitLabel(label) : [label];
      return `<g class="${cls}" data-node="${esc(n.id)}">` +
        (n.id === goalId ? `<rect x="${x - 5}" y="${y - 5}" width="${BOX_W + 10}" height="${BOX_H + 10}" rx="12" class="goalring"/>` : "") +
        (n.id === mapFocus ? `<rect x="${x - 5}" y="${y - 5}" width="${BOX_W + 10}" height="${BOX_H + 10}" rx="12" class="focusring"/>` : "") +
        `<rect x="${x}" y="${y}" width="${BOX_W}" height="${BOX_H}" rx="9"/>` +
        lines.map((t, i) => `<text x="${cx(n)}" y="${cy(n) + (i - (lines.length - 1) / 2) * 14 + (cs.length ? -5 : 4)}" class="nl">${esc(t)}</text>`).join("") +
        (cs.length ? `<text x="${cx(n)}" y="${y + BOX_H - 7}" class="nc">${!left ? "✓ all" : shut || !reachable ? left + " later"
          : reachable < left ? `${reachable} + ${left - reachable} later` : left + " left"}</text>` : "") +
        (shut ? `<use href="#ico-lock" x="${x + BOX_W - 13}" y="${y - 6}" width="18" height="18"/>` : "") +
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
    const world = mapWorld || (L.MAPS[sum.world] ? sum.world : null);
    if (!world) {
      el.innerHTML = `<div class="empty">${sum.title ? "On the title screen." : "No map for this world."}<br><br>` +
        `<button class="chip" id="pickMapWorld">Pick a world</button></div>`;
      $("pickMapWorld").onclick = openWorldPicker;
      return;
    }
    const n = world === sum.world ? hereNode() : null;
    const next = L.guideFor(world, state, guideSeen).next;
    const goal = next && (whereShown.has(next.key) || stepFull(next.key)) ? next : null;  // only once the player asked "Where?"
    const anyShut = L.nodesOf(world).some((nd) => !L.nodeAccess(world, nd, state).open);
    el.innerHTML =
      `<div class="row" style="margin-bottom:8px"><button class="chip" id="pickMapWorld">${esc(displayWorld(world))} ▾</button>` +
      (mapWorld && mapWorld !== sum.world && L.MAPS[sum.world] ? `<button class="chip" id="mapHere">Current world</button>` : "") +
      `<span class="grow"></span><span class="map-count">${icon("ico-chest", "")}<b>${sum.worlds[world].got} of ${sum.worlds[world].total}</b> chests opened</span>` +
      `<span class="grow"></span><button class="chip ${allNames ? "on" : ""}" id="allNames">${allNames ? "Hide names" : "Unhide names"}</button></div>` +
      `<div class="card mapcard">${mapSvg(world, n && n.id, goal && goal.where)}</div>` +
      `<div class="legend"><span><i class="lg here"></i>you</span>${goal && goal.where ? '<span><i class="lg goal"></i>next step</span>' : ""}<span>${icon("ico-save", "")}save</span>` +
      `<span>${icon("ico-paw", "")}puppies</span>${anyShut ? `<span>${icon("ico-lock", "")}can't go in yet</span>` : ""}` +
      (mapFocus && L.node(world, mapFocus) ? '<span><i class="lg focus"></i>the room you picked</span>' : "") +
      `</div>`;
    $("pickMapWorld").onclick = openWorldPicker;
    $("allNames").onclick = () => { allNames = !allNames; store.set("allNames", allNames); render(true); };
    if ($("mapHere")) $("mapHere").onclick = () => { mapWorld = null; render(true); };
    el.querySelectorAll("[data-node]").forEach((g) => { g.onclick = () => openNodeSheet(world, g.dataset.node); });
  }

  function openNodeSheet(world, id) {
    const nd = L.node(world, id);
    const chests = L.chestsFor(world, sum.opened, state).filter((c) => c.node === id);
    const ids = (nd.rooms || []).map(hex2).join(", ");
    const access = L.nodeAccess(world, nd, state);
    openSheet(
      `<h2>${esc(roomLabel(world, nd))}</h2><div class="sub">${esc(displayWorld(world))}` +
      (roomKnown(world, nd.id) ? `${nd.save ? " · save point" : ""}${ids ? " · room " + ids : ""}` : " · you haven't been here yet") + `</div>` +
      (access.open ? "" : `<div class="hint">${icon("ico-lock", "chip-ico")}` +
        (access.scene ? "You can't walk in here. The story brings you here when it's time."
          : access.story ? "You can't get in here yet. It opens up later in the story." : `You can't get in here yet. Needs ${esc(access.need.join(" + "))}.`) +
        `</div>`) +
      `<div style="margin-top:8px">${chests.length
        ? `<ul class="list">${chests.sort((a, b) => a.got - b.got || a.n.localeCompare(b.n)).map((c) => chestRow(c, { showRoom: false, inSheet: true })).join("")}</ul>`
        : '<div class="empty">No chests in this room.</div>'}</div>` +
      `<div class="row">${view === "map" && (mapWorld || sum.world) === world ? "" : `<button class="chip" id="showOnMap">${icon("ico-pin", "chip-ico")}Show on map</button>`}` +
      `<span class="grow"></span><button class="chip" data-close>Close</button></div>`,
    );
    if ($("showOnMap")) $("showOnMap").onclick = () => {
      mapWorld = world === sum.world ? null : world;
      mapFocus = id;
      $("sheet").classList.remove("on");
      setView("map");
    };
  }

  // ---------- Guide ----------

  // Next step, revealed in layers: the nudge always; "Where?" adds the room and the map
  // marker; "Show me" names the event and gives the full hint.
  function stepCard(world, step, current) {
    const key = step.key;
    const where = step.where ? L.node(world, step.where) : null;
    const full = stepFull(key), placed = whereShown.has(key) || full;
    const counts = step.counts ? `<div class="counts">${step.counts.map((c) =>
      `<span class="count ${c.have != null && c.have >= c.n ? "ok" : ""}">${esc(c.name)} ${c.have == null ? "?" : Math.min(c.have, c.n)}/${c.n}</span>`).join("")}</div>` : "";
    return `<div class="card guide-next"><div class="label">${current ? "Next step" : "Next"} · ${esc(displayWorld(world))}` +
      `${step.optional ? " · optional" : ""}</div>` +
      `<div class="step-nudge">${esc(step.nudge)}</div>` + counts +
      (full ? `<div class="step-title">${esc(step.title)}</div>` : "") +
      `<div class="row" style="margin-top:10px">` +
      (where ? (placed
        ? `<button class="chip" data-goto="${esc(world)}">${icon("ico-pin", "chip-ico")}${esc(L.labelOf(where))}</button>`
        : `<button class="chip" data-where="${esc(key)}">${icon("ico-pin", "chip-ico")}Where?</button>`) : "") +
      `<span class="grow"></span><button class="chip ${full ? "on" : ""}" data-hint="${esc(key)}">${full ? "Hide" : "Show me"}</button></div>` +
      (full ? `<div class="hint">${esc(step.hint)}</div>` : "") + `</div>`;
  }

  // Checklist: done steps by name with what they gave; the next one as its nudge; later ones hidden.
  function storyList(world, g) {
    return `<div class="card"><div class="label">Story · ${esc(displayWorld(world))}</div><ul class="list">${g.steps.map((s) => {
      const isNext = s === g.next;
      const ahead = !s.done && !isNext;  // later steps: hidden on a first playthrough
      const text = s.done || (replay() && !isNext) ? esc((s.optional && !s.done ? "Optional: " : "") + s.title)
        : isNext ? esc(stepFull(s.key) ? s.title : s.nudge) : s.optional ? "Optional: ???" : "???";
      const sub = s.done && s.rewards && s.rewards.length ? `Got ${esc(s.rewards.join(", "))}`
        : ahead && replay() && s.rewards && s.rewards.length ? `Gives ${esc(s.rewards.join(", "))}`
        : s.done === null && s.p != null ? "Needs the updated bridge script" : "";
      return `<li class="${s.done ? "got" : ""} ${isNext ? "here" : ""} ${ahead && !replay() ? "hidden-step" : ""}">` +
        `<span class="step-dot ${s.done ? "done" : s.done === null ? "unknown" : ""}"></span>` +
        `<span class="grow"><span class="name">${text}</span>${sub ? `<div class="sub">${sub}</div>` : ""}</span></li>`;
    }).join("")}</ul></div>`;
  }

  function renderGuide() {
    const el = $("v-guide");
    const world = guideWorld || (L.GUIDE[sum.world] ? sum.world : null);

    if (!world) {
      // Title screen or a world without story steps: every world's next step at a glance.
      const unseen = Object.keys(L.GUIDE).filter((w) => !visited(w)).length;
      el.innerHTML = `<div class="card"><div class="label">Story progress</div><ul class="list">` +
        visitedWorlds(Object.keys(L.GUIDE)).map((w) => {
          const g = L.guideFor(w, state, guideSeen);
          const done = g.steps.filter((s) => s.done).length;
          return `<li data-gw="${esc(w)}"><span class="grow"><span class="name">${esc(displayWorld(w))}</span>` +
            `<div class="sub">${g.next ? (done ? esc(g.next.nudge) : "Not started") : "Story complete"}</div></span>` +
            `<span class="tag ${g.next ? "" : "here"}">${done}/${g.steps.length}</span></li>`;
        }).join("") + (unseen ? `<li class="hidden-step"><span class="grow"><span class="name">???</span>` +
          `<div class="sub">${unseen} more world${unseen > 1 ? "s" : ""} to find</div></span></li>` : "") + `</ul></div>`;
      el.querySelectorAll("[data-gw]").forEach((li) => { li.onclick = () => { guideWorld = li.dataset.gw; render(true); }; });
      return;
    }

    const g = L.guideFor(world, state, guideSeen);
    const current = world === sum.world;
    // The Guide is the story; chests and reports live on Here and Progress.
    el.innerHTML =
      `<div class="row" style="margin-bottom:10px"><button class="chip" id="guidePick">${esc(displayWorld(world))} ▾</button>` +
      (guideWorld && guideWorld !== sum.world && L.GUIDE[sum.world] ? `<button class="chip" id="guideHere">Current world</button>` : "") +
      `<span class="grow"></span></div>` +
      (g.next ? stepCard(world, g.next, current)
        : g.steps.length ? `<div class="card"><div class="label">Story · ${esc(displayWorld(world))}</div><div class="empty">Story complete here.</div></div>` : "") +
      (g.steps.length ? storyList(world, g) : "");

    el.querySelectorAll("[data-hint]").forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.hint, set = replay() ? hintsHidden : hintsShown;
        if (set.has(k)) set.delete(k); else set.add(k);
        render(true);
      };
    });
    el.querySelectorAll("[data-where]").forEach((b) => { b.onclick = () => { whereShown.add(b.dataset.where); render(true); }; });
    el.querySelectorAll("[data-goto]").forEach((b) => {
      b.onclick = () => { mapWorld = b.dataset.goto === sum.world ? null : b.dataset.goto; setView("map"); };
    });
    $("guidePick").onclick = () => {
      openSheet(`<h2>Guide for</h2><div class="opts">${visitedWorlds(Object.keys(L.GUIDE)).map((w) =>
        `<button class="chip" data-w="${esc(w)}">${esc(displayWorld(w))}</button>`).join("")}</div>` +
        `<div class="row"><span class="grow"></span><button class="chip" data-close>Cancel</button></div>`);
      $("sheetBody").querySelectorAll("[data-w]").forEach((b) => {
        b.onclick = () => { guideWorld = b.dataset.w === sum.world ? null : b.dataset.w; closeSheet(); };
      });
    };
    if ($("guideHere")) $("guideHere").onclick = () => { guideWorld = null; render(true); };
  }

  // ---------- Progress (worlds + collectibles) ----------

  function renderProgress() {
    const el = $("v-progress");
    if (worldDetail) {
      const w = sum.worlds[worldDetail];
      el.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="chip" id="back">‹ All</button>` +
        `<button class="chip" id="toMap">Map</button><span class="grow"></span>${toggles()}</div>` +
        progressCard(displayWorld(worldDetail) + " chests", w.got, w.total) +
        `<div class="card">${chestList(L.chestsFor(worldDetail, sum.opened, state), null)}</div>`;
      $("back").onclick = () => { worldDetail = null; render(true); };
      $("toMap").onclick = () => { mapWorld = worldDetail === sum.world ? null : worldDetail; worldDetail = null; setView("map"); };
      wireToggles(el);
      return;
    }
    const entries = Object.entries(sum.worlds);
    const hidden = replay() ? 0 : entries.filter(([w]) => sum.found[w] === "hidden").length;
    const story = (w) => {
      if (!L.GUIDE[w]) return "";
      const steps = L.guideFor(w, state, guideSeen).steps.filter((s) => !s.optional);
      return steps.length ? ` · story ${steps.filter((s) => s.done).length}/${steps.length}` : "";
    };
    const pupLeft = sum.puppyChests.filter((c) => !c.got);
    const pupKnown = pupLeft.filter((c) => visited(c.w)), pupElsewhere = pupLeft.length - pupKnown.length;
    el.innerHTML =
      progressCard("All chests", sum.chestsGot, sum.chestsTotal) +
      `<div class="grid">${entries.filter(([w]) => replay() || sum.found[w] !== "hidden").map(([w, { got, total }]) => {
        const complete = total && got === total;
        return visited(w)
          ? `<button data-w="${esc(w)}" class="${w === sum.world ? "cur" : ""} ${complete ? "complete" : ""}">` +
            (complete ? `<img class="crown" src="art/crown.svg" alt="">` : "") +
            `<div class="wn">${esc(displayWorld(w))}</div>` +
            `<div class="wc">${got} / ${total}${story(w)}</div><div class="bar ${complete ? "done" : ""}"><i style="width:${total ? got / total * 100 : 0}%"></i></div></button>`
          : `<button class="unvisited" disabled><div class="wn">${esc(displayWorld(w))}</div><div class="wc">Not visited yet</div></button>`;
      }).join("")}` +
      (hidden ? `<button class="unvisited" disabled><div class="wn">???</div><div class="wc">${hidden} world${hidden > 1 ? "s" : ""} to find</div></button>` : "") +
      `</div>` +
      unlocksCard() +
      progressCard("Dalmatians found", sum.puppies, 99) +
      `<div class="card"><div class="label">Puppy chests left · ${pupLeft.length} of ${sum.puppyChests.length}</div>` +
      (pupLeft.length
        ? `<ul class="list">${pupKnown.sort((a, b) => a.w.localeCompare(b.w) || a.n.localeCompare(b.n)).map((c) => {
          const nd = c.node && L.node(c.w, c.node), known = !nd || roomKnown(c.w, nd.id);
          return `<li${nd ? ` data-cw="${esc(c.w)}" data-cn="${esc(nd.id)}"` : ""}>${icon("ico-chest")}<span class="grow">` +
            `<span class="name">${known ? esc(c.n.replace(/ Chest$/, "")) : "Chest in a room you haven't been to"}</span>` +
            `<div class="sub">${esc(displayWorld(c.w))}${nd && known ? " · " + esc(L.labelOf(nd)) : ""}</div></span></li>`;
        }).join("")}` +
          (pupElsewhere ? `<li class="hidden-step">${icon("ico-chest")}<span class="grow"><span class="name">???</span>` +
            `<div class="sub">${pupElsewhere} in worlds you haven't been to</div></span></li>` : "") + `</ul>`
        : '<div class="empty">All puppy chests opened.</div>') + `</div>` +
      progressCard("Postcards mailed", sum.postcards, 10) +
      `<div class="card"><div class="label">Ansem's Reports · ${sum.reports.filter((r) => r.got).length} / ${sum.reports.length}</div>` +
      `<ul class="list">${sum.reports.map((r) =>
        `<li class="${r.got ? "got" : ""}">${icon(r.got ? "ico-report" : "ico-report-missing")}<span class="grow"><span class="name">Report ${r.num}</span>` +
        `<div class="sub">${r.got ? `${esc(displayWorld(r.w))}: ${esc(r.n.replace(/ Ansem's Report \d+$/, ""))}`
          : visited(r.w) ? `${esc(displayWorld(r.w))}: ${esc(reportHow(r))}` : "Somewhere you haven't been"}</div></span></li>`).join("")}</ul></div>`;
    el.querySelectorAll("[data-w]").forEach((b) => { b.onclick = () => { worldDetail = b.dataset.w; render(true); }; });
    el.querySelectorAll("[data-unlock]").forEach((li) => { li.onclick = () => openUnlockSheet(li.dataset.unlock); });
    if ($("unlockShow")) $("unlockShow").onclick = () => { setOption("showNeeds", true); render(true); };
  }

  // Chests the player can't reach yet, by what would open them (story-locked rooms left out:
  // nothing to go and get for those). Only worlds the player has been to, unless replaying.
  function lockedByNeed() {
    const out = {};
    for (const w of Object.keys(sum.worlds)) {
      if (!visited(w)) continue;
      for (const c of L.chestsFor(w, sum.opened, state)) {
        if (c.got || !c.lock || c.lock[0] === "story") continue;
        const k = c.lock.join(" + ");
        (out[k] = out[k] || []).push(c);
      }
    }
    return out;
  }

  function unlocksCard() {
    const by = Object.entries(lockedByNeed()).sort((a, b) => b[1].length - a[1].length);
    if (!by.length) return "";
    const head = `<div class="card"><div class="label">What opens the most chests</div>`;
    if (!showNeeds) {
      return head + `<div class="row" style="margin-top:6px"><div class="sub grow">Names the abilities and items you don't have yet. ` +
        `${by.length} would open chests you've passed.</div><button class="chip" id="unlockShow">Show</button></div></div>`;
    }
    return head + `<ul class="list">${by.slice(0, 6).map(([k, cs]) => {
      const worlds = new Set(cs.map((c) => c.w)).size;
      return `<li data-unlock="${esc(k)}"><span class="grow"><span class="name">${esc(k)}</span>` +
        `<div class="sub">${cs.length} chest${cs.length > 1 ? "s" : ""} in ${worlds} world${worlds > 1 ? "s" : ""}</div></span>` +
        `<span class="tag more">›</span></li>`;
    }).join("")}</ul></div>`;
  }

  function openUnlockSheet(k) {
    const cs = (lockedByNeed()[k] || []).sort((a, b) => a.w.localeCompare(b.w) || a.n.localeCompare(b.n));
    openSheet(`<h2>${esc(k)}</h2><div class="sub">Opens ${cs.length} chest${cs.length > 1 ? "s" : ""} you can't reach yet.</div>` +
      `<ul class="list" style="margin-top:8px">${cs.map((c) => {
        const nd = c.node && L.node(c.w, c.node), known = !nd || roomKnown(c.w, nd.id);
        const where = [displayWorld(c.w), nd && known ? L.labelOf(nd) : null, showContents && c.i ? c.i : null].filter(Boolean).join(" · ");
        return `<li class="locked">${icon("ico-chest")}<span class="grow"><span class="name">` +
          `${known ? esc(c.n.replace(/ Chest$/, "")) : "Chest in a room you haven't been to"}</span><div class="sub">${esc(where)}</div></span>` +
          (L.isPuppies(c) ? `<span class="tag pup">${icon("ico-paw", "")}Pups</span>` : "") + `</li>`;
      }).join("")}</ul>` +
      `<div class="row"><span class="grow"></span><button class="chip" data-close>Close</button></div>`);
  }

  // ---------- Level ----------

  const ABILITY_INFO = window.KH1_ABILITY_INFO || {}, STAT_INFO = window.KH1_STAT_INFO || {};
  const PATH_ITEM = { Warrior: "Sword", Guardian: "Shield", Mystic: "Rod" };
  const CURVE_TEXT = { Dawn: "levels fast early", Midday: "steady", Dusk: "levels fast later" };
  const fmt = (n) => Number(n).toLocaleString("en-US");

  function rewardChips(info, lv) {
    const r = info.rewards(lv, info.path);
    const stat = r.stat && STAT_INFO[r.stat] ? STAT_INFO[r.stat][0] : r.stat;
    const bonus = r.bonus ? info.name(r.bonus) : null;
    return (bonus ? `<span class="reward ${r.bonus >= 0x80 ? "ability" : "bonus"}">${esc(bonus)}</span>` : "") +
      (stat ? `<span class="reward">${esc(stat)}</span>` : "");
  }

  function levelRow(info, lv) {
    const got = lv <= info.level;
    const need = info.curve ? info.cum[info.curve][lv] : null;
    return `<li data-lv="${lv}" class="${got ? "got" : ""} ${lv === info.level + 1 ? "here" : ""}">` +
      `<span class="lvnum">${lv}</span><span class="grow"><span class="rewards">${rewardChips(info, lv)}</span>` +
      (need != null && !got ? `<div class="sub">${fmt(need - info.exp)} EXP to go</div>` : "") + `</span></li>`;
  }

  function renderLevel() {
    const el = $("v-level");
    const info = L.levelInfo(state, levelPick);
    if (!info) { el.innerHTML = `<div class="empty">No level data.</div>`; return; }
    const lo = info.curve ? info.cum[info.curve][info.level] : 0, hi = info.curve && info.level < 100 ? info.cum[info.curve][info.level + 1] : 0;
    const pct = hi > lo ? Math.round((info.exp - lo) / (hi - lo) * 100) : 100;
    const chip = (kind, value, auto, text) =>
      `<button class="chip ${value ? "on" : ""}" data-pick="${kind}">${value ? esc(text) : kind === "path" ? "Pick your path" : "Pick your growth"}` +
      `${value && auto ? " · from save" : ""} ▾</button>`;
    // The next ability this path learns, so it's visible without scrolling the table.
    let nextAb = null;
    for (let lv = info.level + 1; info.path && lv <= 100 && !nextAb; lv++) {
      const b = info.rewards(lv, info.path).bonus;
      if (b >= 0x80) nextAb = { lv, name: info.name(b), need: info.curve ? info.cum[info.curve][lv] - info.exp : null };
    }
    const levels = [];
    const last = levelAll ? 100 : Math.min(100, info.level + 10);
    for (let lv = levelAll ? 2 : info.level + 1; lv <= last; lv++) levels.push(lv);
    el.innerHTML =
      `<div class="card"><div class="row"><div class="grow"><div class="label">Sora</div>` +
      `<div class="big">LV ${info.level}</div></div>` +
      `<div class="sub" style="text-align:right">${info.exp != null ? fmt(info.exp) + " EXP" : "EXP not in this bridge"}` +
      (info.toNext != null ? `<br>${fmt(info.toNext)} to LV ${info.level + 1}` : "") + `</div></div>` +
      (info.toNext != null ? `<div class="bar"><i style="width:${pct}%"></i></div>` : "") +
      `<div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px">` +
      chip("path", info.path, info.autoPath, info.path ? `${info.path} (kept the ${PATH_ITEM[info.path]})` : "") +
      chip("curve", info.curve, info.autoCurve, info.curve ? `${info.curve}: ${CURVE_TEXT[info.curve]}` : "") + `</div>` +
      (nextAb ? `<div class="next-ab" data-lv="${nextAb.lv}"><span class="sub">Next ability</span>` +
        `<span class="reward ability">${esc(nextAb.name)}</span><span class="sub">at LV ${nextAb.lv}` +
        `${nextAb.need != null ? ` · ${fmt(nextAb.need)} EXP to go` : ""}</span><span class="grow"></span><span class="tag more">›</span></div>` : "") +
      (!info.path ? `<div class="sub" style="margin-top:8px">Abilities depend on what you kept at the Dive. This bridge can't read that yet: pick one, or restart the game with the updated script.</div>` : "") +
      (info.path && !info.curve ? `<div class="sub" style="margin-top:8px">Your EXP so far fits more than one growth. It settles after a few more fights, or pick it.</div>` : "") +
      `</div>` +
      `<div class="card"><div class="label">${levelAll ? "Every level" : "Coming up"}</div>` +
      (levels.length ? `<ul class="list levels">${levels.map((lv) => levelRow(info, lv)).join("")}</ul>` : `<div class="empty">Max level.</div>`) +
      `<div class="row" style="margin-top:8px"><span class="grow"></span><button class="chip" id="levelAll">${levelAll ? "Just what's next" : "All levels"}</button></div></div>`;
    $("levelAll").onclick = () => { levelAll = !levelAll; render(true); };
    el.querySelectorAll("[data-lv]").forEach((li) => { li.onclick = () => openLevelSheet(info, +li.dataset.lv); });
    el.querySelectorAll("[data-pick]").forEach((b) => { b.onclick = () => openPathPicker(info, b.dataset.pick); });
  }

  function openLevelSheet(info, lv) {
    const r = info.rewards(lv, info.path);
    const parts = [];
    if (r.bonus) {
      const name = info.name(r.bonus), [kind, text] = ABILITY_INFO[name] || ["", ""];
      parts.push(`<div class="detail"><div class="reward ${r.bonus >= 0x80 ? "ability" : "bonus"}">${esc(name)}</div>` +
        `<div class="sub">${esc(kind)}</div><div>${esc(text)}</div></div>`);
    }
    if (r.stat) {
      const [name, text] = STAT_INFO[r.stat] || [r.stat, ""];
      parts.push(`<div class="detail"><div class="reward">${esc(name)}</div><div>${esc(text)}</div></div>`);
    }
    const others = L.PATHS.filter((p) => p !== info.path).map((p) => {
      const b = info.rewards(lv, p).bonus;
      return `${p}: ${b ? esc(info.name(b)) : "nothing extra"}`;
    });
    const need = info.curve ? info.cum[info.curve][lv] : null;
    openSheet(
      `<h2>Level ${lv}</h2><div class="sub">` +
      (need != null ? `${fmt(need)} EXP total (${esc(info.curve)})` + (lv > info.level ? ` · ${fmt(need - info.exp)} to go` : " · reached") : "Pick your growth to see EXP") +
      `</div>${parts.join("") || '<div class="empty">Nothing new at this level.</div>'}` +
      `<div class="sub" style="margin-top:10px">${info.path ? "Other paths at this level" : "By path"}: ${others.join(" · ")}</div>` +
      `<div class="row"><span class="grow"></span><button class="chip" data-close>Close</button></div>`,
    );
  }

  function openPathPicker(info, kind) {
    const all = kind === "path" ? L.PATHS : L.CURVES;
    const fits = kind === "path" ? info.paths : info.curves;
    const label = (v) => (kind === "path" ? `${v} (kept the ${PATH_ITEM[v]})` : `${v}: ${CURVE_TEXT[v]}`);
    openSheet(
      `<h2>${kind === "path" ? "Your path" : "Your growth"}</h2><div class="sub">` +
      (kind === "path" ? "What you kept at the Dive to the Heart. It sets which abilities Sora learns at each level."
        : "How quickly Sora levels up, set by your answers at the Dive to the Heart.") +
      (fits.length < all.length ? " Options the save rules out are hidden." : "") + `</div>` +
      `<div class="opts">${all.filter((v) => fits.includes(v)).map((v) =>
        `<button class="chip ${v === info[kind] ? "on" : ""}" data-v="${v}">${esc(label(v))}</button>`).join("")}</div>` +
      `<div class="row"><span class="grow"></span><button class="chip" data-close>Cancel</button></div>`,
    );
    $("sheetBody").querySelectorAll("[data-v]").forEach((b) => {
      b.onclick = () => { levelPick = { ...levelPick, [kind]: b.dataset.v }; store.set("levelPick", levelPick); closeSheet(); };
    });
  }

  // ---------- waiting for the game ----------
  // A calm screen by default; "Not connecting?" opens a checklist plus what the app can see.

  function bridgeStatus() {
    try { return window.KH1Native && window.KH1Native.status ? JSON.parse(window.KH1Native.status()) : null; } catch { return null; }
  }

  function ago(sec) {
    if (sec < 90) return `${sec} s`;
    if (sec < 5400) return `${Math.round(sec / 60)} min`;
    if (sec < 172800) return `${Math.round(sec / 3600)} h`;
    return `${Math.round(sec / 86400)} days`;
  }

  function renderWaiting() {
    const el = $("v-" + view);
    let html = `<div class="waiting">${icon("ico-save", "big-ico")}<div class="wait-title">Waiting for Kingdom Hearts…</div>` +
      `<div class="sub">This connects on its own a few seconds after the game starts.</div>` +
      `<button class="chip ${waitHelp ? "on" : ""}" id="waitHelp">${waitHelp ? "Hide help" : "Not connecting?"}</button></div>`;
    if (waitHelp) {
      const st = bridgeStatus();
      let verdict = "";
      if (st) {
        if (!st.filesAccess) verdict = "The app can't read the game's file: turn on all files access in Settings.";
        else if (!st.exists) verdict = "The game hasn't written anything yet, so the companion script isn't loading. Check the mod steps below.";
        else if (st.ageSec > 6) verdict = `The game last wrote ${ago(st.ageSec)} ago, so that's from an earlier session and the script isn't running now.`;
        else verdict = "The game is writing. It should connect in a moment.";
      }
      const steps = [
        ["Start the game", "Use the Kingdom Hearts Final Mix icon, or start it in GameNative. It connects once the game reaches its first screen."],
        ["Mod files in the game folder", "In GameNative: KH 1.5+2.5 → ⚙ → Import Files → DINPUT8.dll and LuaBackend.toml → Game Directory."],
        ["Container setting", "⚙ → Edit container → Environment: WINEDLLOVERRIDES = dinput8=n,b;dbghelp=b"],
        ["Companion script", "Download/KH1Companion/scripts/kh1companion.lua must be on the device."],
        ["File access", "This app needs \"All files access\" to read what the game writes."],
        ["Black screen in the game?", "Set the game's display mode to fullscreen or borderless. Windowed mode can sync from a PC through Steam Cloud and shows black here."],
      ];
      html += `<div class="card">` + (verdict ? `<div class="hint">${esc(verdict)}</div>` : "") +
        `<div class="label" style="margin-top:10px">Check these</div><ol class="help">${steps.map(([t, d]) =>
          `<li><b>${esc(t)}</b><div class="sub">${esc(d)}</div></li>`).join("")}</ol>` +
        `<div class="label" style="margin-top:10px">Details</div><div class="kv">` +
        (st ? `<span>State file</span><span>${esc(st.path)}</span>` +
          `<span>Last written</span><span>${st.exists ? ago(st.ageSec) + " ago" : "never (not found)"}</span>` +
          `<span>All files access</span><span>${st.filesAccess ? "on" : "off"}</span>` +
          `<span>GameNative</span><span>${st.gameNative ? "installed" : "not found"}</span>`
          : `<span>Reading</span><span>${esc(STATE_URL)}</span>`) + `</div>` +
        `<div class="row" style="margin-top:10px"><span class="grow"></span>` +
        (window.KH1Native ? `<button class="chip" id="waitSettings">Settings</button>` : "") + `</div></div>`;
    }
    el.innerHTML = html;
    $("waitHelp").onclick = () => { waitHelp = !waitHelp; render(true); };
    if ($("waitSettings")) $("waitSettings").onclick = () => window.KH1Native.openSettings();
  }
  // Keep the details current while they're open.
  setInterval(() => { if (!state && waitHelp && !$("sheet").classList.contains("on")) render(true); }, 2000);

  // ---------- sheets ----------

  function openSheet(html) {
    $("sheetBody").innerHTML = html;
    $("sheet").classList.add("on");
    $("sheetBody").querySelectorAll("[data-close]").forEach((b) => { b.onclick = closeSheet; });
  }
  function closeSheet() { $("sheet").classList.remove("on"); render(true); }
  $("sheet").onclick = (e) => { if (e.target.id === "sheet") closeSheet(); };

  function openWorldPicker() {
    openSheet(
      `<h2>Show map for</h2><div class="opts">${visitedWorlds(Object.keys(sum.worlds)).map((w) =>
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
    const sig = [data, view, showOpened, showContents, showNeeds, worldDetail, mapWorld, guideWorld, [...hintsShown].join(","),
      [...whereShown].join(","), JSON.stringify(levelPick), levelAll, waitHelp, allNames, mode, mapFocus, [...hintsHidden].join(","),
      JSON.stringify(visitedRooms)].join("|");
    if (!force && sig === lastRendered) return;
    lastRendered = sig;
    if (!state) { renderWaiting(); return; }
    if (state && sum.title) {
      $("v-" + view).innerHTML = `<div class="empty">${icon("ico-save", "big-ico")}<br>Load a save to see your progress.<br>` +
        `<span class="sub">Nothing is shown from the title screen: until a save loads, the game's memory is empty or left over from the last one.</span></div>`;
      return;
    }
    ({ here: renderHere, guide: renderGuide, map: renderMap, progress: renderProgress, level: renderLevel })[view]();
  }

  function setView(v) {
    view = v; store.set("view", view);
    if (view !== "progress") worldDetail = null;
    if (view !== "map") mapFocus = null;
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
    rememberSteps();
    rememberRooms();
    announce();
    render();
  }

  // ---------- toasts: say what just happened in the game ----------
  // Compares each new snapshot with the last one. Loading a save (from the title, or a jump
  // too big to be play) only sets the baseline, so nothing old gets announced.

  let lastFacts = null, lastFactsData = null;
  function facts() {
    const steps = sum.world && L.GUIDE[sum.world]
      ? L.guideFor(sum.world, state, guideSeen).steps.filter((s) => s.done).map((s) => s.key) : [];
    return {
      title: sum.title, level: state.level, opened: sum.opened, world: sum.world, puppies: sum.puppies,
      found: { ...sum.found }, reports: sum.reports.filter((r) => r.got).map((r) => r.num), steps,
      done: Object.fromEntries(Object.entries(sum.worlds).map(([w, v]) => [w, v.total && v.got === v.total])),
    };
  }
  function announce() {
    const data = JSON.stringify({ ...state, seq: 0, t: 0 });
    if (data === lastFactsData) return;
    lastFactsData = data;
    const now = facts(), was = lastFacts;
    lastFacts = now;
    if (!was || was.title || now.title) return;
    const fresh = (window.KH1_CHESTS || []).filter((c) => L.bit(now.opened, c.B, c.b) && !L.bit(was.opened, c.B, c.b));
    if (fresh.length > 6 || now.level - was.level > 3 || now.reports.length - was.reports.length > 2) return;  // a save load

    const out = [];
    const pups = now.puppies - was.puppies;
    for (const c of fresh) {
      const w = sum.worlds[c.w] || { got: 0, total: 0 };
      if (L.isPuppies(c)) continue;  // the puppy toast covers it
      out.push({ ico: "ico-chest", title: c.i ? `Chest opened · ${c.i}` : "Chest opened", sub: `${w.got} of ${w.total} in ${displayWorld(c.w)}` });
    }
    if (pups > 0) {
      out.push({ ico: "ico-paw", title: pups > 1 ? `Puppies ${now.puppies - pups + 1}–${now.puppies} found!` : `Puppy ${now.puppies} found!`, sub: `${now.puppies} of 99 Dalmatians` });
    }
    if (now.level > was.level) {
      const info = L.levelInfo(state, levelPick);
      const got = [];
      for (let lv = was.level + 1; info && lv <= now.level; lv++) {
        const r = info.rewards(lv, info.path);
        if (r.bonus) got.push(info.name(r.bonus));
        if (r.stat) got.push(STAT_INFO[r.stat] ? STAT_INFO[r.stat][0] : r.stat);
      }
      out.push({ ico: "ico-star", title: `Level up! LV ${now.level}`, sub: got.join(" · "), big: true });
    }
    for (const w of Object.keys(now.found)) {
      if (now.found[w] === "visited" && was.found[w] !== "visited" && w !== "Awakening") {
        out.push({ ico: "ico-pin", title: `New world: ${displayWorld(w)}`, sub: sum.worlds[w] ? `${sum.worlds[w].total} chests to find` : "", big: true });
      }
    }
    for (const num of now.reports) if (!was.reports.includes(num)) out.push({ ico: "ico-report", title: `Ansem's Report ${num} found`, sub: `${now.reports.length} of ${sum.reports.length}` });
    if (now.world === was.world) {
      for (const k of now.steps) {
        if (was.steps.includes(k)) continue;
        const s = L.guideFor(now.world, state, guideSeen).steps.find((x) => x.key === k);
        if (s) out.push({ ico: "ico-check", title: "Story step done", sub: s.title + (s.rewards && s.rewards.length ? ` · got ${s.rewards.join(", ")}` : "") });
      }
    }
    for (const w of Object.keys(now.done)) {
      if (now.done[w] && !was.done[w]) out.push({ ico: "ico-crown", title: `${displayWorld(w)} complete!`, sub: `All ${sum.worlds[w].total} chests opened`, big: true });
    }
    out.forEach(toast);
  }

  const toastQueue = [];
  function toast(t) {
    toastQueue.push(t);
    if (toastQueue.length === 1) showToast();
  }
  // One at a time, so a burst (a chest that levels you up) reads in order.
  function showToast() {
    const t = toastQueue[0];
    if (!t) return;
    const box = $("toasts");
    const el = document.createElement("div");
    el.className = "toast" + (t.big ? " big" : "");
    el.innerHTML = `${icon(t.ico, "toast-ico")}<div class="grow"><div class="toast-title">${esc(t.title)}</div>` +
      (t.sub ? `<div class="sub">${esc(t.sub)}</div>` : "") + `</div>`;
    box.appendChild(el);
    const ms = toastQueue.length > 2 ? 2200 : TOAST_MS;  // catch up when a few pile up
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => { el.remove(); toastQueue.shift(); showToast(); }, 260);
    }, ms);
  }

  // Any chest or room row (data-cw / data-cn) opens that room, on every tab.
  document.querySelector("main").addEventListener("click", (e) => {
    const li = e.target.closest("[data-cn]");
    if (li && state && !sum.title) openNodeSheet(li.dataset.cw, li.dataset.cn);
  });
  $("modeBtn").onclick = () => { if (state && !sum.title) openShowSheet(); };
  // Destiny Islands errands hand their items over, so remember steps once seen done.
  // A fresh Dive (no Traverse Town progress yet) means a new game: forget them.
  function rememberRooms() {
    const tt = L.hexToBytes(state.progress)[0] || 0;
    if (state.world === 0 && !sum.title && tt === 0 && Object.keys(visitedRooms).length > 2) {
      visitedRooms = {};  // a fresh Dive: a new game
      store.set("visited", visitedRooms);
    }
    const n = hereNode();
    if (!n || sum.title || !sum.world) return;
    const list = visitedRooms[sum.world] || (visitedRooms[sum.world] = []);
    if (!list.includes(n.id)) { list.push(n.id); store.set("visited", visitedRooms); }
  }

  function rememberSteps() {
    // The growth curve has no save byte: keep the last one EXP pinned down, for when it's ambiguous again.
    const info = !sum.title && L.levelInfo(state, levelPick);
    if (info && info.seenCurve && (levelPick.seen !== info.seenCurve || levelPick.seenExp !== info.exp)) {
      levelPick = { ...levelPick, seen: info.seenCurve, seenExp: info.exp };
      store.set("levelPick", levelPick);
    }
    const before = guideSeen.size;
    const tt = L.hexToBytes(state.progress)[0] || 0;
    if (state.world === 0 && !sum.title && tt === 0) {
      for (const k of [...guideSeen]) if (k.startsWith("Destiny Islands#")) guideSeen.delete(k);
    } else if (sum.world === "Destiny Islands") {
      for (const s of L.guideFor(sum.world, state, guideSeen).steps) if (s.done) guideSeen.add(s.key);
    }
    if (guideSeen.size !== before || state.world === 0) store.set("guideSeen", [...guideSeen]);
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
  // Close button: only in the Android app, which exposes KH1Native.
  if (window.KH1Native) {
    const sheet = $("closeSheet");
    $("closeBtn").hidden = false;
    $("closeBtn").onclick = () => { sheet.hidden = false; };
    $("closeNo").onclick = () => { sheet.hidden = true; };
    sheet.onclick = (e) => { if (e.target === sheet) sheet.hidden = true; };
    $("closeYes").onclick = () => window.KH1Native.close();
    $("closeSettings").onclick = () => { sheet.hidden = true; window.KH1Native.openSettings(); };
  }
  if (params.has("native")) setInterval(renderHeader, 1000);
  else poll();
})();
