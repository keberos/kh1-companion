"""Build the GameNative mod zip that installs LuaBackend for the companion bridge.

The zip holds two files for the game's root folder:
  DINPUT8.dll       LuaBackend hook (the release's DBGHELP.dll, renamed), from Sirius902/LuaBackend.
                    It proxies both dbghelp and dinput8; under Wine it must go in as dinput8,
                    because Wine's imagehlp forwards to dbghelp, and a global dbghelp=n,b
                    hands those forwards to the proxy, which lacks them, and the game aborts
                    ("unimplemented function dbghelp.dll.ImageNtHeader").
  LuaBackend.toml   loads KH1 scripts from D:/KH1Companion/scripts/, which GameNative
                    maps to Android's Download/KH1Companion/scripts/, so the bridge script
                    can be updated over adb without reinstalling the mod

Copy both files into the game folder (GameNative 1.3: game -> Import Files -> Game Directory)
and set WINEDLLOVERRIDES=dinput8=n,b;dbghelp=b in the container's environment variables.

Usage:  python tools/build_gamenative_mod.py      (needs the gh CLI)
"""
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "kh1-companion-gamenative.zip"
LUABACKEND_REPO = "Sirius902/LuaBackend"
LUABACKEND_TAG = "v1.9.1-hook"

TOML = """\
# LuaBackend config for KINGDOM HEARTS HD 1.5+2.5 (Steam) under GameNative.
# KH1 scripts load from D:, which GameNative maps to Android's Download folder.
[kh1]
scripts = [{ path = "D:/KH1Companion/scripts/", relative = false }]
exe = "KINGDOM HEARTS FINAL MIX.exe"
game_docs = "My Games/KINGDOM HEARTS HD 1.5+2.5 ReMIX"

[kh2]
scripts = [{ path = "scripts/kh2/", relative = true }]
exe = "KINGDOM HEARTS II FINAL MIX.exe"
game_docs = "My Games/KINGDOM HEARTS HD 1.5+2.5 ReMIX"

[bbs]
scripts = [{ path = "scripts/bbs/", relative = true }]
exe = "KINGDOM HEARTS Birth by Sleep FINAL MIX.exe"
game_docs = "My Games/KINGDOM HEARTS HD 1.5+2.5 ReMIX"

[recom]
scripts = [{ path = "scripts/recom/", relative = true }]
exe = "KINGDOM HEARTS Re_Chain of Memories.exe"
game_docs = "My Games/KINGDOM HEARTS HD 1.5+2.5 ReMIX"
"""


def main():
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["gh", "release", "download", LUABACKEND_TAG, "-R", LUABACKEND_REPO,
                        "-p", "DBGHELP.zip", "-D", tmp, "--clobber"], check=True)
        with zipfile.ZipFile(Path(tmp) / "DBGHELP.zip") as z:
            dll = z.read("DBGHELP.dll")
    OUT.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("DINPUT8.dll", dll)
        z.writestr("LuaBackend.toml", TOML)
    print(f"{OUT} ({OUT.stat().st_size} bytes): DINPUT8.dll from {LUABACKEND_REPO} {LUABACKEND_TAG}, LuaBackend.toml")


if __name__ == "__main__":
    sys.exit(main())
