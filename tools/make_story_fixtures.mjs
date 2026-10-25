// Story-point fixtures for the Guide: a state.json just before and just after every step of every
// world, so tools/test_story.mjs can check each world's guide without playing the game.
//
// It starts from real saves turned into state.json by tools/kh1save.py (a save slot is the same
// memory the bridge reads), then plays the story forward through companion/guide.js in game
// order: for each step it sets what the step's own test reads (logic.js test()), then what the
// game does around it: the step's rewards (Trinities, spells, shared abilities, key items), the
// scenes that follow by themselves, and key items leaving the bag. Where a step is handed out
// later (`from`), it also writes the point in between, where the guide should say "wait".
//
// Usage:
//   python tools/kh1save.py state <GameNative saves .zip> mock/saves
//   node tools/make_story_fixtures.mjs [saves dir, default mock/saves] [--out mock/story]
// writes tools/fixtures/story-points.json (committed: the tests read it) and, with --out, every
// point as its own state.json for the page (python tools/devserver.py --state mock/story/<id>.json).
//
// The saves used (2026-10-25 backup): slot 0 Dive, final platform; slot 2 islands day one, nothing
// gathered; slot 10 the raft supplies gathered; slot 4 the supplies handed to Kairi.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
for (const f of ["data.js", "maps.js", "guide.js", "abilities.js"]) vm.runInNewContext(readFileSync(path.join(ROOT, "companion", f), "utf8"), sandbox);
const W = JSON.parse(JSON.stringify(sandbox.window));
const L = createRequire(import.meta.url)(path.join(ROOT, "companion/logic.js"))(W.KH1_CHESTS, W.KH1_REPORTS, W.KH1_MAPS, W.KH1_GUIDE, W.KH1_ROOM_NAMES, W.KH1_LEVELS);
const GUIDE = W.KH1_GUIDE;

const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const outDir = outAt >= 0 ? args.splice(outAt, 2)[1] : null;
const savesDir = path.resolve(args[0] || path.join(ROOT, "mock/saves"));
const save = (slot) => JSON.parse(readFileSync(path.join(savesDir, `save-${slot}.json`), "utf8"));

// The story fields a point changes; everything else stays as the real save had it.
const STORY = ["world", "room", "in_field", "progress", "progress_pre", "inventory", "magic", "magic_unlocked", "shared", "trinities", "world_status"];
// The committed file keeps the bag as {slot: count} and `seen` as a count into one list; expand()
// turns a point back into a full state.json.
const pick = (s) => Object.fromEntries(STORY.map((k) => [k, k === "inventory" ? sparse(s[k]) : s[k]]));
const sparse = (h) => Object.fromEntries([...Buffer.from(h, "hex")].map((n, i) => [i, n]).filter(([, n]) => n));
const base = save(2);

// Same tables as logic.js (has()): inventory slots, spell order, shared ability ids, Trinity bits.
const ITEM = {
  "Log": 192, "Cloth": 193, "Rope": 194, "Seagull Egg": 195, "Fish": 196, "Mushroom": 197, "Coconut": 198,
  "Drinking Water": 199, "Crystal Trident": 210, "Footprints": 223, "Forget-Me-Not": 227, "Jack-In-The-Box": 228,
  "Entry Pass": 229, "Slides": 217, "Claw Marks": 224, "Stench": 225, "Antenna": 226, "Theon Vol. 6": 183,
  "Emblem Piece (Flame)": 188, "Emblem Piece (Chest)": 189, "Emblem Piece (Statue)": 190, "Emblem Piece (Fountain)": 191,
};
const MAGIC = ["Fire", "Blizzard", "Thunder", "Cure", "Gravity", "Stop", "Aero"];
const SHARED = { "High Jump": 1, "Mermaid Kick": 2, "Glide": 3, "Superglide": 4 };
const TRINITY = ["Blue", "Red", "Green", "Yellow", "White"];
const STATUS_ORDER = ["Traverse Town", "Wonderland", "Olympus Coliseum", "Deep Jungle", "Agrabah", "Atlantica",
  "Halloween Town", "Neverland", "Hollow Bastion", "End of the World", "Monstro"];
const WORLD_BYTE = Object.fromEntries(Object.entries(L.WORLDS).map(([b, w]) => [w.name, +b]).reverse());
WORLD_BYTE["Hollow Bastion"] = 0x0F;
const DIVE_ROOM = [0x00, 0x01, 0x02, 0x05, 0x03];  // Dive rooms in story order (logic.js DIVE_RANK)

