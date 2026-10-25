r"""Drive GameNative and KH1 on the AYN Thor over adb, one named step per command.

Tap positions are for GameNative 1.3.0 on the Thor's 1920x1080 top screen (display 0), checked
by hand on 2026-10-25. uiautomator can't read this device, and the gear menu scrolls by a
different amount each time, so menu items are found by matching small pictures of their labels
(tools/thor-labels/) rather than tapped at fixed spots. Nothing here deletes files. Each step prints one line; `shot` saves a small screenshot only when needed.

  python tools/thor.py game-page          GameNative on top, KH's page open
  python tools/thor.py export-saves NAME  KH's saves → Download/NAME.zip (via Export saves)
  python tools/thor.py import-saves NAME  Download/NAME.zip → KH (via Import saves)
  python tools/thor.py exit-game          Quick Menu → exit; waits for Wine to stop
  python tools/thor.py shot FILE [scale]  top-screen screenshot (default scale 0.5)
  python tools/thor.py state              the bridge's latest state.json, one line
  python tools/thor.py watch [minutes]    log story, room, scene and item changes while someone plays

Env: THOR_ADB (adb path), THOR_SERIAL (device serial).
"""
import io
import os
from pathlib import Path
import subprocess
import sys
import time

ADB = os.environ.get("THOR_ADB", r"C:\Users\lasco\dev-tools\android-sdk\platform-tools\adb.exe")
SERIAL = os.environ.get("THOR_SERIAL", "adb-c8abaadd-OSPW0X._adb-tls-connect._tcp")
TOP = "4630946441858561667"
GAMENATIVE = "app.gamenative/.MainActivityAliasDefault"
DOWNLOAD = "/sdcard/Download"
LABELS = Path(__file__).resolve().parent / "thor-labels"


def adb(*args, check=True):
    r = subprocess.run([ADB, "-s", SERIAL, *args], capture_output=True)
    if check and r.returncode:
        raise SystemExit(f"adb {' '.join(args)}: {r.stderr.decode(errors='replace').strip()}")
    return r.stdout


def sh(cmd):
    return adb("shell", cmd, check=False).decode(errors="replace").strip()


def tap(x, y, wait=1.0):
    sh(f"input -d 0 tap {x} {y}")
    time.sleep(wait)


def swipe_up(n=1):
    for _ in range(n):
        sh("input -d 0 swipe 1500 950 1500 300 300")
    time.sleep(0.8)


def screen():
    from PIL import Image
    return Image.open(io.BytesIO(adb("exec-out", "screencap", "-p", "-d", TOP))).convert("RGB")


def pixel(x, y):
    return screen().getpixel((x, y))


def on_game_page():
    r, g, b = pixel(100, 536)  # the green Play button, left of its icon
    return g > 140 and r < 140 and b < 140


def game_page():
    sh(f"am start --display 0 -n {GAMENATIVE}")
    time.sleep(3)
    if not on_game_page():
        tap(720, 300, 3)  # KH's tile, first in the library
    if not on_game_page():
        raise SystemExit("couldn't open KH's page in GameNative")
    print("ok: KH's page is open")


def find_label(name, im=None, x=1250):
    """Centre y of a gear-menu label on screen, or None."""
    from PIL import Image, ImageChops, ImageStat
    t = Image.open(LABELS / f"{name}.png").convert("L")
    im = (im or screen()).convert("L")
    w, h = t.size
    score, y = min((ImageStat.Stat(ImageChops.difference(im.crop((x, y, x + w, y + h)), t)).mean[0], y)
                   for y in range(0, 1080 - h, 2))
    return y + h // 2 if score < 8 else None


def menu_tap(label):
    """Open KH's gear menu and tap one of its items, scrolling until it shows."""
    tap(1650, 536, 2)  # the gear on KH's page
    for _ in range(8):
        y = find_label(label)
        if y:
            tap(1372, y, 3)
            return
        swipe_up(1)
    raise SystemExit(f"'{label}' not found in the gear menu")


