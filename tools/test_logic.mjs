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
// JSON round-trip so arrays come from this realm (deepStrictEqual checks prototypes).
const { KH1_CHESTS: CHESTS, KH1_REPORTS: REPORTS, KH1_MAPS: MAPS } = JSON.parse(JSON.stringify(sandbox.window));
const L = createRequire(import.meta.url)(path.join(ROOT, "companion/logic.js"))(CHESTS, REPORTS, MAPS);

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
      assert.ok(kind === undefined || kind === "approx", `${w}: unknown edge kind ${kind}`);
    }
    if (m.nodes.length > 1) {
      const linked = new Set(m.edges.flat());
      for (const id of ids) assert.ok(linked.has(id), `${w}: ${id} has no exits`);
    }
  }
});

test("chests with no room in the data still land in the right room", () => {
  const find = (w, prefix) => L.nodeForChest(CHESTS.find((c) => c.w === w && c.n.startsWith(prefix))).id;
  assert.equal(find("Atlantica", "Ariel's Grotto"), "Ariel's Grotto");
  assert.equal(find("Hollow Bastion", "Library 1st Floor"), "Library");
  assert.equal(find("Awakening", "Chest"), "Dive to the Heart");
});

test("room bytes confirmed by community scripts resolve to the right room", () => {
  const at = (world, room) => L.nodeForRoom(blank({ world, room }), {})?.id;
  assert.equal(at(3, 0x0B), "Item Workshop");
  assert.equal(at(3, 0x16), "Secret Waterway");
  assert.equal(at(15, 0x04), "Entrance Hall");
  assert.equal(at(0, 0x02), "Dive to the Heart");
  assert.equal(at(0, 0x00), undefined, "title screen is nowhere");
});

test("a room picked on the device overrides the map data", () => {
  const s = blank({ world: 3, room: 0x0B });
  assert.equal(L.nodeForRoom(s, { "3:11": "Accessory Shop" }).id, "Accessory Shop");
  assert.equal(L.nodeForRoom(blank({ world: 3, room: 0x30 }), {}), null, "unknown room byte");
});

test("all 33 puppy chests are known and placed", () => {
  const s = L.summarize(blank());
  assert.equal(s.puppyChests.length, 33);
  assert.ok(s.puppyChests.every((c) => c.node && !c.got));
});

test("a blank save counts nothing", () => {
  const s = L.summarize(blank());
  assert.equal(s.world, "Traverse Town");
  assert.equal(s.worldVerified, true);
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

test("unknown and unverified worlds are reported as such", () => {
  assert.equal(L.summarize(blank({ world: 0x0E })).world, null);
  const w = L.summarize(blank({ world: 0x05 }));
  assert.equal(w.world, "Wonderland");
  assert.equal(w.worldVerified, false);
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