// Game order. Each entry plays a run of one world's steps (by title, inclusive); a step's `from`
// on another world's progress is met because that world comes earlier here.
const T = (w, first, last) => ({ w, first, last: last || first });
const TIMELINE = [
  T("Awakening", "Choose your path", "Face what waits at the end"),
  T("Destiny Islands", "Gather raft supplies", "Find Kairi"),
  T("Traverse Town", "Look around town", "Regroup with Donald and Goofy"),
  T("Wonderland", "Follow the White Rabbit", "Seal Wonderland's Keyhole"),
  T("Olympus Coliseum", "Meet the trainer", "Become a junior hero"),
  T("Deep Jungle", "Find the camp", "Seal Deep Jungle's Keyhole"),
  T("Traverse Town", "Meet Leon in the Secret Waterway", "Defeat the Opposite Armor"),
  T("Agrabah", "Help the carpet", "Seal Agrabah's Keyhole"),
  T("Monstro", "Meet Geppetto", "Defeat the Parasite Cage again"),
  T("Atlantica", "Learn to swim", "Seal Atlantica's Keyhole"),
  T("Halloween Town", "Meet the Pumpkin King", "Talk to Jack"),
  T("Neverland", "Escape the hold", "Seal Neverland's Keyhole"),
  T("Traverse Town", "Bring Cid the Navi-G Piece"),
  T("Hollow Bastion", "Climb the falls", "Get back to your friends"),
  T("Traverse Town", "Talk to Cid about the Navi-Gummi", "Let Cid install the Navi-Gummi"),
  T("Hollow Bastion", "Defeat the Behemoth", "Seal the Final Keyhole"),
  T("Neverland", "Defeat the Phantom"),
  T("End of the World", "Cross the dark dimension", "Face the final battle"),
];

// What the game does around a step, beyond its own test and rewards, keyed world#title.
//   then   story values the scenes after it reach by themselves
//   gone   key items that leave the bag when it's done (handed over, used up)
//   before items that leave the bag on the way to it (before: points already lack them)
//   on     story values reached on the way to it
//   gotHere extra things picked up along the way to it
// Items marked "worst case" aren't confirmed to leave the bag; assuming they do makes the guide
// prove itself without them.
const AROUND = {
  "Destiny Islands#Bring the supplies to Kairi": { gone: ["Log", "Cloth", "Rope"] },
  "Destiny Islands#Wrap up the second day": { gone: ["Mushroom", "Fish", "Seagull Egg", "Drinking Water", "Coconut"] },
  "Awakening#Face what waits at the end": { then: { pre: [[1, 0x56], [2, 0x01]] } },  // as the real day-one save reads
  "Destiny Islands#Wrap up the first day": { then: { pre: [[3, 0x01]] } },  // the Disney Castle scene
  "Wonderland#Present the evidence": { gone: ["Footprints", "Antenna", "Stench", "Claw Marks"] },  // worst case
  "Monstro#Climb to the stomach": { gotHere: { shared: "High Jump" } },  // the chest by Geppetto
  "Atlantica#Bring the trident to the grotto": { gone: ["Crystal Trident"] },  // Triton breaks it
  "Halloween Town#Back to the lab": { gone: ["Forget-Me-Not"] },
  "Halloween Town#Bring it to the doctor": { gone: ["Jack-In-The-Box"] },
  "Neverland#Seal Neverland's Keyhole": { then: { p: [[9, 0x6E]] } },  // Tinker Bell and Glide scenes
  "End of the World#Defeat Chernabog": { on: { p: [[11, 0x32]] } },
  "End of the World#Defeat Ansem": { on: { p: [[11, 0x5A]] } },  // through the final door, back on the islands
  // The emblem door takes the four pieces (worst case: the library book too).
  "Hollow Bastion#Climb to the chapel": { before: ["Emblem Piece (Flame)", "Emblem Piece (Chest)", "Emblem Piece (Statue)", "Emblem Piece (Fountain)", "Theon Vol. 6"] },
};

// A point as the page and logic.js see it (tools/test_story.mjs does the same): {state, seen}.
function expand(file, p) {
  const inv = new Array(256).fill(0);
  for (const [i, n] of Object.entries(p.state.inventory)) inv[i] = n;
  return { state: { ...file.base, ...p.state, inventory: Buffer.from(inv).toString("hex") }, seen: new Set(file.seenOrder.slice(0, p.seen)) };
}