def newest_zip():
    return sh(f"ls -t {DOWNLOAD}/*.zip | head -1")


def export_saves(name):
    game_page()
    before = newest_zip()
    menu_tap("export-saves")  # → Android's save dialog in Downloads, name prefilled
    tap(1786, 1024, 5)        # SAVE
    made = newest_zip()
    if made == before:
        raise SystemExit("export didn't produce a new file")
    target = f"{DOWNLOAD}/{name}.zip"
    if sh(f"ls '{target}' 2>/dev/null"):
        raise SystemExit(f"{target} exists; pick another name (left the export as {made})")
    sh(f"mv '{made}' '{target}'")
    print(sh(f"ls -l '{target}'"))


def import_saves(name):
    game_page()
    menu_tap("import-saves")  # → Android's file picker
    print("picker open: pick", name)


def exit_game():
    sh("input -d 0 keyevent BACK")
    time.sleep(2)
    tap(102, 986, 1)  # Quick Menu's exit icon, bottom left
    for _ in range(20):
        if sh("ps -A -o ARGS | grep -c [w]ineserver") == "0":
            print("ok: game closed")
            return
        time.sleep(2)
    raise SystemExit("game still running after 40 s")


def shot(path, scale=0.5):
    im = screen()
    im.resize((int(im.width * scale), int(im.height * scale))).save(path)
    print(path)


def state():
    print(sh("cat /sdcard/Download/KH1Companion/state.json"))


def snap(count="4"):
    """Snapshot memory on each bottom-screen tap: rewrites dump.flag (lua: dump_on_flag) to s1, s2..."""
    flag = "/sdcard/Download/KH1Companion/dump.flag"
    p = subprocess.Popen([ADB, "-s", SERIAL, "shell", "getevent -l /dev/input/event5"], stdout=subprocess.PIPE, text=True)
    n = 0
    sh(f"echo idle > {flag}")
    print("tap the bottom screen to take each snapshot", flush=True)
    for line in p.stdout:
        if "BTN_TOUCH" in line and "DOWN" in line:
            n += 1
            sh(f"echo s{n} > {flag}")
            print(time.strftime("%H:%M:%S"), f"snapshot s{n}", flush=True)
            if n >= int(count):
                break
    p.kill()


def watch(minutes="120"):
    """Log story-relevant changes while someone plays: one line per change, to confirm guide values."""
    import json
    keys = ("world", "room", "in_field", "at_save", "progress_pre", "progress", "world_status", "trinities", "magic_unlocked", "shared")
    last, last_inv = {}, None
    end = time.time() + float(minutes) * 60
    while time.time() < end:
        try:
            s = json.loads(sh("cat /sdcard/Download/KH1Companion/state.json"))
        except ValueError:
            time.sleep(1)
            continue
        changes = [f"{k}={s.get(k)}" for k in keys if s.get(k) != last.get(k)]
        inv = bytes.fromhex(s.get("inventory", ""))
        if last_inv is not None:
            changes += [f"item{i}:{last_inv[i]}->{inv[i]}" for i in range(len(inv)) if inv[i] != last_inv[i]]
        if changes and last:
            print(time.strftime("%H:%M:%S"), " ".join(changes), flush=True)
        elif not last:
            print(time.strftime("%H:%M:%S"), "start", " ".join(f"{k}={s.get(k)}" for k in keys), flush=True)
        last, last_inv = s, inv
        time.sleep(1)


def main(argv):
    cmds = {"game-page": game_page, "export-saves": export_saves, "import-saves": import_saves, "watch": watch, "snap": snap,
            "exit-game": exit_game, "shot": shot, "state": state}
    if len(argv) < 2 or argv[1] not in cmds:
        print(__doc__)
        return 2
    args = argv[2:]
    if argv[1] == "shot" and len(args) > 1:
        args[1] = float(args[1])
    cmds[argv[1]](*args)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
