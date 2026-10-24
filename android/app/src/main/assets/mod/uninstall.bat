@echo off
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
