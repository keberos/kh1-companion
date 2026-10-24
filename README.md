# KH1 Second-Screen Companion

A bottom-screen companion for **KINGDOM HEARTS Final Mix** (HD 1.5+2.5 ReMIX, Steam or Epic, 1.0.0.10), aimed at the AYN Thor running the game through GameNative.

The game stays on the top screen and is never patched. A LuaBackend script reads game memory and writes a small JSON snapshot about 4 times a second. The companion page reads that snapshot and shows six tabs:

- **Here:** chest progress for the current world and its unopened chests. The room you're in is pinned to the top, and each chest shows its vanilla contents (toggle with "Contents"). Chests you can't reach yet sink to the bottom marked "Later"; "Needs" names what's missing (Glide, a Trinity, Fira…).
- **Guide:** spoiler-free by default. The next step shows only a vague nudge (no boss or reward names); **Where?** adds the room and marks it on the map; **Show me** names the event and gives the full hint. Future steps stay "???" and rewards appear once you've earned them. Also what's left in your room and world, and this world's Ansem's Reports (boss names masked). Covers Dive to the Heart and Destiny Islands too: the raft and food errands count your items live.
- **Map:** a room graph of the world: where you are, unopened chests per room, puppy chests, save points. Rooms you can't get into yet (story or ability) are dimmed with a padlock; counts read "4 + 1 later" when some chests need something you don't have. Tap a room for its chest list. Exits the sources only imply are drawn dashed.
- **Worlds:** chest progress for every world; open one for its list or its map.
- **Collect:** total chests (232), Dalmatians (out of 99) plus where the 33 puppy chests are, postcards, and the 13 Ansem's Reports with where each comes from.
- **Level:** what Sora gets at each level for your build: abilities on your Dive path (Warrior / Guardian / Mystic) and the stat ups, plus EXP to the next level on your growth curve (Dawn / Midday / Dusk). The path comes straight from the save (what you kept at the Dive). The curve has no known save byte, so it's worked out from your EXP and remembered once it's clear; you only pick it if EXP is still ambiguous. Tap any level for what each reward does and what the other paths get there.

The current room is detected from the game's room byte, and every named room in every world is on a map. The header shows the game's own name for the exact room (e.g. "Seaside Shack", "Piano Room").

**No spoilers for worlds you haven't found.** The save's world-status array says which worlds are hidden, on the Gummi map, or visited. Unfound worlds show only as "???" (with a count), worlds on the map show their name and nothing else, and puppy chests and reports in unvisited worlds stay vague.

**Nothing shows until a save is loaded.** On the title screen the game's memory is empty or left over from the last save, so every tab just says to load a save.

**Progress comes from the save, not a ledger.** Everything is read live from game memory: whatever save is loaded, on whichever machine. Playing on several PCs, or syncing through Steam Cloud, just works.

```
KH1 (top screen)  ──LuaBackend──▶  kh1companion.lua  ──▶  state.json  ──▶  companion page (bottom screen)
                                  reads memory only        ~4 Hz, atomic write
```

## Layout

| Path | What |
|---|---|
| `lua/kh1companion.lua` | Game bridge. Read-only; detects Steam vs Epic; writes `state.json`. |
| `companion/` | The bottom-screen page. `logic.js` is the decoding (shared with tests), `maps.js` the hand-authored world maps, `data.js` is generated. Plain HTML, no build step. |
| `companion/theme.css`, `art/`, `fonts/` | KH1-menu look: deep-blue panels with silver frames, light-blue selection, gold Cinzel titles, HP/MP-style gauges. Original SVG art only (no game assets); fonts are Cinzel and Barlow Semi Condensed under the SIL OFL, bundled so the Android app works offline. |
| `android/` | Android wrapper: shows the page as a non-focusable overlay on the second display. |
| `dev/preview.html` | Two-screen Thor preview with a live change log (served at `/dev/` by the dev server). |
| `tools/devserver.py` | Serves the page plus live, recorded or replayed state. |
| `tools/gen_data.py` | Regenerates `companion/data.js` from `tools/sources/`. |
| `tools/test_logic.mjs` | Node tests for the decoding and maps, plus every recording in `recordings/fixtures/`. |
| `tools/test_bridge.py` | Runs the Lua bridge against fake memory (needs `pip install lupa`). |
| `tools/emulator_test.py` | Boots the two-display emulator and checks the wrapper end to end. |
| `tools/mock_state.py` | Writes a fake, changing `mock/state.json` for UI work without the game. |
| `tools/make_scenarios.py` | Writes fixed sample saves to `dev/scenarios/` (Destiny Islands day 1, mid-game Hollow Bastion). Open `/?state=/dev/scenarios/<name>.json`. |
| `tools/ap_rules.py` | Reads Archipelago's KH1 logic and lists what each chest needs (used by `gen_data.py`). |

