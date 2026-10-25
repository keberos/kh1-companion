// KH1 Second-Screen Companion: pure decoding logic, shared by the page and the node tests.
// Turns a bridge snapshot (state.json) into named, countable things. No DOM access.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.KH1Logic = factory(root.KH1_CHESTS, root.KH1_REPORTS, root.KH1_MAPS, root.KH1_GUIDE, root.KH1_ROOM_NAMES, root.KH1_LEVELS);
})(typeof self !== "undefined" ? self : this, function (CHESTS, REPORTS, MAPS, GUIDE, ROOM_NAMES, LEVELS) {
  "use strict";

  // World byte -> name (the chest data's world names), from Dekirai/MultiPresence's
  // Worlds.cs (MIT), which agrees with every world byte used in community scripts.
  // World 0 is shared: the title screen sits in room 0 with no HUD; otherwise it's
  // Dive to the Heart. Hollow Bastion uses two world bytes.
  const WORLDS = {
    0x00: { name: "Awakening" },
    0x01: { name: "Destiny Islands" },
    0x02: { name: "Disney Castle" },
    0x03: { name: "Traverse Town" },
    0x04: { name: "Wonderland" },
    0x05: { name: "Deep Jungle" },
    0x06: { name: "100 Acre Wood" },
    0x08: { name: "Agrabah" },
    0x09: { name: "Atlantica" },
    0x0A: { name: "Halloween Town" },
    0x0B: { name: "Olympus Coliseum" },
    0x0C: { name: "Monstro" },
    0x0D: { name: "Neverland" },
    0x0E: { name: "Hollow Bastion" },
    0x0F: { name: "Hollow Bastion" },
    0x10: { name: "End of the World" },
  };

  // ---------- which worlds the player has found ----------
  // The save's world-status array (one byte per world in this order) says whether a world is
  // hidden (0), on the Gummi map (1-2), or visited (3+). Story progress, opened chests and
  // being there count as visited too. The two opening worlds are always known.
  const STATUS_ORDER = ["Traverse Town", "Wonderland", "Olympus Coliseum", "Deep Jungle", "Agrabah", "Atlantica",
    "Halloween Town", "Neverland", "Hollow Bastion", "End of the World", "Monstro"];
  const PROGRESS_INDEX = { "Traverse Town": 0, "Deep Jungle": 1, "Olympus Coliseum": 2, "Wonderland": 3, "Agrabah": 4,
    "Monstro": 5, "Atlantica": 6, "Halloween Town": 8, "Neverland": 9, "Hollow Bastion": 10, "End of the World": 11 };

  function discovery(world, state, opened) {
    if (world === "Awakening" || world === "Destiny Islands") return "visited";
    if (!onTitle(state) && worldName(state.world) === world) return "visited";
    if (CHESTS.some((c) => c.w === world && bit(opened, c.B, c.b))) return "visited";
    const p = hexToBytes(state.progress), i = PROGRESS_INDEX[world];
    if (i != null && i < p.length && p[i] > 0) return "visited";
    const st = state.world_status == null ? null : hexToBytes(state.world_status)[STATUS_ORDER.indexOf(world)];
    if (st == null) return "hidden";
    return st >= 3 ? "visited" : st >= 1 ? "seen" : "hidden";
  }

  const hexToBytes = (h) => {
    const a = new Uint8Array((h || "").length >> 1);
    for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
    return a;
  };
  const bit = (bytes, B, b) => B < bytes.length && (bytes[B] >> b & 1) === 1;
  const popcount = (bytes) => bytes.reduce((n, x) => { while (x) { n += x & 1; x >>= 1; } return n; }, 0);

  const worldName = (id) => (WORLDS[id] ? WORLDS[id].name : null);
  // The Dive's first platform (where you pick Sword, Shield or Rod) also reports world 0, room 0, no HUD.
  // Two tells that it's a game, not the title: the Dive's story byte (progress_pre) has started while the
  // main story bytes are still all zero (read on the Thor: 0a04.. at the pedestals, all zero on the title,
  // whose Dive answers read 000000ffffff just like a fresh game's), and `live`, set by the page when save
  // data changes while here.
  const diveStarted = (state) => state.progress_pre != null && hexToBytes(state.progress_pre).some((b) => b) &&
    hexToBytes(state.progress).every((b) => !b);
  const onTitle = (state) => state.world === 0 && state.room === 0 && !state.in_field && !diveStarted(state) && !state.live;
  // The game's own name for the exact room (e.g. "Piano Room"), or null for unnamed rooms.
  const roomName = (state) => {
    const r = ((ROOM_NAMES || {})[state.world] || [])[state.room];
    return r && r !== "???" ? r : null;
  };
  const trackedWorlds = () => [...new Set(CHESTS.map((c) => c.w))].filter((w) => MAPS[w]);
  const isPuppies = (c) => c.i === "Puppies";

  const nodesOf = (world) => (MAPS[world] ? MAPS[world].nodes : []);
  const node = (world, id) => nodesOf(world).find((n) => n.id === id) || null;
  const labelOf = (n) => n.label || n.id;

  // Which map node a chest sits in: its room from the data, else a name-prefix match.
  function nodeForChest(c) {
    const nodes = nodesOf(c.w);
    return nodes.find((n) => n.id === c.r)
      || nodes.find((n) => (n.match || []).some((p) => c.n.startsWith(p)))
      || null;
  }

  // Which map node the player is in, from the room bytes in the map data (every named room has one).
  function nodeForRoom(state) {
    const world = worldName(state.world);
    if (!world || onTitle(state)) return null;
    return nodesOf(world).find((n) => (n.rooms || []).includes(state.room)) || null;
  }

  // ---------- what the save says you have ----------
  // Each check answers true / false, or null when this bridge doesn't send that part of the save.

  const MAGIC = ["Fire", "Blizzard", "Thunder", "Cure", "Gravity", "Stop", "Aero"];
  const SPELL_TIERS = {
    Fire: ["Fire", "Fira", "Firaga"], Blizzard: ["Blizzard", "Blizzara", "Blizzaga"], Thunder: ["Thunder", "Thundara", "Thundaga"],
    Cure: ["Cure", "Cura", "Curaga"], Gravity: ["Gravity", "Gravira", "Graviga"], Stop: ["Stop", "Stopra", "Stopga"],
    Aero: ["Aero", "Aerora", "Aeroga"],
  };
  const TRINITY = ["Blue", "Red", "Green", "Yellow", "White"];
  const SHARED = { "High Jump": 1, "Mermaid Kick": 2, "Glide": 3, "Superglide": 4 };
  const SORA_ABILITY = { "Guard": 0x15, "Leaf Bracer": 0x3E };
  // Inventory slot = Archipelago item id - 2641000.
  const ITEM = {
    "Log": 192, "Cloth": 193, "Rope": 194, "Seagull Egg": 195, "Fish": 196, "Mushroom": 197, "Coconut": 198,
    "Drinking Water": 199, "Crystal Trident": 210, "Footprints": 223, "Forget-Me-Not": 227, "Jack-In-The-Box": 228,
    "Entry Pass": 229, "Slides": 217, "Claw Marks": 224, "Stench": 225, "Antenna": 226, "Theon Vol. 6": 183,
    "Old Book": 187, "Emblem Piece (Flame)": 188, "Emblem Piece (Chest)": 189, "Emblem Piece (Statue)": 190,
    "Emblem Piece (Fountain)": 191,
  };
  // Key items the story hands over (Archipelago progress thresholds); they can leave the bag later.
  const ITEM_STORY = { "Entry Pass": [2, 0x10], "Crystal Trident": [6, 0x32], "Forget-Me-Not": [8, 0x1E] };

  const bytesOf = (state, k) => (state[k] == null ? null : hexToBytes(state[k]));
  const itemCount = (state, name) => {
    const inv = bytesOf(state, "inventory");
    return inv ? inv[ITEM[name]] || 0 : null;
  };
  const sharedCount = (state, id) => {
    const sh = bytesOf(state, "shared");
    return sh ? sh.filter((v) => (v & 0x7F) === id).length : null;
  };

  // One requirement atom from the chest data: "Item" or "Item:count".
  function has(atom, state) {
    const [name, n0] = atom.split(":");
    const n = +(n0 || 1);
    if (name === "High Jump" || name === "Mermaid Kick") {
      const c = sharedCount(state, SHARED[name]);
      return c == null ? null : c >= n;
    }
    if (name === "Progressive Glide") {
      const g = sharedCount(state, SHARED.Glide), sg = sharedCount(state, SHARED.Superglide);
      return g == null ? null : (sg ? 2 : g ? 1 : 0) >= n;
    }
    const m = /^Progressive (\w+)$/.exec(name);
    if (m && MAGIC.includes(m[1])) {
      // Levels read 1 even for spells not learned yet; the unlocked bits say which are learned.
      const i = MAGIC.indexOf(m[1]), mg = bytesOf(state, "magic");
      if (!mg || state.magic_unlocked == null) return null;
      return (state.magic_unlocked >> i & 1) === 1 && mg[i] >= n;
    }
    const t = /^(\w+) Trinity$/.exec(name);
    if (t && TRINITY.includes(t[1])) return state.trinities == null ? null : (state.trinities >> TRINITY.indexOf(t[1]) & 1) === 1;
    if (SORA_ABILITY[name]) {
      const ab = bytesOf(state, "abilities");
      return ab ? ab.some((v) => (v & 0x7F) === SORA_ABILITY[name]) : null;
    }
    if (ITEM[name] != null) {
      const story = ITEM_STORY[name];
      if (story) {
        const p = hexToBytes(state.progress);
        if (story[0] < p.length && p[story[0]] >= story[1]) return true;
      }
      const c = itemCount(state, name);
      return c == null ? null : c >= n;
    }
    return null; // cups, summons, torn pages, ...: can't tell, so never claim it's missing
  }

  // Player-facing name for a requirement atom.
  function needName(atom) {
    const [name, n0] = atom.split(":");
    const n = +(n0 || 1);
    if (name === "Progressive Glide") return n >= 2 ? "Superglide" : "Glide";
    const m = /^Progressive (\w+)$/.exec(name);
    if (m && SPELL_TIERS[m[1]]) return SPELL_TIERS[m[1]][Math.min(n, 3) - 1];
    if (name === "High Jump" && n > 1) return `High Jump level ${n}`;
    return n > 1 ? `${n}× ${name}` : name;
  }

  // null when reachable (or we can't tell), else the shortest list of things still missing.
  function lockOf(q, state) {
    if (!q) return null;
    let best = null;
    for (const alt of q) {
      const missing = alt.filter((a) => has(a, state) === false);
      if (!missing.length) return null;
      if (!best || missing.length < best.length) best = missing;
    }
    return best.map(needName);
  }

  // `lock`: null when reachable, else what's missing; ["story"] when the room itself opens later.
  function chestsFor(world, opened, state) {
    return CHESTS.filter((c) => c.w === world).map((c) => {
      const n = nodeForChest(c);
      const got = bit(opened, c.B, c.b);
      let lock = null;
      if (!got && state) {
        const room = nodeAccess(world, n, state);
        lock = room.open ? lockOf(c.q, state) : room.story ? ["story"] : room.need;
      }
      return { ...c, got, node: n ? n.id : null, lock };
    });
  }

  // Can the player get into this map room yet? Rooms carry `gate`: a story point
  // ({p, at}, same bytes as the guide) and/or an ability or item ({need}).
  function nodeAccess(world, nd, state) {
    const g = nd && nd.gate;
    if (!g || !state) return { open: true };
    if (g.scene) return { open: false, story: true, scene: true };
    if (g.p != null) {
      const p = hexToBytes(state.progress);
      if (g.p < p.length && p[g.p] < g.at) return { open: false, story: true };
    }
    if (g.need && has(g.need, state) === false) return { open: false, need: [needName(g.need)] };
    return { open: true };
  }

  // ---------- which rooms the player has been to ----------
  // KH1 keeps no record of visited rooms, so a room counts as visited when this device has
  // seen the player there (`seen`: node ids), a chest in it is open, or a finished story step
  // happened there. Unvisited rooms keep their names hidden.
  function knownRooms(world, state, opened, seen, guideSeen) {
    const known = new Set(seen || []);
    const here = nodeForRoom(state);
    if (here && worldName(state.world) === world) known.add(here.id);
    for (const c of chestsFor(world, opened)) if (c.got && c.node) known.add(c.node);
    for (const s of guideFor(world, state, guideSeen).steps) if (s.done && s.where) known.add(s.where);
    return known;
  }

  // ---------- story guide ----------
  // Steps are done by world progress ({p, at}), by items in the bag ({items}), by how far
  // through the Dive you are ({dive}), or only once the player has moved on ({end}).
  // A done step implies every step before it is done too.

  const DIVE_RANK = { 0x00: 0, 0x01: 1, 0x02: 2, 0x05: 3, 0x06: 3, 0x03: 4, 0x04: 4 };

  function storyFacts(state) {
    const progress = hexToBytes(state.progress);
    const elsewhere = !onTitle(state) && state.world >= 2;
    const ttStarted = progress.length > 0 && progress[0] > 0;
    return {
      progress,
      diveRank: state.world === 0 && !onTitle(state) ? DIVE_RANK[state.room] : null,
      diveDone: elsewhere || ttStarted || state.world === 1,
      islandsDone: elsewhere || ttStarted,
    };
  }

  // {pre: [i, v]}: byte i of the story bytes before the main ones (progress_pre) has reached v.
  // On the islands, byte 3 reads 01 on day two (read on the Thor, 2026-10-24).
  const preAt = (state, [i, v]) => {
    const b = bytesOf(state, "progress_pre");
    return b && i < b.length ? b[i] >= v : null;
  };

  // One test, used both for "done" (the step's own fields) and for `from` (when the game hands it out):
  //   {p, at} story byte · {pre} byte before the main ones · {dive} Dive room order · {end} moved on ·
  //   {items} counts in the bag · {has} an item, spell, ability or Trinity (see has()) ·
  //   {reach} the player is in that map room now (judged only for the current step, see guideFor) ·
  //   {all} / {any} lists of tests.
  function test(c, f, state, world) {
    if (c.p != null) return c.p < f.progress.length ? f.progress[c.p] >= c.at : null;
    if (c.pre) return (world === "Destiny Islands" && f.islandsDone) || preAt(state, c.pre);
    if (c.dive != null) return f.diveDone || (f.diveRank != null && f.diveRank > c.dive);
    if (c.end === "dive") return f.diveDone;
    if (c.end === "islands") return f.islandsDone;
    if (c.items) {
      if (f.islandsDone) return true;
      const counts = c.items.map(([name, n]) => [itemCount(state, name), n]);
      if (counts.some(([n]) => n == null)) return null;
      return counts.every(([have, n]) => have >= n);
    }
    if (c.has) return has(c.has, state);
    if (c.reach) {
      const here = worldName(state.world) === world && !onTitle(state) ? nodeForRoom(state) : null;
      return !!here && here.id === c.reach;
    }
    const all = (list, every) => {
      const r = list.map((x) => test(x, f, state, world));
      return every ? (r.includes(false) ? false : r.includes(null) ? null : true)
        : (r.includes(true) ? true : r.includes(null) ? null : false);
    };
    if (c.all) return all(c.all, true);
    if (c.any) return all(c.any, false);
    return null;
  }
  const stepDone = (s, f, state, world) => test(s, f, state, world);

  // `seen`: step keys this device has already seen done, for steps whose evidence leaves
  // the save (items handed over). `next` is the first step not done, optional ones last.
  // Keyed by title, not position, so inserting a step doesn't shift what a device remembers.
  const stepKey = (world, s) => world + "#" + s.title;
  function guideFor(world, state, seen) {
    const f = storyFacts(state);
    const steps = ((GUIDE || {})[world] || []).map((s) => {
      // Being in a room only finishes a step that's current, so walking through early doesn't skip it.
      let done = s.reach ? false : stepDone(s, f, state, world);
      // `or`: a later story value that proves it too, for steps whose own evidence doesn't last.
      if (done !== true && s.or && test(s.or, f, state, world) === true) done = true;
      if (done !== true && seen && seen.has(stepKey(world, s))) done = true;
      const counts = s.items ? s.items.concat(s.extra || []).map(([name, n]) => ({ name, n, have: itemCount(state, name) })) : null;
      return { ...s, key: stepKey(world, s), done, counts };
    });
    for (let i = steps.length - 1, later = false; i >= 0; i--) {
      if (later && !steps[i].done && !steps[i].optional) steps[i].done = true;
      if (steps[i].done && !steps[i].optional) later = true;
    }
    // The first step not known to be done, in story order; optional ones only when nothing else is left.
    const first = () => steps.find((s) => s.done !== true && !s.optional) || steps.find((s) => s.done !== true) || null;
    let next = first();
    // A "reach" step is done the moment the player walks into its room while it's current, or into
    // the room of a later "reach" step (a save loaded further along the same path).
    const ahead = (s) => steps.slice(steps.indexOf(s)).filter((x) => x.reach).map((x) => x.reach);
    while (next && next.reach && ahead(next).some((r) => test({ reach: r }, f, state, world))) { next.done = true; next = first(); }
    // A step only shows once the game has handed it out (`from`): between objectives, while
    // scenes play, there's no next step rather than the last one or a peek at what's coming.
    if (next && next.from && test(next.from, f, state, world) === false) return { steps, next: null, waiting: true };
    return { steps, next };
  }

  // ---------- level-ups ----------
  // The path is what Sora kept at the Dive, read from the save (checked against the abilities
  // learned so far). The curve has no known save byte: it's the one whose EXP range holds the
  // current EXP at this level. `pick.curve` / `pick.path` are the player's own choice, and
  // `pick.seen` the curve this device last saw the save narrow down to (`seenExp` its EXP then),
  // used while the EXP fits more than one.

  const PATHS = ["Warrior", "Guardian", "Mystic"];
  const CURVES = ["Dawn", "Midday", "Dusk"];

  function cumulative(curve) {
    const out = [0, 0];
    LEVELS.exp[curve].forEach((n, i) => { out[i + 2] = out[i + 1] + n; });
    return out;
  }

  function levelInfo(state, pick) {
    if (!LEVELS) return null;
    const level = state.level || 1, exp = state.exp;
    const cum = Object.fromEntries(CURVES.map((c) => [c, cumulative(c)]));
    let curves = exp == null ? CURVES : CURVES.filter((c) => exp >= cum[c][level] && (level >= 100 || exp < cum[c][level + 1]));
    const learned = {};
    for (const v of bytesOf(state, "abilities") || []) if (v) learned[v & 0x7F] = (learned[v & 0x7F] || 0) + 1;
    const known = state.abilities != null;
    let paths = !known ? PATHS : PATHS.filter((p) => {
      const need = {};
      for (const [lv, code] of LEVELS.paths[p]) if (lv <= level && code >= 0x80) need[code & 0x7F] = (need[code & 0x7F] || 0) + 1;
      return Object.entries(need).every(([id, n]) => (learned[id] || 0) >= n);
    });
    // Nothing fits (an odd save, or a read gone wrong): don't rule anything out.
    if (!curves.length) curves = CURVES;
    // There's no save byte for the curve (the Dive answers set it), so every reading counts: a curve
    // ruled out earlier in this playthrough stays out. EXP never goes down, so lower EXP means another game.
    const fits = pick && (pick.fits || (pick.seen && [pick.seen]));
    const fitsExp = pick && (pick.fits ? pick.fitsExp : pick.seenExp);
    if (fits && exp != null && exp >= (fitsExp || 0)) {
      const still = curves.filter((c) => fits.includes(c));
      if (still.length) curves = still;
    }
    if (!paths.length) paths = PATHS;
    const kept = state.dive != null ? PATHS[hexToBytes(state.dive)[0]] : null;
    const fromSave = !!kept && paths.includes(kept);
    if (fromSave) paths = [kept];
    const choose = (fits, picked) => (fits.length === 1 ? fits[0] : fits.includes(picked) ? picked : null);
    const curve = choose(curves, pick && pick.curve);
    const path = choose(paths, pick && pick.path);
    const stats = Object.fromEntries(LEVELS.stats);
    const rewards = (lv, p) => ({
      stat: stats[lv] || null,
      bonus: p ? (LEVELS.paths[p].find(([l]) => l === lv) || [])[1] || null : null,
    });
    return {
      level, exp, curves, paths, curve, path, cum,
      autoCurve: exp != null && curves.length === 1, autoPath: fromSave || (paths.length === 1 && known),
      toNext: curve && exp != null && level < 100 ? cum[curve][level + 1] - exp : null,
      rewards, name: (code) => LEVELS.names[code],
    };
  }

  // Everything the page shows, derived from one snapshot.
  function summarize(state) {
    const opened = hexToBytes(state.chests);
    const rep = hexToBytes(state.reports);
    const reports = REPORTS.map((r) => ({ ...r, got: bit(rep, r.B, r.b), num: +(/Report (\d+)/.exec(r.n) || [0, 0])[1] }))
      .sort((a, b) => a.num - b.num);
    const worlds = {};
    for (const w of trackedWorlds()) {
      const cs = chestsFor(w, opened, state);
      worlds[w] = { got: cs.filter((c) => c.got).length, total: cs.length };
    }
    const found = {};
    for (const w of new Set([...Object.keys(MAPS), ...CHESTS.map((c) => c.w)])) found[w] = discovery(w, state, opened);
    const puppyChests = CHESTS.filter(isPuppies).map((c) => {
      const n = nodeForChest(c);
      return { ...c, got: bit(opened, c.B, c.b), node: n ? n.id : null };
    });
    return {
      title: onTitle(state),
      world: onTitle(state) ? null : worldName(state.world),
      room: onTitle(state) ? null : roomName(state),
      opened,
      worlds,
      found,
      chestsGot: CHESTS.filter((c) => bit(opened, c.B, c.b)).length,
      chestsTotal: CHESTS.length,
      puppies: Math.min(99, popcount(hexToBytes(state.puppies))),
      puppyChests,
      postcards: Math.min(10, state.postcards || 0),
      reports,
    };
  }

  return {
    WORLDS, MAPS, ROOM_NAMES, hexToBytes, bit, popcount, worldName, roomName, onTitle, trackedWorlds, isPuppies,
    GUIDE, LEVELS, PATHS, CURVES, nodesOf, node, labelOf, nodeForChest, nodeForRoom, chestsFor, guideFor, summarize,
    has, needName, lockOf, nodeAccess, levelInfo, itemCount, knownRooms,
  };
});
