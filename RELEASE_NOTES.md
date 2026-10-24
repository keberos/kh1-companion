## KH1 Companion for the AYN Thor

A second-screen companion for **KINGDOM HEARTS Final Mix** (KINGDOM HEARTS HD 1.5+2.5 ReMIX on Steam) played through **GameNative** on a dual-screen Android device such as the AYN Thor. The game stays on the top screen; the bottom screen shows your chests, a spoiler-free guide, room maps that know what you can't reach yet, and what Sora learns at each level. Everything is read live from your save, so it works on any save, on any device.

### Install

You need GameNative with KINGDOM HEARTS HD 1.5+2.5 ReMIX installed and launching normally.

1. Download **KH1-Companion-vX.Y.Z.apk** below and open it to install.
2. Open **Kingdom Hearts Final Mix** (the companion's app icon). A setup checklist opens and walks you through:
   1. **Show on the second screen**: tap Allow, pick Kingdom Hearts Final Mix in the list, turn it on, go back.
   2. **Read the game's progress**: tap Allow, turn on All files access, go back.
   3. **Copy the mod into the game**: in GameNative open KINGDOM HEARTS HD 1.5+2.5 ReMIX → ⚙ → **Import Files**, pick both files in `Download/KH1Companion/mod` (the app put them there), choose **Game Directory**, Copy.
   4. **Turn the mod on**: ⚙ → **Edit container** → Environment variables → add `WINEDLLOVERRIDES` = `dinput8=n,b;dbghelp=b` (setup has Copy buttons for both).
   5. **Check it**: tap Start the game. When the title screen shows, the companion connects and setup says All set.
3. From then on, tap the **Kingdom Hearts Final Mix** icon to play: the companion opens on the bottom screen with the game, and closes when you quit.

The app name matches the game, so launchers like Cocoon Shell can find art and metadata for it. If your launcher doesn't list it, add it as an app there.

### Using it

- Tap the icon while the companion is open to close it; long-press it for **Companion only**, **Close companion** and **Settings**.
- Nothing shows until a save is loaded. If it keeps saying "Waiting for Kingdom Hearts…", tap **Not connecting?** for a checklist and what the app can see.
- **Black screen in the game?** Set the game's display mode to fullscreen or borderless. Windowed mode can sync from a PC through Steam Cloud and shows black under GameNative.

### Updating

Install the new APK over the old one. The app refreshes its game script by itself; you don't need to repeat setup.

### Uninstalling

Open the app's Settings (long-press the icon → **Settings**, or tap **×** on the companion → **Settings**), then **Advanced → Remove everything**:

1. **Remove from the game**, then **Start the game once**. The mod takes itself out of the game folder as the game starts and never loads again. No GameNative steps.
2. Optional: in GameNative, delete the `WINEDLLOVERRIDES` variable you added (harmless to leave).
3. **Delete files**: clears the app's folder in Download.
4. **Uninstall** the app.

Your game and saves are untouched throughout. Reinstalling the game in GameNative also removes the mod.

### What's inside

The app bundles **LuaBackend Hook v1.9.1** by Sirius902 (unmodified, GPL-3.0, source: https://github.com/Sirius902/LuaBackend/tree/v1.9.1-hook), which loads the companion's read-only script into the game. The script only reads memory; it never changes your game or save. Setup has you import LuaBackend into the game folder and turn it on with a DLL override; uninstalling (above) takes it back out.

Data comes from public community sources: Archipelago's KH1 world, the KH1FM randomizer docs, KH1FM-Memory-Map, MultiPresence and the Kingdom Hearts Wiki. No game assets are included.
