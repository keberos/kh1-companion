// Tests for companion/logic.js, plus replay of every recording in recordings/fixtures/.
// Run:  node --test tools/test_logic.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(path.join(ROOT, "companion/data.js"), "utf8"), sandbox);
vm.runInNewContext(readFileSync(path.join(ROOT, "companion/maps.js"), "utf8"), sandbox);
vm.runInNewContext(readFileSync(path.join(ROOT, "companion/guide.js"), "utf8"), sandbox);
// JSON round-trip so arrays come from this realm (deepStrictEqual checks prototypes).
vm.runInNewContext(readFileSync(path.join(ROOT, "companion/abilities.js"), "utf8"), sandbox);
const { KH1_CHESTS: CHESTS, KH1_REPORTS: REPORTS, KH1_MAPS: MAPS, KH1_GUIDE: GUIDE, KH1_ROOM_NAMES: ROOM_NAMES, KH1_LEVELS: LEVELS,
  KH1_ABILITY_INFO: ABILITY_INFO, KH1_STAT_INFO: STAT_INFO } = JSON.parse(JSON.stringify(sandbox.window));
const L = createRequire(import.meta.url)(path.join(ROOT, "companion/logic.js"))(CHESTS, REPORTS, MAPS, GUIDE, ROOM_NAMES, LEVELS);

const FIXTURES = path.join(ROOT, "recordings/fixtures");
const blank = (over = {}) => ({
  v: 1, edition: "steam", world: 3, room: 1, in_field: true, level: 1, max_hp: 18, max_mp: 2, ap: 2,
  postcards: 0, chests: "00".repeat(509), reports: "0000", puppies: "00".repeat(13), cups: "00000000",
  progress: "00".repeat(12), seq: 1, t: 0, ...over,
});
const setBits = (pairs, bytes = 509) => {
  const a = new Uint8Array(bytes);
  for (const [B, b] of pairs) a[B] |= 1 << b;
  return Buffer.from(a).toString("hex");
};

test("data covers the whole chest flag array", () => {
  assert.equal(CHESTS.length, 232);
  assert.equal(REPORTS.length, 13);
  assert.equal(new Set(CHESTS.map((c) => c.B * 8 + c.b)).size, 232, "no two chests share a bit");
  assert.ok(CHESTS.every((c) => c.B >= 0 && c.B < 509 && c.b >= 0 && c.b < 8));
});

test("every world with chests has a map, and every chest sits in a map room", () => {
  for (const w of new Set(CHESTS.map((c) => c.w))) assert.ok(MAPS[w], `no map for ${w}`);
  const missing = CHESTS.filter((c) => !L.nodeForChest(c));
  assert.deepEqual(missing.map((c) => `${c.w}: ${c.n} (room ${c.r})`), []);
});

test("maps are well formed", () => {
  for (const [w, m] of Object.entries(MAPS)) {
    const ids = m.nodes.map((n) => n.id);
    assert.equal(new Set(ids).size, ids.length, `${w}: duplicate node ids`);
    const cells = m.nodes.map((n) => `${n.x},${n.y}`);
    assert.equal(new Set(cells).size, cells.length, `${w}: two rooms in one grid cell`);
    const rooms = m.nodes.flatMap((n) => n.rooms || []);
    assert.equal(new Set(rooms).size, rooms.length, `${w}: a room byte is claimed twice`);
    for (const [a, b, kind] of m.edges) {
      assert.ok(ids.includes(a) && ids.includes(b), `${w}: edge ${a} - ${b} names a missing room`);
      assert.equal(kind, undefined, `${w}: ${a} - ${b} is marked approximate; every path should be researched and confirmed`);
    }
    if (m.nodes.length > 1) {
      const linked = new Set(m.edges.flat());
      // Rooms you only see in story scenes have no walkable exits.
      for (const n of m.nodes) if (!n.alone && !(n.gate && n.gate.scene)) assert.ok(linked.has(n.id), `${w}: ${n.id} has no exits`);
    }
  }
});