const hex = (a) => Buffer.from(a).toString("hex");
const bytes = (h) => [...Buffer.from(h, "hex")];

class Story {
  constructor(s) {
    this.s = { ...s };
    for (const k of ["progress", "progress_pre", "inventory", "magic", "shared", "world_status"]) this[k] = bytes(s[k]);
  }
  state() {
    const s = { ...this.s };
    for (const k of ["progress", "progress_pre", "inventory", "magic", "shared", "world_status"]) s[k] = hex(this[k]);
    return s;
  }
  at(world, room) { this.s.world = WORLD_BYTE[world]; this.s.room = room; this.visit(world); }
  visit(world) { const i = STATUS_ORDER.indexOf(world); if (i >= 0) this.world_status[i] = Math.max(this.world_status[i], 3); }
  raise(k, i, v) { this[k][i] = Math.max(this[k][i], v); }
  give(name) {
    const t = /^(\w+) Trinity$/.exec(name);
    if (t && TRINITY.includes(t[1])) { this.s.trinities |= 1 << TRINITY.indexOf(t[1]); return; }
    const m = MAGIC.indexOf(name);
    if (m >= 0) {
      if (this.s.magic_unlocked >> m & 1) this.magic[m] = Math.min(3, this.magic[m] + 1);  // a second Fire: Fira
      this.s.magic_unlocked |= 1 << m;
      return;
    }
    if (SHARED[name]) {
      if (this.shared.some((v) => (v & 0x7F) === SHARED[name])) return;
      if (name === "Superglide") { const g = this.shared.findIndex((v) => (v & 0x7F) === SHARED.Glide); if (g >= 0) { this.shared[g] = 0x80 | SHARED.Superglide; return; } }
      this.shared[this.shared.indexOf(0)] = 0x80 | SHARED[name];
      return;
    }
    if (ITEM[name] != null) this.inventory[ITEM[name]] = Math.max(1, this.inventory[ITEM[name]]);
    // Keyblades, summons and the rest have no test that reads them.
  }
  // Whether a `from` test already holds (only the kinds `from` uses).
  holds(c) {
    if (c.p != null) return this.progress[c.p] >= c.at;
    if (c.pre) return this.progress_pre[c.pre[0]] >= c.pre[1];
    if (c.has) {
      const t = /^(\w+) Trinity$/.exec(c.has);
      if (t) return (this.s.trinities >> TRINITY.indexOf(t[1]) & 1) === 1;
      return this.inventory[ITEM[c.has]] > 0;
    }
    throw new Error(`can't judge ${JSON.stringify(c)}`);
  }
  take(name) { this.inventory[ITEM[name]] = 0; }
  // Make one guide test true, the way the game would.
  meet(c, world) {
    if (c.p != null) return this.raise("progress", c.p, c.at);
    if (c.pre) return this.raise("progress_pre", c.pre[0], c.pre[1]);
    if (c.items) { for (const [name, n] of c.items.concat(c.extra || [])) this.inventory[ITEM[name]] = Math.max(n, this.inventory[ITEM[name]]); return; }
    if (c.has) return this.give(c.has);
    if (c.all) return c.all.forEach((x) => this.meet(x, world));
    if (c.any) return this.meet(c.any[0], world);
    if (c.reach) return this.at(world, L.node(world, c.reach).rooms[0]);
    if (c.dive != null) return this.at("Awakening", DIVE_ROOM[c.dive + 1]);
    if (c.end === "dive") return this.at("Destiny Islands", 0x00);
    if (c.end === "islands") { this.raise("progress", 0, 0x05); return this.at("Traverse Town", 0x00); }
    throw new Error(`can't meet ${JSON.stringify(c)}`);
  }
}

// Where to stand for a step: its room, or the last room this world's guide named; never the
// room a `reach` step waits for, since that would finish it.
function roomFor(world, steps, k) {
  for (let i = k; i >= 0; i--) {
    const w = steps[i].where;
    if (w && w !== steps[k].reach && L.node(world, w)) return L.node(world, w).rooms[0];
  }
  return L.nodesOf(world).find((n) => n.id !== steps[k].reach && !(n.gate && n.gate.scene)).rooms[0];
}

