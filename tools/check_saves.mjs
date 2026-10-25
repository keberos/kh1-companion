// Check real saves against the Guide: where each save is, which story steps its counters confirm,
// and any counter value the reference doesn't know. Spoiler-safe: it names only steps already done,
// and gives the next step as its nudge.
//
// Usage:
//   node tools/check_saves.mjs <GameNative saves .zip | KHFM_WW.png | state.json | dir of them> [--confirm]
// A .zip or .png is read with tools/kh1save.py (needs python). A step is confirmed when a save's
// counter sits exactly on the step's value: that value happens on PC. With --confirm, those steps go
// into companion/guide-checked.js, so the page stops marking them unconfirmed. Look over the output
// first: the nudge it gives for each save should be what you were doing when you saved.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECKED_JS = path.join(ROOT, "companion/guide-checked.js");

// Counter values the reference lists, from docs/guide-reference.md "Story values used":
// {"p0": Set of values, "pre[2]": ...}. Each world's line names its counters in backticks, then
// "A event · B/C event ...".
export function knownValues(md = readFileSync(path.join(ROOT, "docs/guide-reference.md"), "utf8")) {
  const section = md.split("## Story values used")[1].split("\n## ")[0];
  const known = {};
  for (const para of section.split(/\n\s*\n/)) {
    const parts = para.replace(/\n/g, " ").split(/`((?:p\d+)|(?:pre\[\d\]))`/);
    for (let i = 1; i < parts.length; i += 2) {
      const set = known[parts[i]] || (known[parts[i]] = new Set());
      for (const m of parts[i + 1].matchAll(/(?:^|[:·.;)]\s*)\s*((?:[0-9A-F]{2})(?:\/[0-9A-F]{2})*)(?=\s)/g)) {
        for (const v of m[1].split("/")) set.add(parseInt(v, 16));
      }
    }
  }
  return known;
}

function load() {
  const sandbox = { window: {} };
  for (const f of ["data.js", "maps.js", "guide.js", "guide-checked.js", "abilities.js"]) vm.runInNewContext(readFileSync(path.join(ROOT, "companion", f), "utf8"), sandbox);
  const W = JSON.parse(JSON.stringify(sandbox.window));
  const L = createRequire(import.meta.url)(path.join(ROOT, "companion/logic.js"))(W.KH1_CHESTS, W.KH1_REPORTS, W.KH1_MAPS, W.KH1_GUIDE, W.KH1_ROOM_NAMES, W.KH1_LEVELS, W.KH1_GUIDE_CHECKED);
  return { L, GUIDE: W.KH1_GUIDE, CHECKED: W.KH1_GUIDE_CHECKED || {} };
}

// state.json files for the input: converted with kh1save.py, or read as they are.
function states(input) {
  let files;
  if (/\.(zip|png)$/i.test(input)) {
    const dir = mkdtempSync(path.join(os.tmpdir(), "kh1saves-"));
    execFileSync("python", [path.join(ROOT, "tools/kh1save.py"), "state", input, dir], { stdio: "ignore" });
    files = readdirSync(dir).map((f) => path.join(dir, f));
  } else if (statSync(input).isDirectory()) {
    files = readdirSync(input).filter((f) => f.endsWith(".json")).map((f) => path.join(input, f));
  } else files = [input];
  return files.map((f) => ({ name: path.basename(f, ".json"), state: JSON.parse(readFileSync(f, "utf8")) }))
    .sort((a, b) => (a.state.t || 0) - (b.state.t || 0));
}

const counter = (state, key) => {
  const m = /^p(\d+)$/.exec(key), n = /^pre\[(\d)\]$/.exec(key);
  const bytes = Buffer.from((m ? state.progress : state.progress_pre) || "", "hex");
  const i = +(m ? m[1] : n[1]);
  return i < bytes.length ? bytes[i] : null;
};
const stepCounter = (s) => (s.p != null ? [`p${s.p}`, s.at] : s.pre ? [`pre[${s.pre[0]}]`, s.pre[1]] : null);
const hex = (v) => v.toString(16).toUpperCase().padStart(2, "0");
const day = (t) => new Date(t * 1000).toISOString().slice(0, 10);

// One save: where it is, what it confirms, what's new. Returns the step keys it confirms.
export function checkSave(L, GUIDE, known, state) {
  const lines = [], confirms = [];
  const world = L.onTitle(state) ? null : L.worldName(state.world);
  lines.push(`at ${world || "the title"}${L.roomName(state) ? `, ${L.roomName(state)}` : ""}`);
  for (const [key, values] of Object.entries(known)) {
    const v = counter(state, key);
    if (v && !values.has(v)) lines.push(`new value: ${key} = ${hex(v)} (not in docs/guide-reference.md; worth adding)`);
  }
  for (const [w, steps] of Object.entries(GUIDE)) for (const s of steps) {
    const c = stepCounter(s);
    if (c && counter(state, c[0]) === c[1]) confirms.push({ key: `${w}#${s.title}`, why: `${c[0]} = ${hex(c[1])}` });
  }
  for (const c of confirms) lines.push(`confirms: ${c.key.replace("#", ": ")} (${c.why})`);
  if (world && GUIDE[world]) {
    const g = L.guideFor(world, state);
    lines.push(g.next ? `guide's next step: "${g.next.nudge}"${g.next.checked ? "" : " (unconfirmed)"}` : g.waiting ? "guide: nothing to do right now" : "guide: story complete here");
  }
  return { lines, confirms: confirms.map((c) => c.key) };
}

// Rewrite companion/guide-checked.js with the new keys added, in guide order.
function writeChecked(GUIDE, checked) {
  const src = readFileSync(CHECKED_JS, "utf8");
  const head = src.slice(0, src.indexOf("window.KH1_GUIDE_CHECKED"));
  const order = Object.entries(GUIDE).flatMap(([w, steps]) => steps.map((s) => `${w}#${s.title}`));
  const body = order.filter((k) => checked[k]).map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(checked[k])},`).join("\n");
  writeFileSync(CHECKED_JS, `${head}window.KH1_GUIDE_CHECKED = {\n${body}\n};\n`);
}

function main(argv) {
  const confirm = argv.includes("--confirm");
  const input = argv.find((a) => !a.startsWith("--"));
  if (!input) { console.log("usage: node tools/check_saves.mjs <saves .zip | KHFM_WW.png | state.json | dir> [--confirm]"); return 2; }
  const { L, GUIDE, CHECKED } = load();
  const known = knownValues();
  const checked = { ...CHECKED };
  let added = 0;
  for (const { name, state } of states(input)) {
    const { lines, confirms } = checkSave(L, GUIDE, known, state);
    console.log(`${name}${state.t ? ` (${day(state.t)})` : ""}`);
    for (const l of lines) console.log(`  ${l}`);
    for (const k of confirms) if (!checked[k]) { checked[k] = `save, ${state.t ? day(state.t) : "date unknown"}`; added++; }
  }
  const fresh = Object.keys(checked).length - Object.keys(CHECKED).length;
  if (confirm && added) writeChecked(GUIDE, checked);
  console.log(fresh ? `${fresh} step(s) newly confirmed${confirm ? ", written to companion/guide-checked.js" : "; run again with --confirm to record them"}` : "no new steps confirmed");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = main(process.argv.slice(2));