test("chests with no room in the data still land in the right room", () => {
  const find = (w, prefix) => L.nodeForChest(CHESTS.find((c) => c.w === w && c.n.startsWith(prefix))).id;
  assert.equal(find("Atlantica", "Ariel's Grotto"), "Ariel's Grotto");
  assert.equal(find("Hollow Bastion", "Library 1st Floor"), "Library");
  assert.equal(find("Awakening", "Chest"), "Alice Platform");
});

test("room bytes confirmed by community scripts resolve to the right room", () => {
  const at = (world, room) => L.nodeForRoom(blank({ world, room }))?.id;
  assert.equal(at(3, 0x0B), "Item Workshop");
  assert.equal(at(3, 0x16), "Secret Waterway");
  assert.equal(at(15, 0x04), "Entrance Hall");
  assert.equal(at(0, 0x02), "Alice Platform");
  assert.equal(L.nodeForRoom(blank({ world: 0, room: 0, in_field: false })), null, "title screen is nowhere");
});

test("an unknown room byte maps to no room", () => {
  assert.equal(L.nodeForRoom(blank({ world: 3, room: 0x30 })), null);
});

test("all 33 puppy chests are known and placed", () => {
  const s = L.summarize(blank());
  assert.equal(s.puppyChests.length, 33);
  assert.ok(s.puppyChests.every((c) => c.node && !c.got));
});

test("a blank save counts nothing", () => {
  const s = L.summarize(blank());
  assert.equal(s.world, "Traverse Town");
  assert.equal(s.chestsGot, 0);
  assert.equal(s.puppies, 0);
  assert.ok(s.reports.every((r) => !r.got));
});

test("chest bits decode to the right named chests", () => {
  const picks = [CHESTS[0], CHESTS[100], CHESTS[231]];
  const s = L.summarize(blank({ chests: setBits(picks.map((c) => [c.B, c.b])) }));
  assert.equal(s.chestsGot, 3);
  for (const c of picks) {
    assert.ok(L.chestsFor(c.w, s.opened).find((x) => x.n === c.n).got, c.n);
  }
});

test("Archipelago id formula: location 2650211 is byte 20 bit 0", () => {
  // location id = 2650000 + (B+1)*10 + (b+1); 2650211 is TT's candle puzzle chest
  const s = L.summarize(blank({ chests: setBits([[20, 0]]) }));
  const got = CHESTS.filter((c) => L.bit(s.opened, c.B, c.b));
  assert.deepEqual(got.map((c) => `${c.w}: ${c.n}`), ["Traverse Town: 1st District Candle Puzzle Chest"]);
});

