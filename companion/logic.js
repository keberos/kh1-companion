// KH1 Second-Screen Companion: pure decoding logic, shared by the page and the node tests.
// Turns a bridge snapshot (state.json) into named, countable things. No DOM access.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.KH1Logic = factory(root.KH1_CHESTS, root.KH1_REPORTS, root.KH1_MAPS, root.KH1_GUIDE, root.KH1_ROOM_NAMES);
})(typeof self !== "undefined" ? self : this, function (CHESTS, REPORTS, MAPS, GUIDE, ROOM_NAMES) {
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

  const hexToBytes = (h) => {
    const a = new Uint8Array((h || "").length >> 1);
    for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
    return a;
  };
  const bit = (bytes, B, b) => B < bytes.length && (bytes[B] >> b & 1) === 1;
  const popcount = (bytes) => bytes.reduce((n, x) => { while (x) { n += x & 1; x >>= 1; } return n; }, 0);

  const worldName = (id) => (WORLDS[id] ? WORLDS[id].name : null);
  const onTitle = (state) => state.world === 0 && state.room === 0 && !state.in_field;
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

  // Which map node the player is in: from the room bytes in the map data. `labels` maps
  // "world:room" to a node the player picked on this device, for any room the data lacks.
  function nodeForRoom(state, labels) {
    const world = worldName(state.world);
    if (!world || onTitle(state)) return null;
    const known = nodesOf(world).find((n) => (n.rooms || []).includes(state.room));
    if (known) return known;
    const picked = labels && labels[state.world + ":" + state.room];
    return (picked && node(world, picked)) || null;
  }

  function chestsFor(world, opened) {
    return CHESTS.filter((c) => c.w === world).map((c) => {
      const n = nodeForChest(c);
      return { ...c, got: bit(opened, c.B, c.b), node: n ? n.id : null };
    });
  }

  // Story steps for a world, each marked done / not done / unknown (older bridges sent
  // fewer progress bytes). `next` is the first step not yet done.
  function guideFor(world, state) {
    const progress = hexToBytes(state.progress);
    const steps = ((GUIDE || {})[world] || []).map((s) => {
      const v = s.p < progress.length ? progress[s.p] : null;
      return { ...s, done: v == null ? null : v >= s.at };
    });
    return { steps, next: steps.find((s) => s.done === false) || null };
  }

  // Everything the page shows, derived from one snapshot.
  function summarize(state) {
    const opened = hexToBytes(state.chests);
    const rep = hexToBytes(state.reports);
    const reports = REPORTS.map((r) => ({ ...r, got: bit(rep, r.B, r.b), num: +(/Report (\d+)/.exec(r.n) || [0, 0])[1] }))
      .sort((a, b) => a.num - b.num);
    const worlds = {};
    for (const w of trackedWorlds()) {
      const cs = chestsFor(w, opened);
      worlds[w] = { got: cs.filter((c) => c.got).length, total: cs.length };
    }
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
    GUIDE, nodesOf, node, labelOf, nodeForChest, nodeForRoom, chestsFor, guideFor, summarize,
  };
});
