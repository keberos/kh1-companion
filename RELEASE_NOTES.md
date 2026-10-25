<p align="center"><img src="https://github.com/keberos/kh1-companion/raw/main/docs/banner.png" alt="KH1 Companion" width="820"></p>

**Kingdom Hearts Final Mix on the top screen. Everything you'd look up on the bottom one.**
A second-screen companion for the AYN Thor and other dual-screen Android handhelds, with the game running in GameNative.

> **Beta.** Works end to end on the AYN Thor; still being tested across a full playthrough. Your game and saves are never changed.

### What's new in beta.5

**It's now KH1 Companion, and it opens beside the game.**
- The app has its own name and icon and no longer starts the game. On Cocoon Shell, set **KH1 Companion** as Kingdom Hearts' companion app and launching the game opens both; without Cocoon, start the game and tap the icon.
- It closes the moment the game exits.
- *Updating from an earlier beta:* the app shows up under its new name. If you'd pointed a launcher at it, pick it again; nothing else to redo.

**A guide that follows the story beat by beat.**
- Every step runs on the game's own story counters (documented in the RetroAchievements code notes), across every world: about 100 objectives from the Dive to the final door.
- Next steps are short breadcrumbs ("Talk to Cid."); *Show me* has the details.
- A new objective appears only once the scene that unlocks it has finished, and while scenes play there's simply nothing to do.
- Missable things are called out: everything on Destiny Islands, Neverland's Clock Tower chests, and the last save before the final door.

**Tap any chest to see exactly where it is**, for all 232, plus what's inside and what it still needs. *Show on map* rings its room.

**Five tabs:**
- **Here** is your "what now" screen: an EXP bar (the game hides EXP in the Status menu), the next step, this room's chests, and where else to look.
- **Progress** merges Worlds and Collect, with each world's story progress, a crown on cleared worlds, and **what opens the most chests** (e.g. Glide opens 22 in 9 worlds).
- **Level** shows your next ability.