## Where the data comes from

All public, no game files needed:

- **Memory addresses:** the KH1FM Archipelago client ([gaithern/KH-1FM-AP-LUA](https://github.com/gaithern/KH-1FM-AP-LUA)) and [KH1FM-RANDOMIZER](https://github.com/gaithern/KH1FM-RANDOMIZER).
- **Chest and report names:** [Archipelago](https://github.com/ArchipelagoMW/Archipelago) `worlds/kh1/Locations.py` (MIT). Chest location ID = `2650000 + byte*10 + bit`, so a raw flag bit maps straight to a named chest.
- **Chest rooms and contents:** the KH1FM randomizer's documentation (MIT): 217 of 232 chests have a room; the rest are matched by name prefix.
- **Room and world names by byte:** [Dekirai/MultiPresence](https://github.com/Dekirai/MultiPresence) `Models/KH1/Rooms.cs` and `Worlds.cs` (MIT), covering every room byte in every world.
- **Story milestones:** the KH1FM Archipelago client's per-world story-progress thresholds (credited to RetroAchievements' code notes). The nudges and hints are written for this project. Destiny Islands errands use the inventory slots the Archipelago client writes raft items to.
- **What a chest needs:** Archipelago `worlds/kh1/Rules.py` (MIT), read at its Beginner difficulty with randomizer options off. Anything it can't express (combat checks, world counts) counts as met, so a chest is never wrongly shown as locked.
- **Level-ups:** the randomizer's battle-table docs (MIT): ability per level for each Dive path, the shared stat table, and the three EXP curves. Ability descriptions are written for this project.
- **Magic, shared abilities, Trinities, EXP:** the Archipelago client (`write_trinities`, `write_shared_ability`, `write_sora_ability`) and Denhonator's KHPCSpeedrunTools (`magicLevels`).
- **Room IDs (older, partial):** room byte = the room's `.ard` map file number − 1, read from the randomizer docs. The rule checks out against three IDs confirmed by community scripts and against Dive to the Heart in game.
- **Map layout and exits:** the [Kingdom Hearts Wiki](https://www.khwiki.com/) "Settings and Areas" section of each world (KH1 part).

The vendored copies and their commits are in `tools/sources/`.

## Dev environment (all on the PC)

```bash
python tools/devserver.py --record
```

- Open http://localhost:8737/dev/ for the two-screen preview. Its top half is a change log that names every chest flag as it flips.
- `--record` saves real changes to `recordings/`. Load one from the preview to replay it with play/pause/seek/speed controls.
- `--lan` makes the server reachable from the Thor. Set the wrapper's dev URL to it and page edits show up on the real bottom screen with no rebuild.
- Without the game: `python tools/mock_state.py`, then `python tools/devserver.py --state mock/state.json`.

Tests:

```bash
node --test tools/test_logic.mjs
```

The portable toolchain (JDK 17, Android SDK, Gradle, Node) lives in `C:\Users\lasco\dev-tools`. To build the APK:

```bash
cd android && JAVA_HOME=C:/Users/lasco/dev-tools/jdk17 ANDROID_HOME=C:/Users/lasco/dev-tools/android-sdk ./gradlew assembleDebug
```

### PC game setup (done 2026-10-23)

- LuaBackend v1.9.1 (`DBGHELP.dll` + `LuaBackend.toml`) is in the Steam KH folder. Its KH1 script path points straight at this repo's `lua/` folder, so script edits apply in game after pressing **F1**. **F2** opens the LuaBackend console.
- To uninstall, delete `DBGHELP.dll` from the game folder.

## On the Thor (GameNative)

GameNative maps the Wine drive `D:` to Android's `Download/`. Under Wine the bridge detects that (Linux's `/proc` shows up as `Z:\proc`) and writes `D:\KH1Companion\state.json`, which is the file the companion app reads by default.

1. `python tools/build_gamenative_mod.py` builds `dist/kh1-companion-gamenative.zip`: LuaBackend's DLL renamed to `DINPUT8.dll`, and a `LuaBackend.toml` that loads KH1 scripts from `D:/KH1Companion/scripts/`.
2. Copy the zip and the script to the Thor:
   ```bash
   adb push dist/kh1-companion-gamenative.zip /sdcard/Download/
   adb push lua/kh1companion.lua /sdcard/Download/KH1Companion/scripts/
   ```
3. In GameNative 1.3: KH 1.5+2.5 → ⚙ → **Import Files** → pick both files → destination **Game Directory** → Copy.
4. ⚙ → Edit container → Environment: add `WINEDLLOVERRIDES` = `dinput8=n,b;dbghelp=b`.
   - **Don't load it as `dbghelp`.** Wine's imagehlp forwards its functions to dbghelp, so a global `dbghelp=n,b` sends those calls to LuaBackend's stand-in, which lacks them, and the game aborts (`unimplemented function dbghelp.dll.ImageNtHeader`).
   - As `dinput8` it works, because KH1 imports `DirectInput8Create`, and LuaBackend exits quietly in every other program.
   - Optional: set the container's executable to `KINGDOM HEARTS FINAL MIX.exe` to skip the collection menu.
   - **If the screen is black:** the collection's display settings (`config1525.dat`, in My Games) sync through Steam Cloud. Windowed mode chosen on a PC carries over, and it renders black on the Thor; set fullscreen or borderless.
5. Install the companion APK. The first launch opens its settings: allow "draw over other apps" and "all files access".
6. Script updates are just another `adb push` to `KH1Companion/scripts/`, then a restart of the game. The mod doesn't need reinstalling.

**Opening and closing:** the app is named **Kingdom Hearts Final Mix**, since its icon starts the game; launchers match that name for box art and metadata. Tap the icon and it opens the companion and starts KH in GameNative (its `app.gamenative.LAUNCH_GAME` intent, Steam app id 2552430, changeable in Settings). Quit the game and the companion closes too: when a game was started that way, GameNative finishes its screen on exit and hands back, so nothing has to watch for it. If the game is already running (the bridge's file is fresh), the tap just opens the companion. Tap the icon while the companion is open to close it; the × in its header and the notification's **Close** work too. Long-press the icon for **Companion only**, **Close companion** and **Settings**. Settings opens on the top screen. If Cocoon Shell, Odin or Argosy doesn't list it, add "Kingdom Hearts Final Mix" as an app in that launcher.

From adb: `am start -n com.kh1companion/.MainActivity --ez start true`.

## Status

| Piece | State |
|---|---|
| Lua bridge | Runs on the Steam build: edition, world/room, level/stats and chest flags confirmed in Dive to the Heart. |
| Companion page | Done: Here / Guide / Map / Worlds / Collect / Level, tested at bottom-screen size against mock saves, sample scenarios and real recordings. |
| World maps | All 14 worlds authored from the wiki. Dashed exits are the wiki's implications, not confirmed. |
| Android wrapper | Passes `tools/emulator_test.py` on a two-display emulator (2026-10-23): overlay fills the 1240×1080 second display, reads the pushed state file, taps and swipes work, and focus stays on the app on the main screen throughout. Runs on the Thor (2026-10-24) with live data from KH1 in GameNative: LuaBackend as `DINPUT8.dll` → bridge → `D:\KH1Companion\state.json` → bottom-screen overlay, top screen keeps focus. |

**Unverified:**
- The Dive choice byte (`0x2DE97EC`, from KH1FM-Memory-Map's Steam 1.0.0.9 table; its neighbours match 1.0.0.10) and the five bytes after it, sent to look for the growth-curve byte.
- The bridge's newer reads (EXP, learned abilities, inventory, magic, shared abilities, Trinities, and the Dive/Destiny Islands story byte `progress_pre`) come from public scripts but haven't been checked against a live save yet. Everything that uses them stays quiet (nothing locked, path and curve left to pick) when a value is missing.
- Destiny Islands can't yet tell the second day from the night; `progress_pre[1]` is sent so a recording can calibrate it.
- World IDs beyond those confirmed (0, 1, 3, 9, 0x0B, 0x0D, 0x0F, 0x10). The others follow the game's world order; the header says "world id unverified" there.
- Room IDs come from map file numbers. The rule holds for the four checked rooms but is unchecked elsewhere, and many rooms have no ID yet (use "Which room is this?").
- The Dalmatian count assumes one save-flag bit per puppy.
- The Thor's real screen density; the preview lets you compare 2.0 / 2.5 / 3.0.
- Agrabah's map has six columns, so its labels are small at the likely density.

## Roadmap

- Calibrate Destiny Islands and Dive steps from `progress_pre` once there's a recording.
- More room gates (Traverse Town's later areas, End of the World) once their story points are pinned down.
- Trinity marks (flag offsets are in the randomizer's `globals.lua`).
- Synthesis helper.
