r"""Build the GameNative mod files that load the companion bridge into KH1.

Writes them to android/app/src/main/assets/mod/, where the app ships them and copies them to
Download/KH1Companion/mod/ on the device. The app's setup then has GameNative run install.bat
once inside the game's container (via GameNative's LAUNCH_GAME intent, overriding the
executable for that one launch), which copies the DLL and config into the game folder and sets
the DLL override in the container's registry. No manual GameNative steps.

  DINPUT8.dll       LuaBackend hook (the release's DBGHELP.dll, renamed), from Sirius902/LuaBackend
                    (GPL-3.0; unmodified, license and source link shipped next to it). Under Wine it
                    must load as dinput8: Wine's imagehlp forwards to dbghelp, so a dbghelp=n,b
                    override hands those forwards to the proxy, which lacks them, and the game
                    aborts ("unimplemented function dbghelp.dll.ImageNtHeader").
  LuaBackend.toml   loads KH1 scripts from D:/KH1Companion/scripts/ (GameNative maps D: to
                    Android's Download folder), where the app keeps the bridge script current.
  install.bat       finds the game folder, copies the two files in, sets
                    AppDefaults\KINGDOM HEARTS FINAL MIX.exe\DllOverrides (dinput8 native,builtin;
                    dbghelp builtin), and writes install.log for the app to read.

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


# Runs inside the game's Wine container. Windows line endings; Wine's cmd is picky.
INSTALL_BAT = r"""@echo off
setlocal
set "SRC=D:\KH1Companion\mod"
set "LOG=D:\KH1Companion\mod\install.log"
set "EXE=KINGDOM HEARTS FINAL MIX.exe"
set "GAME="
for %%d in (A B C E F G H I J K L M N O P Q R S T U V W X Y) do (
  if not defined GAME if exist "%%d:\%EXE%" set "GAME=%%d:"
)
if not defined GAME if exist "C:\Program Files (x86)\Steam\steamapps\common\KINGDOM HEARTS -HD 1.5+2.5 ReMIX-\%EXE%" set "GAME=C:\Program Files (x86)\Steam\steamapps\common\KINGDOM HEARTS -HD 1.5+2.5 ReMIX-"
if not defined GAME (
  echo FAIL could not find %EXE% on any drive> "%LOG%"
  exit /b 1
)
copy /y "%SRC%\DINPUT8.dll" "%GAME%\DINPUT8.dll" >nul
if errorlevel 1 (
  echo FAIL could not copy DINPUT8.dll into %GAME%> "%LOG%"
  exit /b 1
)
copy /y "%SRC%\LuaBackend.toml" "%GAME%\LuaBackend.toml" >nul
if errorlevel 1 (
  echo FAIL could not copy LuaBackend.toml into %GAME%> "%LOG%"
  exit /b 1
)
reg add "HKCU\Software\Wine\AppDefaults\%EXE%\DllOverrides" /v dinput8 /t REG_SZ /d native,builtin /f >nul
reg add "HKCU\Software\Wine\AppDefaults\%EXE%\DllOverrides" /v dbghelp /t REG_SZ /d builtin /f >nul
echo OK %GAME%> "%LOG%"
exit /b 0
"""

# Undoes install.bat: removes the two files from the game folder and the registry override.
UNINSTALL_BAT = r"""@echo off
setlocal
set "LOG=D:\KH1Companion\mod\uninstall.log"
set "EXE=KINGDOM HEARTS FINAL MIX.exe"
set "GAME="
for %%d in (A B C E F G H I J K L M N O P Q R S T U V W X Y) do (
  if not defined GAME if exist "%%d:\%EXE%" set "GAME=%%d:"
)
if not defined GAME if exist "C:\Program Files (x86)\Steam\steamapps\common\KINGDOM HEARTS -HD 1.5+2.5 ReMIX-\%EXE%" set "GAME=C:\Program Files (x86)\Steam\steamapps\common\KINGDOM HEARTS -HD 1.5+2.5 ReMIX-"
if defined GAME (
  if exist "%GAME%\DINPUT8.dll" del /f /q "%GAME%\DINPUT8.dll"
  if exist "%GAME%\LuaBackend.toml" del /f /q "%GAME%\LuaBackend.toml"
)
reg delete "HKCU\Software\Wine\AppDefaults\%EXE%\DllOverrides" /v dinput8 /f >nul 2>&1
reg delete "HKCU\Software\Wine\AppDefaults\%EXE%\DllOverrides" /v dbghelp /f >nul 2>&1
if defined GAME if exist "%GAME%\DINPUT8.dll" (
  echo FAIL could not delete DINPUT8.dll from %GAME%> "%LOG%"
  exit /b 1
)
echo OK %GAME%> "%LOG%"
exit /b 0
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
    bat = INSTALL_BAT.replace("\r\n", "\n").replace("\n", "\r\n").encode("ascii")
    unbat = UNINSTALL_BAT.replace("\r\n", "\n").replace("\n", "\r\n").encode("ascii")
    ASSETS.mkdir(parents=True, exist_ok=True)
    (ASSETS / "DINPUT8.dll").write_bytes(dll)
    (ASSETS / "LuaBackend.toml").write_text(TOML, encoding="utf-8", newline="\n")
    (ASSETS / "install.bat").write_bytes(bat)
    (ASSETS / "uninstall.bat").write_bytes(unbat)
    (ASSETS / "LuaBackend-LICENSE.txt").write_text(license_text, encoding="utf-8")
    (ASSETS / "NOTICE.txt").write_text(NOTICE, encoding="utf-8")
    OUT.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("DINPUT8.dll", dll)
        z.writestr("LuaBackend.toml", TOML)
        z.writestr("install.bat", bat)
        z.writestr("uninstall.bat", unbat)
        z.writestr("LuaBackend-LICENSE.txt", license_text)
        z.writestr("NOTICE.txt", NOTICE)
    print(f"{ASSETS} and {OUT}: DINPUT8.dll from {LUABACKEND_REPO} {LUABACKEND_TAG}, LuaBackend.toml, install.bat")


if __name__ == "__main__":
    sys.exit(main())
