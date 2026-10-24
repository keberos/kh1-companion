@echo off
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
