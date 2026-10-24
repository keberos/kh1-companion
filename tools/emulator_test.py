"""End-to-end check of the Android wrapper on the Thor-like emulator (two displays).

Boots the `thor-sim` AVD, installs the debug APK, grants its permissions over adb,
feeds it frames from a recording, then checks that:
  1. the overlay shows up on the secondary display (screenshot saved to emulator-out/)
  2. tapping the overlay does NOT move input focus off the app on the main display
     (the whole point of FLAG_NOT_FOCUSABLE: the controller must keep driving the game)

Needs Windows Hypervisor Platform (or the Android Emulator hypervisor driver) enabled.
Usage:  python tools/emulator_test.py [--keep]     (--keep leaves the emulator running)
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = Path(os.environ.get("KH1_DEV_TOOLS", r"C:\Users\lasco\dev-tools"))
SDK = TOOLS / "android-sdk"
ADB = str(SDK / "platform-tools" / "adb.exe")
EMULATOR = str(SDK / "emulator" / "emulator.exe")
APK = ROOT / "android" / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk"
OUT = ROOT / "emulator-out"
PKG = "com.kh1companion"
# Stands in for the game on the main display. Not Settings: it sets
# HIDE_NON_SYSTEM_OVERLAY_WINDOWS, which hides every third-party overlay while it's focused.
GAME_STANDIN = "com.google.android.deskclock/com.android.deskclock.DeskClock"
EMU_DISPLAY = "1"  # emulator-console index of the added display (Android gives it its own id)
STATE_DIR = "/sdcard/Download/KH1Companion"


def adb(*args, check=True, capture=True):
    r = subprocess.run([ADB, *args], capture_output=capture, text=True)
    if check and r.returncode != 0:
        raise RuntimeError(f"adb {' '.join(args)} failed: {r.stderr.strip()}")
    return r.stdout


def wait_for_boot(timeout=300):
    adb("wait-for-device")
    end = time.time() + timeout
    while time.time() < end:
        if adb("shell", "getprop", "sys.boot_completed", check=False).strip() == "1":
            return
        time.sleep(3)
    raise TimeoutError("emulator did not finish booting")


def displays():
    out = adb("shell", "dumpsys", "display")
    return sorted({int(m) for m in re.findall(r"mDisplayId=(\d+)", out)})


def focused_window():
    out = adb("shell", "dumpsys", "window", "displays")
    m = re.search(r"mCurrentFocus=Window\{[^}]*\s(\S+)\}", out)
    return m.group(1) if m else None


def screenshot(name):
    """Capture the bottom screen via the emulator console (screencap can't see virtual displays)."""
    before = set(OUT.glob("Screenshot_*.png"))
    adb("emu", "screenrecord", "screenshot", str(OUT), "--display", EMU_DISPLAY)
    for _ in range(20):
        new = set(OUT.glob("Screenshot_*.png")) - before
        if new:
            dest = OUT / name
            dest.unlink(missing_ok=True)
            new.pop().rename(dest)
            return str(dest)
        time.sleep(0.25)
    raise RuntimeError("emulator screenshot did not appear")


def push_state(frame):
    tmp = OUT / "state.json"
    tmp.write_text(json.dumps(frame))
    adb("push", str(tmp), f"{STATE_DIR}/state.json")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--keep", action="store_true")
    args = ap.parse_args()
    OUT.mkdir(exist_ok=True)
    env = dict(os.environ, ANDROID_SDK_ROOT=str(SDK), ANDROID_AVD_HOME=str(TOOLS / "avd"))

    running = "emulator-" in adb("devices", check=False)
    emu = None if running else subprocess.Popen(
        [EMULATOR, "-avd", "thor-sim", "-no-snapshot", "-no-boot-anim", "-gpu", "swiftshader_indirect"],
        env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    results = {}
    try:
        wait_for_boot()
        # The AVD's hw.display1.* settings aren't applied by this image; add the
        # Thor-sized bottom screen through the emulator console instead.
        if len(displays()) < 2:
            adb("emu", "multidisplay", "add", EMU_DISPLAY, "1240", "1080", "320", "0")
            time.sleep(5)
        ids = displays()
        results["displays"] = ids
        assert len(ids) >= 2, f"expected a second display, got {ids}"

        adb("install", "-r", str(APK))
        adb("shell", "appops", "set", PKG, "SYSTEM_ALERT_WINDOW", "allow")
        adb("shell", "appops", "set", PKG, "MANAGE_EXTERNAL_STORAGE", "allow")
        adb("shell", "mkdir", "-p", STATE_DIR)

        frames = [json.loads(l)["state"] for l in
                  (ROOT / "recordings/fixtures/mock-walkthrough.jsonl").read_text().splitlines() if l.strip()]
        push_state(frames[0])

        adb("shell", "am", "start", "-W", "-n", f"{PKG}/.MainActivity", "--ez", "start", "true")
        time.sleep(4)
        # Something focusable on the main display stands in for the game.
        adb("shell", "am", "start", "-W", "-n", GAME_STANDIN)
        time.sleep(2)
        before = focused_window()
        results["focus_before"] = before
        for f in frames[1:8]:
            push_state(f)
            time.sleep(0.5)

        second = ids[1]
        results["screenshot_before_tap"] = screenshot("bottom-before-tap.png")

        # Touch the companion the way a player would and check focus after each touch.
        # Coordinates are in display pixels (1240x1080); the tab bar sits along the bottom.
        touches = [
            ("tap list", ["tap", "620", "600"]),
            ("tap Map tab", ["tap", "465", "1050"]),
            ("swipe", ["swipe", "620", "800", "620", "300", "200"]),
            ("tap bottom-right corner", ["tap", "1235", "1075"]),
        ]
        focus_after = {}
        for name, cmd in touches:
            adb("shell", "input", "-d", str(second), *cmd)
            time.sleep(0.8)
            focus_after[name] = focused_window()
        results["focus_after"] = focus_after
        results["focus_kept"] = bool(before) and all(f == before for f in focus_after.values())

        results["screenshot_after_tap"] = screenshot("bottom-after-tap.png")
        log = adb("logcat", "-d", "-s", "KH1Companion:*", check=False)
        results["service_log"] = log.strip().splitlines()[-5:]
    finally:
        print(json.dumps(results, indent=2))
        if not args.keep:
            adb("emu", "kill", check=False)
            if emu:
                emu.wait(timeout=60)
    sys.exit(0 if results.get("focus_kept") else 1)


if __name__ == "__main__":
    main()
