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
  const VIEWS = ["here", "guide", "map", "worlds", "collect", "level"];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const store = {
    get(k, d) { try { const v = localStorage.getItem("kh1c:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("kh1c:" + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  let state = null, sum = null;
  let lastSeq = null, lastChange = 0;
  // ?view= opens a given tab (screenshots, dev), otherwise the last one used.
  let view = VIEWS.includes(params.get("view")) ? params.get("view") : VIEWS.includes(store.get("view")) ? store.get("view") : "here";
  let showOpened = store.get("showOpened", false);
  let showContents = store.get("showContents", true);
  let showNeeds = store.get("showNeeds", false);  // name what a locked chest needs (mild spoiler)
  let worldDetail = null;   // Worlds tab: world whose chest list is open
  let mapWorld = null;      // Map tab: world shown instead of the current one
  let guideWorld = null;    // Guide tab: world shown instead of the current one
  const hintsShown = new Set();  // guide steps the player chose to reveal in full
  const whereShown = new Set();  // guide steps whose location the player asked for
  const guideSeen = new Set(store.get("guideSeen", []));  // steps seen done whose evidence can leave the save
  let levelPick = store.get("levelPick", {});  // the player's own path / curve choice
  let levelAll = false;  // Level tab: full table instead of the next few levels
  let waitHelp = false;  // waiting screen: troubleshooting shown
  let roomLabels = store.get("rooms", {});

  const icon = (id, cls = "ico") => `<svg class="${cls}"><use href="#${id}"/></svg>`;
  const hex2 = (n) => "0x" + n.toString(16).toUpperCase().padStart(2, "0");
  const hereNode = () => (state ? L.nodeForRoom(state, roomLabels) : null);
  const displayWorld = (w) => (w === "Awakening" ? "Dive to the Heart" : w);
  // Worlds the save hasn't reached stay unnamed; ones only on the Gummi map show their name, nothing more.
  const visited = (w) => !sum || sum.found[w] === "visited";
  const visitedWorlds = (list) => list.filter(visited);

  // ---------- shared pieces ----------

  const needText = (lock) => (lock[0] === "story" ? "Opens later in the story" : showNeeds ? "Needs " + lock.join(" + ") : "Can't reach yet");
  // Reports named after a boss fight would spoil it: say how, not who.
  const reportHow = (r) => r.n.replace(/ Ansem's Report \d+$/, "").replace(/^Defeat .+$/, "After a boss fight");

  function chestRow(c, opts) {
    const n = c.node && L.node(c.w, c.node);
    const sub = [opts.showRoom && n ? L.labelOf(n) : null, showContents && c.i ? c.i : null,
      c.lock ? needText(c.lock) : null].filter(Boolean).join(" · ");
    return `<li class="${c.got ? "got" : ""} ${opts.here ? "here" : ""} ${c.lock ? "locked" : ""}">${icon(c.got ? "ico-chest-open" : "ico-chest")}` +
      `<span class="grow"><span class="name">${esc(c.n.replace(/ Chest$/, ""))}</span>` +
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

  function toggles() {
    return `<button class="chip ${showOpened ? "on" : ""}" data-toggle="showOpened">Opened</button>` +
      `<button class="chip ${showContents ? "on" : ""}" data-toggle="showContents">Contents</button>` +
      `<button class="chip ${showNeeds ? "on" : ""}" data-toggle="showNeeds">Needs</button>`;
  }
  function wireToggles(root) {
    root.querySelectorAll("[data-toggle]").forEach((b) => {
      b.onclick = () => {
        if (b.dataset.toggle === "showOpened") { showOpened = !showOpened; store.set("showOpened", showOpened); }
        else if (b.dataset.toggle === "showNeeds") { showNeeds = !showNeeds; store.set("showNeeds", showNeeds); }
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
    $("hRoom").textContent = sum.title ? "" : sum.room || (n ? L.labelOf(n) : `Room ${hex2(state.room)}`);
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
    const chests = L.chestsFor(world, sum.opened, state);
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

  function mapSvg(world, hereId, goalId) {
    const map = L.MAPS[world];
    const chests = L.chestsFor(world, sum.opened, state);
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
      const reachable = cs.filter((c) => !c.got && !c.lock).length;
      const pup = cs.some((c) => !c.got && L.isPuppies(c));
      const shut = !L.nodeAccess(world, n, state).open && n.id !== hereId;
      const cls = ["node", n.id === hereId ? "here" : "", n.id === goalId ? "goal" : "", cs.length && !left ? "done" : "",
        cs.length ? "" : "bare", shut ? "shut" : "", !shut && left && !reachable ? "later" : ""].join(" ");
      const x = cx(n) - BOX_W / 2, y = cy(n) - BOX_H / 2;
      const label = L.labelOf(n);
      const lines = label.length > 13 && label.includes(" ") ? splitLabel(label) : [label];
      return `<g class="${cls}" data-node="${esc(n.id)}">` +
        (n.id === goalId ? `<rect x="${x - 5}" y="${y - 5}" width="${BOX_W + 10}" height="${BOX_H + 10}" rx="12" class="goalring"/>` : "") +
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
    if (!state) { el.innerHTML = `<div class="empty">Waiting for game…</div>`; return; }
    const world = mapWorld || (L.MAPS[sum.world] ? sum.world : null);
    if (!world) {
      el.innerHTML = `<div class="empty">${sum.title ? "On the title screen." : "No map for this world."}<br><br>` +
        `<button class="chip" id="pickMapWorld">Pick a world</button></div>`;
      $("pickMapWorld").onclick = openWorldPicker;
      return;
    }
    const n = world === sum.world ? hereNode() : null;
    const next = L.guideFor(world, state, guideSeen).next;
    const goal = next && whereShown.has(next.key) ? next : null;  // only once the player asked "Where?"
    const approx = L.MAPS[world].edges.some((e) => e[2] === "approx");
    const anyShut = L.nodesOf(world).some((nd) => !L.nodeAccess(world, nd, state).open);
    el.innerHTML =
      `<div class="row" style="margin-bottom:8px"><button class="chip" id="pickMapWorld">${esc(displayWorld(world))} ▾</button>` +
      (mapWorld && mapWorld !== sum.world && L.MAPS[sum.world] ? `<button class="chip" id="mapHere">Current world</button>` : "") +
      `<span class="grow"></span><span class="sub">${sum.worlds[world].got}/${sum.worlds[world].total}</span></div>` +
      `<div class="card mapcard">${mapSvg(world, n && n.id, goal && goal.where)}</div>` +
      `<div class="legend"><span><i class="lg here"></i>you</span>${goal && goal.where ? '<span><i class="lg goal"></i>next step</span>' : ""}<span>${icon("ico-save", "")}save</span>` +
      `<span>${icon("ico-paw", "")}puppies</span>${anyShut ? `<span>${icon("ico-lock", "")}not yet</span>` : ""}` +
      `${approx ? '<span><i class="lg dash"></i>exit not confirmed</span>' : ""}</div>`;
    $("pickMapWorld").onclick = openWorldPicker;
    if ($("mapHere")) $("mapHere").onclick = () => { mapWorld = null; render(true); };
    el.querySelectorAll("[data-node]").forEach((g) => { g.onclick = () => openNodeSheet(world, g.dataset.node); });
  }

  function openNodeSheet(world, id) {
    const nd = L.node(world, id);
    const chests = L.chestsFor(world, sum.opened, state).filter((c) => c.node === id);
    const ids = (nd.rooms || []).map(hex2).join(", ");
    const access = L.nodeAccess(world, nd, state);
    openSheet(
      `<h2>${esc(L.labelOf(nd))}</h2><div class="sub">${esc(displayWorld(world))}` +
      `${nd.save ? " · save point" : ""}${ids ? " · room " + ids : ""}</div>` +
      (access.open ? "" : `<div class="hint">${icon("ico-lock", "chip-ico")}` +
        (access.scene ? "You can't walk in here. The story brings you here when it's time."
          : access.story ? "You can't get in here yet. It opens up later in the story." : `You can't get in here yet. Needs ${esc(access.need.join(" + "))}.`) +
        `</div>`) +
      `<div style="margin-top:8px">${chests.length
        ? `<ul class="list">${chests.sort((a, b) => a.got - b.got || a.n.localeCompare(b.n)).map((c) => chestRow(c, { showRoom: false })).join("")}</ul>`
        : '<div class="empty">No chests in this room.</div>'}</div>` +
      `<div class="row"><span class="grow"></span><button class="chip" data-close>Close</button></div>`,
    );
  }

  // ---------- Guide ----------

  // Next step, revealed in layers: the nudge always; "Where?" adds the room and the map
  // marker; "Show me" names the event and gives the full hint.
  function stepCard(world, step, current) {
    const key = step.key;
    const where = step.where ? L.node(world, step.where) : null;
    const full = hintsShown.has(key), placed = whereShown.has(key) || full;
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
      const text = s.done ? esc(s.title) : isNext ? esc(s.nudge) : s.optional ? "Optional: ???" : "???";
      const sub = s.done && s.rewards && s.rewards.length ? `Got ${esc(s.rewards.join(", "))}`
        : s.done === null && s.p != null ? "Needs the updated bridge script" : "";
      return `<li class="${s.done ? "got" : ""} ${isNext ? "here" : ""} ${!s.done && !isNext ? "hidden-step" : ""}">` +
        `<span class="step-dot ${s.done ? "done" : s.done === null ? "unknown" : ""}"></span>` +
        `<span class="grow"><span class="name">${text}</span>${sub ? `<div class="sub">${sub}</div>` : ""}</span></li>`;
    }).join("")}</ul></div>`;
  }

  function renderGuide() {
    const el = $("v-guide");
    if (!state) { el.innerHTML = `<div class="empty">Waiting for game…</div>`; return; }
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
    const here = current ? hereNode() : null;
    const chests = L.chestsFor(world, sum.opened, state).filter((c) => !c.got);
    const hereLeft = here ? chests.filter((c) => c.node === here.id) : [];
    const byRoom = {};
    for (const c of chests) (byRoom[c.node] = byRoom[c.node] || []).push(c);
    const open = (cs) => cs.filter((c) => !c.lock).length;
    const rooms = Object.entries(byRoom).sort((a, b) => open(b[1]) - open(a[1]) || b[1].length - a[1].length);
    const reportsLeft = sum.reports.filter((r) => r.w === world && !r.got);

    el.innerHTML =
      `<div class="row" style="margin-bottom:10px"><button class="chip" id="guidePick">${esc(displayWorld(world))} ▾</button>` +
      (guideWorld && guideWorld !== sum.world && L.GUIDE[sum.world] ? `<button class="chip" id="guideHere">Current world</button>` : "") +
      `<span class="grow"></span></div>` +
      (g.next ? stepCard(world, g.next, current)
        : g.steps.length ? `<div class="card"><div class="label">Story · ${esc(displayWorld(world))}</div><div class="empty">Story complete here.</div></div>` : "") +
      (here ? `<div class="card"><div class="label">Left in ${esc(sum.room || L.labelOf(here))}</div>` +
        (hereLeft.length ? chestList(hereLeft, here.id, { showRoom: false }) : `<div class="empty">Nothing left in this room.</div>`) + `</div>` : "") +
      `<div class="card"><div class="label">Left in ${esc(displayWorld(world))} · ${chests.length} chest${chests.length === 1 ? "" : "s"}</div>` +
      (rooms.length ? `<ul class="list">${rooms.map(([id, cs]) => {
        const nd = id !== "null" && L.node(world, id);
        return `<li data-room="${esc(id)}">${icon("ico-chest")}<span class="grow"><span class="name">${esc(nd ? L.labelOf(nd) : "Elsewhere")}</span>` +
          `<div class="sub">${open(cs) === cs.length ? `${cs.length} chest${cs.length > 1 ? "s" : ""}`
            : open(cs) ? `${open(cs)} now, ${cs.length - open(cs)} later` : `${cs.length} later`}` +
          `${cs.some(L.isPuppies) ? " · puppies" : ""}${nd && !L.nodeAccess(world, nd, state).open ? " · can't get in yet" : ""}</div></span>` +
          (here && id === here.id ? '<span class="tag here">Here</span>' : "") + `</li>`;
      }).join("")}</ul>` : `<div class="empty">Every chest here is open.</div>`) +
      (reportsLeft.length ? `<div class="label" style="margin-top:10px">Ansem's Reports here</div><ul class="list">${reportsLeft.map((r) =>
        `<li>${icon("ico-report-missing")}<span class="grow"><span class="name">Report ${r.num}</span><div class="sub">${esc(reportHow(r))}</div></span></li>`).join("")}</ul>` : "") +
      `</div>` +
      (g.steps.length ? storyList(world, g) : "");

    el.querySelectorAll("[data-hint]").forEach((b) => {
      b.onclick = () => { const k = b.dataset.hint; if (hintsShown.has(k)) hintsShown.delete(k); else hintsShown.add(k); render(true); };
    });
    el.querySelectorAll("[data-where]").forEach((b) => { b.onclick = () => { whereShown.add(b.dataset.where); render(true); }; });
    el.querySelectorAll("[data-goto]").forEach((b) => {
      b.onclick = () => { mapWorld = b.dataset.goto === sum.world ? null : b.dataset.goto; setView("map"); };
    });
    el.querySelectorAll("[data-room]").forEach((li) => {
      li.onclick = () => { if (li.dataset.room !== "null") openNodeSheet(world, li.dataset.room); };
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

  // ---------- Worlds ----------

  function renderWorlds() {
    const el = $("v-worlds");
    if (!state) { el.innerHTML = `<div class="empty">Waiting for game…</div>`; return; }
    if (worldDetail) {
      const w = sum.worlds[worldDetail];
      el.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="chip" id="back">‹ All</button>` +
        `<button class="chip" id="toMap">Map</button><span class="grow"></span>${toggles()}</div>` +
        progressCard(displayWorld(worldDetail) + " chests", w.got, w.total) +
        `<div class="card">${chestList(L.chestsFor(worldDetail, sum.opened, state), null)}</div>`;
      $("back").onclick = () => { worldDetail = null; render(true); };
      $("toMap").onclick = () => { mapWorld = worldDetail; worldDetail = null; setView("map"); };
      wireToggles(el);
      return;
    }
    const entries = Object.entries(sum.worlds);
    const hidden = entries.filter(([w]) => sum.found[w] === "hidden").length;
    el.innerHTML = `<div class="grid">${entries.filter(([w]) => sum.found[w] !== "hidden").map(([w, { got, total }]) =>
      visited(w)
        ? `<button data-w="${esc(w)}" class="${w === sum.world ? "cur" : ""}"><div class="wn">${esc(displayWorld(w))}</div>` +
          `<div class="wc">${got} / ${total}</div><div class="bar ${got === total ? "done" : ""}"><i style="width:${total ? got / total * 100 : 0}%"></i></div></button>`
        : `<button class="unvisited" disabled><div class="wn">${esc(displayWorld(w))}</div><div class="wc">Not visited yet</div></button>`,
    ).join("")}` +
      (hidden ? `<button class="unvisited" disabled><div class="wn">???</div><div class="wc">${hidden} world${hidden > 1 ? "s" : ""} to find</div></button>` : "") +
      `</div>`;
    el.querySelectorAll("[data-w]").forEach((b) => { b.onclick = () => { worldDetail = b.dataset.w; render(true); }; });
  }

  // ---------- Collect ----------

  function renderCollect() {
    const el = $("v-collect");
    if (!state) { el.innerHTML = `<div class="empty">Waiting for game…</div>`; return; }
    const pupLeft = sum.puppyChests.filter((c) => !c.got);
    const pupKnown = pupLeft.filter((c) => visited(c.w)), pupElsewhere = pupLeft.length - pupKnown.length;
    el.innerHTML =
      progressCard("All chests", sum.chestsGot, sum.chestsTotal) +
      progressCard("Dalmatians found", sum.puppies, 99) +
      `<div class="card"><div class="label">Puppy chests left · ${pupLeft.length} of ${sum.puppyChests.length}</div>` +
      (pupLeft.length
        ? `<ul class="list">${pupKnown.sort((a, b) => a.w.localeCompare(b.w) || a.n.localeCompare(b.n)).map((c) =>
          `<li>${icon("ico-chest")}<span class="grow"><span class="name">${esc(c.n.replace(/ Chest$/, ""))}</span>` +
          `<div class="sub">${esc(displayWorld(c.w))}${c.node ? " · " + esc(L.labelOf(L.node(c.w, c.node))) : ""}</div></span></li>`).join("")}` +
          (pupElsewhere ? `<li class="hidden-step">${icon("ico-chest")}<span class="grow"><span class="name">???</span>` +
            `<div class="sub">${pupElsewhere} in worlds you haven't been to</div></span></li>` : "") + `</ul>`
        : '<div class="empty">All puppy chests opened.</div>') + `</div>` +
      progressCard("Postcards mailed", sum.postcards, 10) +
      `<div class="card"><div class="label">Ansem's Reports · ${sum.reports.filter((r) => r.got).length} / ${sum.reports.length}</div>` +
      `<ul class="list">${sum.reports.map((r) =>
        `<li class="${r.got ? "got" : ""}">${icon(r.got ? "ico-report" : "ico-report-missing")}<span class="grow"><span class="name">Report ${r.num}</span>` +
        `<div class="sub">${r.got ? `${esc(r.w)}: ${esc(r.n.replace(/ Ansem's Report \d+$/, ""))}`
          : visited(r.w) ? `${esc(r.w)}: ${esc(reportHow(r))}` : "Somewhere you haven't been"}</div></span></li>`).join("")}</ul></div>`;
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
    if (!state) { el.innerHTML = `<div class="empty">Waiting for game…</div>`; return; }
    const info = L.levelInfo(state, levelPick);
    if (!info) { el.innerHTML = `<div class="empty">No level data.</div>`; return; }
    const lo = info.curve ? info.cum[info.curve][info.level] : 0, hi = info.curve && info.level < 100 ? info.cum[info.curve][info.level + 1] : 0;
    const pct = hi > lo ? Math.round((info.exp - lo) / (hi - lo) * 100) : 100;
    const chip = (kind, value, auto, text) =>
      `<button class="chip ${value ? "on" : ""}" data-pick="${kind}">${value ? esc(text) : kind === "path" ? "Pick your path" : "Pick your growth"}` +
      `${value && auto ? " · from save" : ""} ▾</button>`;
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
      [...whereShown].join(","), JSON.stringify(roomLabels), JSON.stringify(levelPick), levelAll, waitHelp].join("|");
    if (!force && sig === lastRendered) return;
    lastRendered = sig;
    if (!state) { renderWaiting(); return; }
    if (state && sum.title) {
      $("v-" + view).innerHTML = `<div class="empty">${icon("ico-save", "big-ico")}<br>Load a save to see your progress.<br>` +
        `<span class="sub">Nothing is shown from the title screen: until a save loads, the game's memory is empty or left over from the last one.</span></div>`;
      return;
    }
    ({ here: renderHere, guide: renderGuide, map: renderMap, worlds: renderWorlds, collect: renderCollect, level: renderLevel })[view]();
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
    rememberSteps();
    render();
  }
  // Destiny Islands errands hand their items over, so remember steps once seen done.
  // A fresh Dive (no Traverse Town progress yet) means a new game: forget them.
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
