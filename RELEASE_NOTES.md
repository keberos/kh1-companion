## KH1 Companion for the AYN Thor

A second-screen companion for **KINGDOM HEARTS Final Mix** (KINGDOM HEARTS HD 1.5+2.5 ReMIX on Steam) played through **GameNative** on a dual-screen Android device such as the AYN Thor. The game stays on the top screen; the bottom screen shows your chests, a spoiler-free guide, room maps that know what you can't reach yet, and what Sora learns at each level. Everything is read live from your save, so it works on any save, on any device.

### Install

You need GameNative with KINGDOM HEARTS HD 1.5+2.5 ReMIX installed and launching normally.

1. Download **KH1-Companion-vX.Y.Z.apk** below and open it to install.
2. Open **Kingdom Hearts Final Mix** (the companion's app icon). A setup checklist opens:
   1. **Show on the second screen**: tap Allow, turn the switch on, go back.
   2. **Read the game's progress**: tap Allow, turn "All files access" on, go back.
   3. **Add the companion to the game**: tap Install. GameNative opens for a few seconds, runs a small installer inside the game's container, and closes. If it asks whether to save the settings, choose **Discard**.
   4. **Play**.
3. From then on, tap the **Kingdom Hearts Final Mix** icon to play: the companion opens on the bottom screen with the game, and closes when you quit.

The app name matches the game, so launchers like Cocoon Shell can find art and metadata for it. If your launcher doesn't list it, add it as an app there.

### Using it

- Tap the icon while the companion is open to close it; long-press it for **Companion only**, **Close companion** and **Settings**.
- Nothing shows until a save is loaded. If it keeps saying "Waiting for Kingdom Hearts…", tap **Not connecting?** for a checklist and what the app can see.
- **Black screen in the game?** Set the game's display mode to fullscreen or borderless. Windowed mode can sync from a PC through Steam Cloud and shows black under GameNative.

### Updating

Install the new APK over the old one. The app refreshes its game script by itself; you don't need to repeat setup.

### Uninstalling

Open the app's Settings (long-press the icon → **Settings**, or tap **×** on the companion → **Settings**), then **Advanced → Remove everything** and tap the three buttons in order:

1. **Remove the mod from the game**: GameNative opens for a few seconds and takes the mod back out (choose **Discard** if it asks to save settings).
2. **Delete the companion's files**: clears the app's folder in Download.
3. **Uninstall this app**.

Your game and saves are untouched throughout. Reinstalling the game in GameNative also removes the mod.

### What's inside

The app bundles **LuaBackend Hook v1.9.1** by Sirius902 (unmodified, GPL-3.0, source: https://github.com/Sirius902/LuaBackend/tree/v1.9.1-hook), which loads the companion's read-only script into the game. The script only reads memory; it never changes your game or save. The installer copies LuaBackend into the game folder and adds a DLL override for the game's executable in the container's registry. Uninstalling (above) removes both.

Data comes from public community sources: Archipelago's KH1 world, the KH1FM randomizer docs, KH1FM-Memory-Map, MultiPresence and the Kingdom Hearts Wiki. No game assets are included.