const story = new Story(base);
// Start of a new game: the Dive's own story byte, as the real Dive save has it, nothing else yet.
story.progress_pre = bytes(save(0).progress_pre);
story.inventory = bytes(save(0).inventory);
const points = [];
const seen = [];
const point = (world, k, phase) => {
  const step = GUIDE[world][k];
  points.push({ id: `${String(points.length).padStart(3, "0")}-${world.replace(/\W+/g, "")}-${k}-${phase}`, world, step: step.title, index: k, phase,
    seen: seen.length, state: pick(story.state()) });
};

for (const { w, first, last } of TIMELINE) {
  const steps = GUIDE[w];
  const a = steps.findIndex((s) => s.title === first), b = steps.findIndex((s) => s.title === last);
  if (a < 0 || b < 0) throw new Error(`timeline names a missing step: ${w} ${first} / ${last}`);
  for (let k = a; k <= b; k++) {
    const s = steps[k], key = `${w}#${s.title}`, around = AROUND[key] || {};
    // Go to the step's room; with none named, or in the Dive (judged by the room), stay where the last
    // step left off.
    const here = L.worldName(story.s.world) === w;
    if (s.dive == null ? (s.where && s.where !== s.reach) || !here : k === a) story.at(w, roomFor(w, steps, k));
    for (const name of around.before || []) story.take(name);
    for (const [i, v] of (around.on || {}).p || []) story.raise("progress", i, v);
    if (around.gotHere && around.gotHere.shared) story.give(around.gotHere.shared);
    // Handed out by the game later (a scene, or another world): if it still isn't, make it so.
    if (s.from && !story.holds(s.from)) {
      if (!points.some((p) => p.world === w && p.index === k && p.phase === "waiting")) point(w, k, "waiting");
      story.meet(s.from, w);
      story.at(w, roomFor(w, steps, k));
    }
    point(w, k, "before");
    if (s.end === "never") continue;  // the last fight: nothing in the save says it's over
    story.meet(s, w);
    for (const r of s.rewards || []) story.give(r);
    for (const name of around.gone || []) story.take(name);
    for (const [i, v] of (around.then || {}).p || []) story.raise("progress", i, v);
    for (const [i, v] of (around.then || {}).pre || []) story.raise("progress_pre", i, v);
    // Stay where the step finished, unless finishing it moved the player (reach, the Dive, leaving).
    if (!(s.reach || s.dive != null || s.end) && s.where) story.at(w, roomFor(w, steps, k));
    point(w, k, "after");
    for (let i = 0; i <= k; i++) if (!seen.includes(`${w}#${steps[i].title}`) && !steps[i].optional) seen.push(`${w}#${steps[i].title}`);
    if (s.optional) seen.push(key);
    // The next step waits on something the game hasn't done yet: the point in between.
    const nx = steps[k + 1];
    if (nx && nx.from && !story.holds(nx.from)) point(w, k + 1, "waiting");
  }
}

// Every step of every world must have its points.
for (const [w, steps] of Object.entries(GUIDE)) for (const s of steps) {
  if (!points.some((p) => p.world === w && p.step === s.title && p.phase === "before")) throw new Error(`no fixture for ${w}: ${s.title}`);
}

// The real saves, as anchors for the points they match.
const real = [
  { slot: 0, world: "Awakening", step: "Face what waits at the end", phase: "before" },
  { slot: 2, world: "Destiny Islands", step: "Gather raft supplies", phase: "before" },
  { slot: 10, world: "Destiny Islands", step: "Gather raft supplies", phase: "after" },
  { slot: 4, world: "Destiny Islands", step: "Bring the supplies to Kairi", phase: "after" },
].map((r) => ({ ...r, state: pick(save(r.slot)) }));

const out = { note: "Generated by tools/make_story_fixtures.mjs from real saves; don't edit by hand.",
  base: { ...base, ...Object.fromEntries(STORY.map((k) => [k, undefined])) }, seenOrder: seen, real, points };
mkdirSync(path.join(ROOT, "tools/fixtures"), { recursive: true });
writeFileSync(path.join(ROOT, "tools/fixtures/story-points.json"), JSON.stringify(out, null, 0).replace(/\},\{"id"/g, "},\n{\"id\""));
if (outDir) {
  mkdirSync(outDir, { recursive: true });
  for (const p of points) writeFileSync(path.join(outDir, `${p.id}.json`), JSON.stringify(expand(out, p).state));
}
console.log(`${points.length} points across ${Object.keys(GUIDE).length} worlds${outDir ? `, states in ${outDir}` : ""}`);
