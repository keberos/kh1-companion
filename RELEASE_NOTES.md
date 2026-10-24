<p align="center"><img src="https://github.com/keberos/kh1-companion/raw/main/docs/banner.png" alt="KH1 Companion" width="820"></p>

**Kingdom Hearts Final Mix on the top screen. Everything you'd look up on the bottom one.**
A second-screen companion for the AYN Thor and other dual-screen Android handhelds, with the game running in GameNative.

> **Beta.** Works end to end on the AYN Thor; still being tested across a full playthrough. Your game and saves are never changed.

### What's new in beta.2

- **Setup with pictures.** Each GameNative step has a *Show me how* panel with screenshots of exactly what to tap, and Copy buttons right where you need them.
- **Easier file picking.** The mod folder now holds only the two files you import; the licenses moved into a subfolder.
- **Darker setup screen** that matches GameNative.

### What it shows

| | |
|---|---|
| <img src="https://github.com/keberos/kh1-companion/raw/main/docs/screenshots/guide.png" width="400"><br>**Guide**: a nudge first, then *Where?*, then *Show me*. No spoilers unless you ask. | <img src="https://github.com/keberos/kh1-companion/raw/main/docs/screenshots/map.png" width="400"><br>**Map**: every room, where you are, chests left, and what you can't reach yet. |
| <img src="https://github.com/keberos/kh1-companion/raw/main/docs/screenshots/here.png" width="400"><br>**Here**: chests left in this world, your room first. | <img src="https://github.com/keberos/kh1-companion/raw/main/docs/screenshots/level.png" width="400"><br>**Level**: what Sora learns at each level for your Dive choices. |

Plus **Worlds** (progress everywhere you've been) and **Collect** (232 chests, 99 Dalmatians, postcards, Ansem's Reports). It reads the loaded save, so any save on any device is up to date.

### Install

You need GameNative with **KINGDOM HEARTS HD 1.5+2.5 ReMIX** (Steam) installed and launching normally. Setup takes about five minutes.

1. Download **KH1-Companion-vX.Y.Z.apk** below and open it to install.
2. Open **Kingdom Hearts Final Mix** (the companion's app). The checklist walks you through, with pictures:
   1. **Show on the second screen**: tap Allow, pick Kingdom Hearts Final Mix in the list, turn it on.
   2. **Read the game's progress**: tap Allow, turn on All files access.
   3. **Copy the mod into the game**: GameNative → the game → ⚙ → **Import Files** → pick both files in `Download/KH1Companion/mod` → Game Directory → tick *Replace existing files* → Copy.
   4. **Turn the mod on**: ⚙ → **Edit container** → **Environment** → **+** → paste the name and value the app copies for you → Ok → save.
   5. **Check it**: start the game; setup says *All set* once the companion connects.
3. From then on, tap the **Kingdom Hearts Final Mix** icon to play. The companion opens with the game and closes when you quit.

**Updating from beta.1:** install over it. Your setup carries over; nothing to redo.

### Using it

- Tap the icon to play; tap it again to close the companion. The **×** on the companion and **Close** on its notification work too.
- Long-press the icon for **Companion only**, **Close companion** and **Settings**.
- **Black screen in the game?** Set its display mode to fullscreen or borderless. Windowed mode can sync from a PC through Steam Cloud and shows black under GameNative.
- **Not connecting?** Tap *Not connecting?* on the companion's waiting screen for a checklist.

### Uninstalling

Settings (long-press the icon → **Settings**, or tap **×** on the companion → **Settings**) → **Advanced → Remove everything**:

1. **Remove from the game**, then start the game once. The mod takes itself out of the game folder and never loads again. No GameNative steps.
2. Optional: delete the setting you added in GameNative (harmless to leave).
3. **Delete files**, then **Uninstall**.

### What's inside

The app bundles **LuaBackend Hook v1.9.1** by Sirius902 (unmodified, GPL-3.0, source: https://github.com/Sirius902/LuaBackend/tree/v1.9.1-hook), which loads the companion's read-only script into the game. Data comes from public community sources: Archipelago's KH1 world, the KH1FM randomizer docs, KH1FM-Memory-Map, MultiPresence and the Kingdom Hearts Wiki. No game assets are included.
