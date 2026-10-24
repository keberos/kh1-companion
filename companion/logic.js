// KH1 Second-Screen Companion: pure decoding logic, shared by the page and the node tests.
// Turns a bridge snapshot (state.json) into named, countable things. No DOM access.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.KH1Logic = factory(root.KH1_CHESTS, root.KH1_REPORTS, root.KH1_MAPS);
})(typeof self !== "undefined" ? self : this, function (CHESTS, REPORTS, MAPS) {
  "use strict";

  // World byte -> name (the chest data's world names). "ok" = confirmed in game or by
  // a commented community script; the rest follow the game's world order.
  // World 0 is shared: room 0 is the title screen, rooms 1+ are Dive to the Heart.
  const WORLDS = {
    0x00: { name: "Awakening", ok: true },
    0x01: { name: "Destiny Islands", ok: true },
    0x02: { name: "Disney Castle" },
    0x03: { name: "Traverse Town", ok: true },
    0x05: { name: "Wonderland" },
    0x06: { name: "Deep Jungle" },
    0x07: { name: "100 Acre Wood" },
    0x08: { name: "Agrabah" },
    0x09: { name: "Atlantica", ok: true },
    0x0A: { name: "Halloween Town" },
    0x0B: { name: "Olympus Coliseum", ok: true },
    0x0C: { name: "Monstro" },
    0x0D: { name: "Neverland", ok: true },
    0x0F: { name: "Hollow Bastion", ok: true },
    0x10: { name: "End of the World", ok: true },
  };

  const hexToBytes = (h) => {
    const a = new Uint8Array((h || "").length >> 1);
    for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
    return a;
  };
  const bit = (bytes, B, b) => B < bytes.length && (bytes[B] >> b & 1) === 1;
  const popcount = (bytes) => bytes.reduce((n, x) => { while (x) { n += x & 1; x >>= 1; } return n; }, 0);

  const worldName = (id) => (WORLDS[id] ? WORLDS[id].name : null);
  const onTitle = (state) => state.world === 0 && state.room === 0;
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

  // Which map node the player is in. `labels` maps "world:room" to a node id the player
  // picked on this device; known room bytes from the map data are the fallback.
  function nodeForRoom(state, labels) {
    const world = worldName(state.world);
    if (!world || onTitle(state)) return null;
    const picked = labels && labels[state.world + ":" + state.room];
    return (picked && node(world, picked)) || nodesOf(world).find((n) => (n.rooms || []).includes(state.room)) || null;
  }

  function chestsFor(world, opened) {
    return CHESTS.filter((c) => c.w === world).map((c) => {
      const n = nodeForChest(c);
      return { ...c, got: bit(opened, c.B, c.b), node: n ? n.id : null };
    });
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
      worldVerified: !!(WORLDS[state.world] && WORLDS[state.world].ok),
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
    WORLDS, MAPS, hexToBytes, bit, popcount, worldName, onTitle, trackedWorlds, isPuppies,
    nodesOf, node, labelOf, nodeForChest, nodeForRoom, chestsFor, summarize,
  };
});