test("puppies are a bit count capped at 99, reports are numbered 1-13", () => {
  assert.equal(L.summarize(blank({ puppies: "ff".repeat(13) })).puppies, 99);
  assert.equal(L.summarize(blank({ puppies: "fff0" + "00".repeat(11) })).puppies, 12);
  const s = L.summarize(blank({ reports: "ffff" }));
  assert.deepEqual(s.reports.map((r) => r.num), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  assert.ok(s.reports.every((r) => r.got));
});

test("world 0 is the title screen in room 0 and Dive to the Heart otherwise", () => {
  const title = L.summarize(blank({ world: 0, room: 0, in_field: false }));
  assert.equal(title.title, true);
  assert.equal(title.world, null);
  const dive = L.summarize(blank({ world: 0, room: 2 }));
  assert.equal(dive.title, false);
  assert.equal(dive.world, "Awakening");
  const disembark = L.summarize(blank({ world: 0, room: 0, in_field: true }));
  assert.equal(disembark.title, false, "Dive's first platform is room 0 too, with the HUD up");
});

test("the Dive's weapon choice isn't the title, though it reports world 0, room 0, no HUD", () => {
  // Both read on the Thor (2026-10-24): the Sword/Shield/Rod pedestals of a new game, and the title
  // after quitting. The Dive answers read the same on both; only the Dive's story byte differs.
  const at = { world: 0, room: 0, in_field: false, dive: "000000ffffff", progress: "00".repeat(16) };
  const choosing = L.summarize(blank({ ...at, progress_pre: "0a040000" }));
  assert.equal(choosing.title, false, "the Dive's story byte has started: a new game");
  assert.equal(choosing.world, "Awakening");
  const title = blank({ ...at, progress_pre: "00000000" });
  assert.equal(L.summarize(title).title, true, "story bytes all zero and nothing changing: the title");
  assert.equal(L.summarize({ ...title, live: true }).title, false, "save data changed here: a game is running");
  const leftover = blank({ ...at, progress_pre: "0a7f0000", progress: "40" + "00".repeat(15) });
  assert.equal(L.summarize(leftover).title, true, "a save past the Dive left in memory still counts as the title");
});

test("every named room in every mapped world belongs to exactly one map node", () => {
  const ids = Object.fromEntries(Object.entries(L.WORLDS).map(([b, w]) => [b, w.name]));
  const problems = [];
  for (const [byte, names] of Object.entries(ROOM_NAMES)) {
    const world = ids[byte];
    assert.ok(world, `room table has world byte ${byte} that WORLDS lacks`);
    if (!MAPS[world]) { problems.push(`${world}: no map`); continue; }
    names.forEach((name, room) => {
      if (name === "???") return;
      const owners = MAPS[world].nodes.filter((n) => (n.rooms || []).includes(room));
      if (owners.length !== 1) problems.push(`${world} 0x${room.toString(16)} ${name}: ${owners.length} nodes`);
    });
    for (const n of MAPS[world].nodes) for (const r of n.rooms || []) {
      if (r >= names.length) problems.push(`${world} node ${n.id} claims 0x${r.toString(16)}, beyond the room table`);
    }
  }
  assert.deepEqual(problems, []);
});

test("the header names the exact room", () => {
  assert.equal(L.summarize(blank({ world: 1, room: 0x04 })).room, "Seaside Shack");
  assert.equal(L.nodeForRoom(blank({ world: 1, room: 0x04 })).id, "Seaside Shack");
  assert.equal(L.summarize(blank({ world: 3, room: 0x10 })).room, "Piano Room");
  assert.equal(L.nodeForRoom(blank({ world: 3, room: 0x10 })).id, "Dalmatians' House");
  assert.equal(L.summarize(blank({ world: 3, room: 0x15 })).room, null, "unnamed rooms show no name");
});

test("world bytes match the MultiPresence table", () => {
  const expect = { 4: "Wonderland", 5: "Deep Jungle", 6: "100 Acre Wood", 12: "Monstro", 14: "Hollow Bastion", 15: "Hollow Bastion" };
  for (const [b, w] of Object.entries(expect)) assert.equal(L.worldName(+b), w);
});

test("guide steps point at real rooms and read story progress", () => {
  for (const [w, steps] of Object.entries(GUIDE)) {
    assert.ok(MAPS[w], `guide world ${w} has no map`);
    for (const s of steps) {
      if (s.where) assert.ok(L.node(w, s.where), `${w}: step "${s.title}" points at missing room ${s.where}`);
      assert.ok(s.hint && s.title && s.nudge, `${w}: step "${s.title}" lacks a layer`);
      const kinds = [s.p != null, s.items != null, s.dive != null, s.end != null, s.pre != null, s.has != null, s.reach != null, s.all != null, s.any != null].filter(Boolean).length;
      if (s.reach) assert.ok(L.node(w, s.reach), `${w}: step "${s.title}" waits for missing room ${s.reach}`);
      assert.equal(kinds, 1, `${w}: step "${s.title}" needs exactly one way to count as done`);
      if (s.p != null) assert.ok(Number.isInteger(s.p) && Number.isInteger(s.at), `${w}: bad progress step`);
      // The nudge is the spoiler-free layer: it must not name the event's boss or reward.
      for (const r of s.rewards || []) assert.ok(!s.nudge.includes(r), `${w}: nudge for "${s.title}" names ${r}`);
      const boss = /^Defeat (?:the )?(.+?)(?: again)?$/.exec(s.title);
      if (boss) assert.ok(!s.nudge.includes(boss[1]), `${w}: nudge for "${s.title}" names ${boss[1]}`);
    }
  }
  const prog = (vals) => Buffer.from(vals).toString("hex");
  const p = new Array(16).fill(0); p[0] = 0x2B; // Traverse Town: Guard Armor beaten, not regrouped yet
  const g = L.guideFor("Traverse Town", blank({ progress: prog(p) }));
  assert.equal(g.steps[0].done, true);
  assert.equal(g.next.title, "Regroup with Donald and Goofy");
  const old = L.guideFor("Traverse Town", blank({ progress: "00".repeat(12) }));
  assert.equal(old.steps.find((s) => s.p === 14).done, null, "12-byte bridges can't see the extra TT byte");
});

const hexOf = (vals) => Buffer.from(vals).toString("hex");
const inv = (items) => { const a = new Array(256).fill(0); for (const [i, n] of Object.entries(items)) a[i] = n; return hexOf(a); };

test("Dive to the Heart steps follow the room order, and leaving finishes them", () => {
  const at = (room) => L.guideFor("Awakening", blank({ world: 0, room, progress: "00".repeat(16) }));
  assert.equal(at(0x00).next.title, "Choose your path");
  assert.equal(at(0x01).next.title, "Cross the stations");
  assert.equal(at(0x05).next.title, "Answer the questions");
  assert.equal(at(0x03).next.title, "Face what waits at the end");
  assert.equal(L.guideFor("Awakening", blank({ world: 1, room: 0 })).next, null);
});

test("Destiny Islands errands count items, and remembered steps survive handing them over", () => {
  // Day one, supplies not handed over, unless a test says otherwise: the islands' story counter
  // (progress_pre byte 2) reads 01 then.
  const di = (over) => L.guideFor("Destiny Islands", blank({ world: 1, room: 0, progress: "00".repeat(16), progress_pre: "0a560100", ...over }), over.seen);
  let g = di({ inventory: inv({ 192: 1, 193: 1 }) });
  assert.equal(g.next.title, "Gather raft supplies");
  assert.deepEqual(g.next.counts.map((c) => [c.name, c.have, c.n]), [["Log", 1, 2], ["Cloth", 1, 1], ["Rope", 0, 1]]);
  g = di({ inventory: inv({ 192: 2, 193: 1, 194: 1 }) });
  assert.equal(g.next.title, "Wrap up the first day");
  // Items handed to Kairi: gone from the bag, so only the device's memory knows step 1 was done.
  assert.equal(di({ inventory: inv({}) }).next.title, "Gather raft supplies");
  assert.equal(di({ inventory: inv({}), seen: new Set(["Destiny Islands#Gather raft supplies"]) }).next.title, "Wrap up the first day");
  g = di({ inventory: inv({ 197: 1 }), progress_pre: "0a561401", seen: new Set(["Destiny Islands#Gather raft supplies"]) });
  assert.equal(g.next.title, "Gather food and water", "Kairi gave the list (counter 0x14)");
  const p = new Array(16).fill(0); p[0] = 0x05;
  assert.equal(L.guideFor("Destiny Islands", blank({ world: 3, progress: hexOf(p), inventory: inv({}) })).next, null);
  assert.equal(di({ progress_pre: undefined }).next.title, "Gather raft supplies", "an old bridge can't see items or story bytes: fall back to the first unknown");
});

test("chest locks come from what the save has", () => {
  const hj = CHESTS.find((c) => c.q && c.q.length === 1 && c.q[0].length === 1 && c.q[0][0] === "High Jump");
  assert.ok(hj, "some chest needs only High Jump");
  const lock = (over) => L.chestsFor(hj.w, new Uint8Array(509), blank(over)).find((c) => c.n === hj.n).lock;
  assert.deepEqual(lock({ shared: "00".repeat(8) }), ["High Jump"]);
  assert.equal(lock({ shared: "81" + "00".repeat(7) }), null, "equipped High Jump (0x80 | 1) counts");
  assert.equal(lock({}), null, "an old bridge can't tell, so nothing is shown as locked");
  assert.deepEqual(L.lockOf([["Progressive Glide:2"], ["Progressive Fire:2", "Blue Trinity"]],
    blank({ shared: "83" + "00".repeat(7), magic: "01000000000000", magic_unlocked: 1, trinities: 0 })), ["Superglide"], "the shortest missing list wins");
  assert.equal(L.needName("Progressive Glide:2"), "Superglide");
  assert.equal(L.has("Entry Pass", blank({ inventory: inv({}), progress: hexOf([0, 0, 0x28, ...new Array(13).fill(0)]) })), true,
    "story-given key items count even after they leave the bag");
});

test("rooms behind a story point or an ability are shut until then", () => {
  const hall = L.node("Hollow Bastion", "Grand Hall");
  const p = new Array(16).fill(0);
  p[10] = 0x5A;
  assert.equal(L.nodeAccess("Hollow Bastion", hall, blank({ progress: hexOf(p) })).open, false);
  p[10] = 0x6E;
  assert.equal(L.nodeAccess("Hollow Bastion", hall, blank({ progress: hexOf(p) })).open, true);
  assert.equal(L.nodeAccess("Destiny Islands", L.node("Destiny Islands", "Sora's Room"), blank({})).open, false,
    "story-scene rooms are never open to walk into");
  const throat = L.node("Monstro", "Throat");
  assert.deepEqual(L.nodeAccess("Monstro", throat, blank({ shared: "00".repeat(8) })).need, ["High Jump"]);
  for (const [w, map] of Object.entries(MAPS)) for (const n of map.nodes) if (n.gate) {
    assert.ok(n.gate.p != null || n.gate.need || n.gate.scene, `${w} ${n.id}: empty gate`);
    if (n.gate.p != null) assert.ok((GUIDE[w] || []).some((s) => s.p === n.gate.p && s.at === n.gate.at) || n.gate.p === 2,
      `${w} ${n.id}: gate should match a guide step`);
  }
});

test("level-ups: tables are complete and the save picks the path and curve", () => {
  for (const c of L.CURVES) assert.equal(LEVELS.exp[c].length, 99);
  for (const p of L.PATHS) assert.ok(LEVELS.paths[p].length > 30);
  for (const code of Object.keys(LEVELS.names)) assert.ok(ABILITY_INFO[LEVELS.names[code]], `no description for ${LEVELS.names[code]}`);
  for (const [, stat] of LEVELS.stats) assert.ok(STAT_INFO[stat], `no description for stat ${stat}`);
  const fresh = L.levelInfo(blank({ level: 1, exp: 0, abilities: "00".repeat(48) }), {});
  assert.deepEqual(fresh.curves, ["Dawn", "Midday", "Dusk"]);
  assert.deepEqual(fresh.paths, ["Warrior", "Guardian", "Mystic"]);
  assert.equal(fresh.path, null);
  // Level 6 with Sliding Dash learned (Warrior's level 6 ability, 0xB6): only Warrior fits.
  const cumMid = [0, 0]; LEVELS.exp.Midday.forEach((n, i) => { cumMid[i + 2] = cumMid[i + 1] + n; });
  const w = L.levelInfo(blank({ level: 6, exp: cumMid[6], abilities: "b6" + "00".repeat(47) }), { path: "Mystic" });
  assert.deepEqual(w.paths, ["Warrior"]);
  assert.equal(w.path, "Warrior", "the save beats a stale pick");
  assert.ok(w.curves.includes("Midday"));
  for (const c of w.curves) assert.ok(cumMid[6] >= w.cum[c][6] && cumMid[6] < w.cum[c][7]);
  assert.equal(w.rewards(6, "Warrior").bonus, 0xB6);
  assert.equal(w.name(0xB6), "Sliding Dash");
  const odd = L.levelInfo(blank({ level: 38, exp: 1, abilities: "00".repeat(48) }), { curve: "Dusk" });
  assert.deepEqual(odd.curves, ["Dawn", "Midday", "Dusk"], "EXP that fits no curve rules nothing out");
  assert.equal(odd.curve, "Dusk");
  // The save's Dive byte names the path outright, from level 1.
  const shield = L.levelInfo(blank({ level: 1, exp: 0, abilities: "00".repeat(48), dive: "010000000000" }), { path: "Warrior" });
  assert.equal(shield.path, "Guardian");
  assert.equal(shield.autoPath, true);
  // ...unless learned abilities contradict it (a bad read): then abilities decide.
  const clash = L.levelInfo(blank({ level: 6, exp: cumMid[6], abilities: "b6" + "00".repeat(47), dive: "020000000000" }), {});
  assert.equal(clash.path, "Warrior");
  // A curve the device saw the save narrow down to carries on while EXP is ambiguous, in the same run only.
  const amb = L.levelInfo(blank({ level: 1, exp: 0 }), { seen: "Dusk", seenExp: 0 });
  assert.equal(amb.curve, "Dusk");
  assert.equal(amb.autoCurve, true);
  assert.equal(L.levelInfo(blank({ level: 1, exp: 0 }), { seen: "Dusk", seenExp: 500 }).curve, null, "EXP went down: a new game");
  const picked = L.levelInfo(blank({ level: 2, exp: undefined }), { path: "Guardian", curve: "Dusk" });
  assert.equal(picked.path, "Guardian");
  assert.equal(picked.curve, "Dusk");
});

test("worlds stay hidden until the save has found them", () => {
  const st = (bytes) => hexOf([...bytes, ...new Array(11 - bytes.length).fill(0)]);
  let s = L.summarize(blank({ world: 1, room: 0, progress: "00".repeat(16), world_status: st([]) }));
  assert.equal(s.found["Destiny Islands"], "visited");
  assert.equal(s.found["Traverse Town"], "hidden");
  assert.equal(s.found["Hollow Bastion"], "hidden");
  s = L.summarize(blank({ world: 3, progress: "00".repeat(16), world_status: st([3, 1, 2, 0]) }));
  assert.equal(s.found["Traverse Town"], "visited");
  assert.equal(s.found["Wonderland"], "seen", "on the Gummi map, not visited");
  assert.equal(s.found["Olympus Coliseum"], "seen");
  assert.equal(s.found["Deep Jungle"], "hidden");
  const p = new Array(16).fill(0); p[1] = 0x10;
  assert.equal(L.summarize(blank({ world: 3, progress: hexOf(p) })).found["Deep Jungle"], "visited", "story progress counts");
  assert.equal(L.summarize(blank({ world: 3, progress: "00".repeat(16) })).found["Monstro"], "hidden", "old bridge: hidden without evidence");
});

test("rooms count as visited from this device, opened chests and finished steps", () => {
  const tt = (b) => hexOf([b, ...new Array(15).fill(0)]);
  const opened = new Uint8Array(509);
  const red = CHESTS.find((c) => c.w === "Traverse Town" && c.n === "Red Room Chest");
  opened[red.B] |= 1 << red.b;
  const st = blank({ world: 3, room: 0x01, progress: tt(0x2B), chests: Buffer.from(opened).toString("hex") });
  const known = L.knownRooms("Traverse Town", st, opened, ["Item Shop"], new Set());
  assert.ok(known.has("2nd District"), "where you are");
  assert.ok(known.has("Red Room"), "a room with an opened chest");
  assert.ok(known.has("3rd District"), "where a finished story step happened");
  assert.ok(known.has("Item Shop"), "seen on this device");
  assert.ok(!known.has("Secret Waterway"), "never been there");
});

test("real Steam recording: the Dive to the Heart chest flips Awakening: Chest", () => {
  const frames = readFileSync(path.join(FIXTURES, "steam-dive-to-the-heart.jsonl"), "utf8")
    .split("\n").filter(Boolean).map((l) => JSON.parse(l).state);
  assert.ok(frames.every((s) => s.edition === "steam"));
  const opened = frames.map((s) => L.summarize(s).chestsGot);
  const i = opened.indexOf(1);
  assert.ok(i > 0, "a chest gets opened");
  const s = L.summarize(frames[i]);
  assert.deepEqual(L.chestsFor("Awakening", s.opened).filter((c) => c.got).map((c) => c.n), ["Chest"]);
  assert.equal(frames[i].world, 0);
  assert.equal(frames[i].room, 2);
});

test("unknown worlds are reported as such", () => {
  assert.equal(L.summarize(blank({ world: 0x07 })).world, null);
  assert.equal(L.summarize(blank({ world: 0x04 })).world, "Wonderland");
});

for (const name of readdirSync(FIXTURES).filter((f) => f.endsWith(".jsonl"))) {
  test(`fixture ${name} decodes cleanly frame by frame`, () => {
    const frames = readFileSync(path.join(FIXTURES, name), "utf8").split("\n").filter(Boolean).map(JSON.parse);
    assert.ok(frames.length > 0);
    let prevTs = -1;
    for (const [i, { ts, state }] of frames.entries()) {
      assert.ok(ts >= prevTs, `frame ${i}: time went backwards`);
      prevTs = ts;
      assert.equal(state.chests.length, 509 * 2, `frame ${i}: chest array size`);
      const s = L.summarize(state);
      assert.ok(s.chestsGot <= s.chestsTotal);
      const perWorld = Object.values(s.worlds).reduce((n, w) => n + w.got, 0);
      assert.ok(perWorld <= s.chestsGot, `frame ${i}: per-world sum exceeds total`);
    }
  });
}

test("the growth curve narrows with every EXP reading and resets on a new game", () => {
  // At LV 1 with 14 EXP, Dawn is out: it reaches LV 2 at 12.
  const first = L.levelInfo(blank({ level: 1, exp: 14 }), {});
  assert.deepEqual(first.curves, ["Midday", "Dusk"]);
  assert.equal(first.curve, null, "two curves still fit: no exact EXP yet");
  // LV 2 at 26 EXP fits all three on its own; remembering the earlier reading keeps Dawn out.
  const pick = { fits: first.curves, fitsExp: 14 };
  assert.deepEqual(L.levelInfo(blank({ level: 2, exp: 26 }), pick).curves, ["Midday", "Dusk"]);
  // 45 EXP at LV 2 only fits Dusk (Midday would be LV 3 at 42).
  const pinned = L.levelInfo(blank({ level: 2, exp: 45 }), pick);
  assert.equal(pinned.curve, "Dusk");
  assert.equal(pinned.toNext, 58 - 45);
  // Lower EXP than remembered means another game: start over.
  assert.deepEqual(L.levelInfo(blank({ level: 1, exp: 5 }), { fits: ["Dusk"], fitsExp: 45 }).curves, ["Dawn", "Midday", "Dusk"]);
  // Older saves of the app's memory (one pinned curve) still count.
  assert.equal(L.levelInfo(blank({ level: 2, exp: 26 }), { seen: "Midday", seenExp: 20 }).curve, "Midday");
});

test("Destiny Islands follows its story counter, beat by beat", () => {
  // progress_pre byte 2, recorded on the Thor (2026-10-24) and in the RA code notes: 04 supplies handed
  // over, 07 called it a day, 0a met Riku, 14 Kairi's list (the race in between changes nothing),
  // 17 food handed over, 1e the storm, 24 Riku's scene.
  const island = (b2, b3 = 1) => blank({ world: 1, room: 0, progress: "00".repeat(15) + "12",
    progress_pre: "0a56" + b2 + "0" + b3, inventory: "00".repeat(256) });
  const seen = new Set(["Destiny Islands#Gather raft supplies"]);
  const next = (b2, b3) => (L.guideFor("Destiny Islands", island(b2, b3), seen).next || {}).title;
  assert.equal(next("04", 0), "Wrap up the first day");
  assert.equal(next("07", 0), "Meet Riku in the Cove", "day one done");
  assert.equal(next("0a"), "Talk to Kairi on the raft", "after meeting Riku: the race is forced, so Kairi is next");
  assert.equal(next("14"), "Gather food and water");
  assert.equal(L.guideFor("Destiny Islands", island("17"), seen).waiting, true, "night scenes: nothing to do");
  assert.equal(next("1e"), "Find Riku in the storm");
  assert.equal(next("24"), "Find Kairi");
});


test("a spell counts only once it's learned: its level reads 1 before that", () => {
  // Read on the Thor in the Dive: no spells yet, levels 01 x7 (2026-10-24).
  const fresh = blank({ magic: "01010101010101", magic_unlocked: 0 });
  assert.equal(L.has("Progressive Fire", fresh), false);
  assert.equal(L.has("Progressive Fire", { ...fresh, magic_unlocked: 1 }), true);
  assert.equal(L.has("Progressive Fire:2", { ...fresh, magic_unlocked: 1 }), false, "Fira needs level 2");
  assert.equal(L.has("Progressive Fire", blank({ magic: "01010101010101" })), null, "an older bridge can't tell");
});

test("a room finishes a step only while that step is current", () => {
  const tt = (room, p0 = 0) => { const p = new Array(16).fill(0); p[0] = p0; return blank({ world: 3, room, progress: hexOf(p) }); };
  const green = L.nodesOf("Traverse Town").find((n) => n.id === "Green Room").rooms[0];
  const first = L.nodesOf("Traverse Town").find((n) => n.id === "1st District").rooms[0];
  assert.equal(L.guideFor("Traverse Town", tt(first)).next.title, "Look around town");
  assert.equal(L.guideFor("Traverse Town", tt(green)).next.title, "Defeat the Guard Armor", "waking in the Hotel ends the first step");
  // A later story value finishes the room step without the room having been seen.
  assert.equal(L.guideFor("Traverse Town", tt(first, 0x31)).steps[0].done, true);
  // Back in town before the Red Trinity: nothing to do here yet.
  assert.equal(L.guideFor("Traverse Town", { ...tt(first, 0x31), trinities: 0 }).waiting, true);
  assert.equal(L.guideFor("Traverse Town", { ...tt(first, 0x31), trinities: 2 }).next.title, "Meet Leon in the Secret Waterway");
});

test("key items finish steps, and later checkpoints finish everything before them", () => {
  const wl = (at, over = {}) => { const p = new Array(16).fill(0); p[3] = at;
    return L.guideFor("Wonderland", blank({ world: 4, room: 0x30, progress: hexOf(p), inventory: "00".repeat(256), ...over })); };
  assert.equal(wl(0x0D).next.title, "Gather evidence");
  assert.equal(wl(0x0D, { inventory: inv({ 226: 1 }) }).next.title, "Present the evidence", "any one piece of evidence");
  const g = wl(0x2E);
  assert.equal(g.next.title, "Seal Wonderland's Keyhole");
  assert.ok(g.steps.slice(0, 6).every((s) => s.done), "the boss being beaten means the evidence was gathered");
});

test("every chest has a location hint, and every hint matches a real chest", async () => {
  globalThis.window = globalThis.window || {};
  await import("../companion/chesthints.js");
  const hints = globalThis.window.KH1_CHEST_HINTS;
  for (const [w, byName] of Object.entries(hints)) for (const n of Object.keys(byName)) {
    assert.ok(CHESTS.some((c) => c.w === w && c.n === n), `hint for a chest that doesn't exist: ${w} / ${n}`);
  }
  const missing = CHESTS.filter((c) => !(hints[c.w] || {})[c.n]).map((c) => `${c.w} / ${c.n}`);
  assert.deepEqual(missing, [], "chests without a hint");
});