**Other changes:**
- **First time or Replay**, under the eye at the top: *Replay* shows room names, chest contents, what unlocks them and the full guide up front.
- **Growth curve:** the EXP bar shows exact numbers once your growth curve is certain (usually after your first level-up), never a guess.
- **Fixes:**
  - A new game shows up right away (the Dive's weapon choice no longer reads as the title screen).
  - Spells now count only once learned.
  - The bottom screen no longer redraws constantly, which saves GPU for the game.
- **Optional pop-up notes** for chests, level-ups, puppies and more. Off by default; turn them on under the eye.

**Performance tip:** on the AYN Thor, KH1 ran noticeably smoother for us with the top screen at **120 Hz**, the Thor on **High Performance**, and the game's **FEXCore Preset** set to **Performance** (GameNative → the game → ⚙ → Edit container → Emulation).

### What's new in beta.4

- **No spoilers from room names.** Rooms you haven't been to show as "???" on the map, in chest lists and in Collect. Tap **All names** on the map to see them anyway (handy on a second device, which hasn't seen where you've been).
- **Every map path verified.** The routes the maps only guessed at are now checked against KH1 walkthroughs: four were wrong and are fixed, the rest confirmed. Disney Castle is story scenes only, so it no longer shows paths.

### What's new in beta.3

- **Optional: start straight into the game.** Setup step 6 shows, with pictures, how to point GameNative straight at KH1 so the icon goes right into the game and quitting closes everything together, and how to switch back.
- **Why the app has the game's name**, explained in setup: launchers look up box art and details by app name.

### What's new in beta.2

- **Setup with pictures.** Each GameNative step has a *Show me how* panel with screenshots of exactly what to tap, and Copy buttons right where you need them.
- **Easier file picking.** The mod folder now holds only the two files you import; the licenses moved into a subfolder.
- **Darker setup screen** that matches GameNative.

### What it shows

| | |
|---|---|
| <img src="https://github.com/keberos/kh1-companion/raw/main/docs/screenshots/guide.png" width="400"><br>**Guide**: a nudge first, then *Where?*, then *Show me*. No spoilers unless you ask. | <img src="https://github.com/keberos/kh1-companion/raw/main/docs/screenshots/map.png" width="400"><br>**Map**: every room, where you are, chests left, and what you can't reach yet. |
| <img src="https://github.com/keberos/kh1-companion/raw/main/docs/screenshots/here.png" width="400"><br>**Here**: the next nudge, this room's chests, and where else to look. | <img src="https://github.com/keberos/kh1-companion/raw/main/docs/screenshots/level.png" width="400"><br>**Level**: what Sora learns at each level for your Dive choices. |

Plus **Progress**: every world you've found, 232 chests, 99 Dalmatians, postcards and Ansem's Reports. It reads the loaded save, so any save on any device is up to date.

### Install

You need GameNative with **KINGDOM HEARTS HD 1.5+2.5 ReMIX** (Steam) installed and launching normally. Setup takes about five minutes.

*Tested with GameNative 1.3.0 on an AYN Thor (Android 13); setup's pictures come from that version. Newer GameNative versions may move or rename menus.*

1. Download **KH1-Companion-vX.Y.Z.apk** below and open it to install.
2. Open **KH1 Companion**. The checklist walks you through, with pictures:
   1. **Show on the second screen**: tap Allow, pick KH1 Companion in the list, turn it on.
   2. **Read the game's progress**: tap Allow, turn on All files access.
   3. **Add the mod in GameNative**: the game → ⚙ → **Import Files** → pick both files in `Download/KH1Companion/mod` → Game Directory → tick *Replace existing files* → Copy. Then ⚙ → **Edit container** → **General** → turn on **Enable mod loaders** → save.
   4. **Check it**: start the game; setup says *All set* once the companion connects.
3. **Open it with the game**: on Cocoon Shell, set **KH1 Companion** as Kingdom Hearts' companion app, and launching the game from Cocoon opens both. Without Cocoon, start the game and tap the KH1 Companion icon. The companion closes by itself when the game does.

**Optional: start straight into the game.** By default GameNative opens the collection's menu first, and quitting KH1 returns you there with the companion still open. For a seamless KH1 experience: GameNative → the game → ⚙ → **Edit container** → **General** → **Executable Path** → `KINGDOM HEARTS FINAL MIX.exe` → save (setup step 6 has pictures). To undo, pick `KINGDOM HEARTS HD 1.5+2.5 Launcher.exe`.

**Updating from an earlier beta:** install over it. Your setup carries over; nothing to redo.

### Using it

- The KH1 Companion icon opens the companion; it closes by itself as soon as the game exits. The **×** on the companion and **Close** on its notification close it any time.
- **Black screen in the game?** Set its display mode to fullscreen or borderless. Windowed mode can sync from a PC through Steam Cloud and shows black under GameNative.
- **Not connecting?** Tap *Not connecting?* on the companion's waiting screen for a checklist.

### Uninstalling

Settings (long-press the icon → **Settings**, or tap **×** on the companion → **Settings**) → **Advanced → Remove everything**:

1. **Remove from the game**, then start the game once. The mod takes itself out of the game folder and never loads again. No GameNative steps.
2. Optional: delete the setting you added in GameNative (harmless to leave), and set Executable Path back to `KINGDOM HEARTS HD 1.5+2.5 Launcher.exe` if you changed it.
3. **Delete files**, then **Uninstall**.

### What's inside

The app bundles **LuaBackend Hook v1.9.1** by Sirius902 (unmodified, GPL-3.0, source: https://github.com/Sirius902/LuaBackend/tree/v1.9.1-hook), which loads the companion's read-only script into the game. Data comes from public community sources: Archipelago's KH1 world, the KH1FM randomizer docs, KH1FM-Memory-Map, MultiPresence and the Kingdom Hearts Wiki. No game assets are included.
