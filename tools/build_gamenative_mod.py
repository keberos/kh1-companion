r"""Build the mod files that load the companion bridge into KH1 under GameNative.

Writes them to android/app/src/main/assets/mod/; the app copies them to the device's
Download/KH1Companion/mod/, and setup walks the user through GameNative's Import Files
(both files → Game Directory) and the container setting WINEDLLOVERRIDES=dinput8=n,b;dbghelp=b.
(GameNative 1.3 ignores executable overrides in launch intents, so an installer can't be run
for the user; and the game folder is GameNative's private storage.)

  DINPUT8.dll       LuaBackend hook (the release's DBGHELP.dll, renamed), from Sirius902/LuaBackend
                    (GPL-3.0; unmodified, license and source link shipped next to it). Under Wine it
                    must load as dinput8: Wine's imagehlp forwards to dbghelp, so a dbghelp=n,b
                    override hands those forwards to the proxy, which lacks them, and the game
                    aborts ("unimplemented function dbghelp.dll.ImageNtHeader").
  LuaBackend.toml   loads KH1 scripts from D:/KH1Companion/scripts/ (GameNative maps D: to
                    Android's Download folder), where the app keeps the bridge script current.

Removal needs no GameNative steps: the bridge script renames its own DLL when the app leaves
mod/uninstall.flag (see lua/kh1companion.lua).

Also writes dist/kh1-companion-gamenative.zip for installing by hand.

Usage:  python tools/build_gamenative_mod.py      (needs the gh CLI)
"""
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "kh1-companion-gamenative.zip"
ASSETS = ROOT / "android" / "app" / "src" / "main" / "assets" / "mod"
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


NOTICE = f"""DINPUT8.dll is LuaBackend Hook {LUABACKEND_TAG} by Sirius902 (DBGHELP.dll from the release,
renamed, otherwise unmodified), licensed under the GNU General Public License v3.0 (see
LuaBackend-LICENSE.txt). Source code: https://github.com/{LUABACKEND_REPO}/tree/{LUABACKEND_TAG}
"""


def main():
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["gh", "release", "download", LUABACKEND_TAG, "-R", LUABACKEND_REPO,
                        "-p", "DBGHELP.zip", "-D", tmp, "--clobber"], check=True)
        with zipfile.ZipFile(Path(tmp) / "DBGHELP.zip") as z:
            dll = z.read("DBGHELP.dll")
        license_text = subprocess.run(
            ["gh", "api", f"repos/{LUABACKEND_REPO}/contents/LICENSE?ref={LUABACKEND_TAG}",
             "-H", "Accept: application/vnd.github.raw"],
            check=True, capture_output=True, text=True, encoding="utf-8").stdout
    ASSETS.mkdir(parents=True, exist_ok=True)
    (ASSETS / "DINPUT8.dll").write_bytes(dll)
    (ASSETS / "LuaBackend.toml").write_text(TOML, encoding="utf-8", newline="\n")
    (ASSETS / "LuaBackend-LICENSE.txt").write_text(license_text, encoding="utf-8")
    (ASSETS / "NOTICE.txt").write_text(NOTICE, encoding="utf-8")
    OUT.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("DINPUT8.dll", dll)
        z.writestr("LuaBackend.toml", TOML)
        z.writestr("LuaBackend-LICENSE.txt", license_text)
        z.writestr("NOTICE.txt", NOTICE)
    print(f"{ASSETS} and {OUT}: DINPUT8.dll from {LUABACKEND_REPO} {LUABACKEND_TAG}, LuaBackend.toml")


if __name__ == "__main__":
    sys.exit(main())
