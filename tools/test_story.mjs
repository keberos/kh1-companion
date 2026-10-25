// Story-point tests for the Guide: every step of every world, just before and just after it's
// done, from tools/fixtures/story-points.json (made by tools/make_story_fixtures.mjs from real saves).
// Run:  node --test tools/test_story.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
for (const f of ["data.js", "maps.js", "guide.js", "guide-checked.js", "abilities.js"]) vm.runInNewContext(readFileSync(path.join(ROOT, "companion", f), "utf8"), sandbox);
const W = JSON.parse(JSON.stringify(sandbox.window));
const L = createRequire(import.meta.url)(path.join(ROOT, "companion/logic.js"))(W.KH1_CHESTS, W.KH1_REPORTS, W.KH1_MAPS, W.KH1_GUIDE, W.KH1_ROOM_NAMES, W.KH1_LEVELS, W.KH1_GUIDE_CHECKED);
const GUIDE = W.KH1_GUIDE;
const FILE = JSON.parse(readFileSync(path.join(ROOT, "tools/fixtures/story-points.json"), "utf8"));

// Same as make_story_fixtures.mjs expand(): the bag back to hex, `seen` back to a set of step keys.
const expand = (p) => {
  const inv = new Array(256).fill(0);
  for (const [i, n] of Object.entries(p.state.inventory)) inv[i] = n;
  return { state: { ...FILE.base, ...p.state, inventory: Buffer.from(inv).toString("hex") }, seen: new Set(FILE.seenOrder.slice(0, p.seen)) };
};
const POINTS = FILE.points.map((p) => ({ ...p, ...expand(p) }));
const label = (p) => `${p.id} (${p.world}: ${p.phase} "${p.step}")`;
const indexOf = (world, title) => GUIDE[world].findIndex((s) => s.title === title);
// How far the guide has a world: the first step not done, optional ones aside.
const reached = (world, g) => { const i = g.steps.findIndex((s) => s.done !== true && !s.optional); return i < 0 ? g.steps.length : i; };

// Fresh device, no memory of finished steps: a save from after these steps, loaded on a new device,
// can show them again, because nothing in the save proves them. Live play remembers them (seen).
const FRESH_GAPS = {
  // reach: waking in the Green Room. Traverse Town's counter has no known value before the Guard Armor.
  "Traverse Town": ["Look around town"],
  // The emblem door takes the four pieces (worst case: the library book too), and nothing marks the
  // door open until the chapel (0x50), so a save in between shows the library again.
  "Hollow Bastion": ["Solve the library"],
};

test("every step of every world has its story points", () => {
  for (const [w, steps] of Object.entries(GUIDE)) for (const s of steps) {
    const of = (phase) => POINTS.some((p) => p.world === w && p.step === s.title && p.phase === phase);
    assert.ok(of("before"), `${w}: no point before "${s.title}"`);
    if (s.end !== "never") assert.ok(of("after"), `${w}: no point after "${s.title}"`);
  }
  for (const [w, steps] of Object.entries(GUIDE)) for (const s of steps) if (s.from) {
    // Every `from` that isn't met the moment the step before it is done gets a point in between.
    const k = indexOf(w, s.title), prev = POINTS.find((p) => p.world === w && p.phase === "after" && p.index === k - 1);
    if (prev && L.guideFor(w, prev.state, prev.seen).waiting) {
      assert.ok(POINTS.some((p) => p.world === w && p.step === s.title && p.phase === "waiting"), `${w}: no point waiting for "${s.title}"`);
    }
  }
});

test("just before a step, it's the next one; just after, the guide moves on", () => {
  for (const p of POINTS) {
    const g = L.guideFor(p.world, p.state, p.seen);
    if (p.phase === "before") {
      assert.ok(!g.waiting, `${label(p)}: waiting instead`);
      assert.equal(g.next && g.next.title, p.step, `${label(p)}: next is "${g.next && g.next.title}"`);
    } else if (p.phase === "waiting") {
      assert.equal(g.waiting, true, `${label(p)}: should wait for the game to hand it out, shows "${g.next && g.next.title}"`);
      assert.equal(g.next, null);
    } else {
      assert.equal(g.steps[p.index].done, true, `${label(p)}: not done`);
      if (g.next) assert.ok(indexOf(p.world, g.next.title) > p.index, `${label(p)}: next is still "${g.next.title}"`);
    }
  }
});

// Every point in the story, read for every world: the guide never goes back to an earlier step.
function noFallBack(useSeen) {
  const best = {}, gaps = new Set();
  for (const p of POINTS) for (const w of Object.keys(GUIDE)) {
    const g = L.guideFor(w, p.state, useSeen ? p.seen : undefined);
    const at = reached(w, g), was = best[w];
    if (was && at < was.at) {
      const gap = !useSeen && (FRESH_GAPS[w] || []).includes(GUIDE[w][at].title);
      if (gap) gaps.add(`${w}#${GUIDE[w][at].title}`);
      else assert.fail(`${w}: ${label(p)} goes back to "${GUIDE[w][at].title}", after ${label(was.p)} had reached "${(GUIDE[w][was.at] || { title: "the end" }).title}"`);
      continue;
    }
    if (!was || at > was.at) best[w] = { at, p };
  }
  // The list of gaps stays exact: a step that no longer falls back comes off it.
  if (!useSeen) assert.deepEqual([...gaps].sort(), Object.entries(FRESH_GAPS).flatMap(([w, l]) => l.map((t) => `${w}#${t}`)).sort());
}
test("with the steps this device saw done, no later save falls back to an earlier step", () => noFallBack(true));
test("on a fresh device, no later save falls back either, except steps nothing in the save proves", () => noFallBack(false));

test("remembered steps stay done once their evidence leaves the bag", () => {
  // The raft supplies: handed over (byte 04) the bag is empty, and both the story byte and the memory say gathered.
  const handed = POINTS.find((p) => p.world === "Destiny Islands" && p.step === "Wrap up the first day" && p.phase === "before");
  assert.equal(L.guideFor("Destiny Islands", handed.state).steps[0].done, true);
  assert.equal(L.guideFor("Destiny Islands", handed.state, handed.seen).steps[0].done, true);
  // The emblem pieces: used at the door, remembered on a device that saw them.
  const chapel = POINTS.find((p) => p.world === "Hollow Bastion" && p.step === "Climb to the chapel" && p.phase === "before");
  assert.equal(L.guideFor("Hollow Bastion", chapel.state, chapel.seen).next.title, "Climb to the chapel");
});

test("real saves match the story points they were taken at", () => {
  for (const r of FILE.real) {
    const p = POINTS.find((x) => x.world === r.world && x.step === r.step && x.phase === r.phase);
    const inv = new Array(256).fill(0);
    for (const [i, n] of Object.entries(r.state.inventory)) inv[i] = n;
    const state = { ...FILE.base, ...r.state, inventory: Buffer.from(inv).toString("hex") };
    const a = L.guideFor(r.world, state), b = L.guideFor(p.world, p.state);
    assert.equal(a.next && a.next.title, b.next && b.next.title, `save slot ${r.slot} vs ${label(p)}`);
    assert.equal(r.state.progress_pre.slice(4, 6), p.state.progress_pre.slice(4, 6), `slot ${r.slot}: islands story byte`);
  }
});
