-----------------------------------------------
-- KH1 Second-Screen Companion: game bridge
-- LuaBackend script for KINGDOM HEARTS Final Mix
-- (HD 1.5+2.5 ReMIX, Steam or Epic, 1.0.0.10).
--
-- Read-only: this script never writes game memory.
-- Writes a small JSON snapshot ~4x/second for the
-- bottom-screen companion app to read.
-----------------------------------------------

LUAGUI_NAME = "kh1companion"
LUAGUI_AUTH = "kh1-companion"
LUAGUI_DESC = "Writes KH1 state to a JSON file for a second-screen companion app"

-- Where the snapshot goes. Leave nil for automatic:
--   * env var KH1C_OUTPUT_DIR, if set
--   * under Wine (GameNative/Winlator): D:\KH1Companion\ -- GameNative maps D: to
--     Android's Download folder, where the companion app looks by default
--   * otherwise %LOCALAPPDATA%\KH1Companion\
OUTPUT_DIR = nil

local POLL_FRAMES      = 15   -- ~4 Hz at 60 fps
local HEARTBEAT_SECS   = 2    -- rewrite at least this often (wall clock) so the app can tell we're alive;
                               -- frame-based timing stretched past the app's stale limit under emulation

-- Address pairs are {EGS, Steam} for 1.0.0.10, taken from the KH1FM
-- Archipelago client (gaithern/KH-1FM-AP-LUA) and KH1FM-RANDOMIZER.
local ADDR = {
    world          = {0x2340E5C, 0x233FE84},
    room           = {0x2340E5C + 0x68, 0x233FE84 + 0x8},
    sora_level     = {0x2DE9D98, 0x2DE9398},
    sora_stats     = {0x2DE9D66, 0x2DE9366},  -- +0 max HP, +2 max MP, +3 AP
    chests_opened  = {0x2DEA32C, 0x2DE992C},  -- 509 bytes of bit flags
    reports        = {0x2DEB720, 0x2DEAD20},  -- 2 bytes of bit flags
    puppies        = {0x2DEB463, 0x2DEAA63},  -- 99 bits, MSB first
    postcards      = {0x2DEBA1F, 0x2DEB01F},  -- count mailed
    olympus_cups   = {0x2DEBB60, 0x2DEB160},  -- 4 bytes
    world_progress = {0x2DEB264, 0x2DEA864},  -- one story byte per world (+0xE: Traverse Town's second byte)
    progress_pre   = {0x2DEB260, 0x2DEA860},  -- the 4 story bytes before it; +1 is Dive/Destiny Islands
                                              -- (KHPCSpeedrunTools rando reads it as cutsceneFlags - 3)
    sora_exp       = {0x2DE9DA0, 0x2DE93A0},  -- 4-byte total EXP (Sora's stat block +0x3C)
    sora_abilities = {0x2DE9DA4, 0x2DE93A4},  -- 48 ability slots, id | 0x80 when equipped
    inventory      = {0x2DEA1F9, 0x2DE97F9},  -- item counts by item id (AP: inventory + id)
    dive_choice    = {0x2DEA1EC, 0x2DE97EC},  -- +0: what Sora kept at the Dive, 0 Sword 1 Shield 2 Rod
                                              -- (HydroSulphide/KH1FM-Memory-Map "Start choice"); +1..+5 sent
                                              -- unlabelled, to find the growth curve byte
    magic          = {0x2DEA1F2, 0x2DE97F2},  -- 7 spell levels: Fire Blizzard Thunder Cure Gravity Stop Aero
    magic_unlocked = {0x2DE9DD4, 0x2DE93D4},  -- bit per spell, same order; the levels read 1 even for locked spells
                                              -- (KH-1FM-AP-LUA write_magic: levels are this + 0x41E)
                                              -- (KHPCSpeedrunTools magicLevels)
    shared         = {0x2DEA2F9, 0x2DE98F9},  -- 8 shared-ability slots: 1 High Jump, 2 Mermaid Kick, 3 Glide, 4 Superglide
    trinities      = {0x2DEB97B, 0x2DEAF7B},  -- bits: Blue Red Green Yellow White
    world_status   = {0x2DEBC50, 0x2DEB250},  -- 11 bytes, TT WL OC DJ AG AT HT NL HB EotW Monstro:
                                              -- 0 hidden, 1-2 on the map, 3 visited, 4 complete (AP client)
    hud            = {0x2812E9C, 0x281249C},  -- float > 0 while Sora's HUD is up
    -- 1 while Sora stands at a save point (found on Steam by comparing memory on and off the
    -- Accessory Shop's, 2026-10-25, tools/memdiff.py). EGS assumed at the same distance as `world`.
    at_save        = {0x234F740, 0x234E768},
}
local CHEST_BYTES  = 509
local PUPPY_BYTES  = 13

local game_version = nil  -- 1 = EGS, 2 = Steam
local out_dir, out_path, tmp_path
local frame, seq = 0, 0
local last_payload, last_write = nil, 0

local function addr(name) return ADDR[name][game_version] end

local function hex(bytes)
    local parts = {}
    for i = 1, #bytes do parts[i] = string.format("%02x", bytes[i]) end
    return table.concat(parts)
end

local function ensure_dir(dir)
    local probe = dir .. "probe.tmp"
    local f = io.open(probe, "w")
    if f then f:close() os.remove(probe) return true end
    os.execute('mkdir "' .. dir:gsub("\\$", "") .. '"')
    f = io.open(probe, "w")
    if f then f:close() os.remove(probe) return true end
    return false
end

-- Wine maps the Linux root to Z:, so Linux's /proc is visible there; Windows has no such file.
local function under_wine()
    local f = io.open("Z:\\proc\\version", "r")
    if f then f:close() return true end
    return false
end

local function default_output_dir()
    if under_wine() then return "D:\\KH1Companion\\" end
    return (os.getenv("LOCALAPPDATA") or ".") .. "\\KH1Companion\\"
end

local function snapshot()
    local stats = ReadArray(addr("sora_stats"), 4)
    -- Everything except "seq" and "alive" goes into the change check.
    return table.concat({
        '"v":1',
        ',"edition":"', game_version == 2 and "steam" or "egs", '"',
        ',"world":', ReadByte(addr("world")),
        ',"room":', ReadByte(addr("room")),
        ',"in_field":', (ReadFloat(addr("hud")) > 0) and "true" or "false",
        ',"at_save":', ReadByte(addr("at_save")) == 1 and "true" or "false",
        ',"level":', ReadShort(addr("sora_level")),
        ',"max_hp":', stats[1], ',"max_mp":', stats[3], ',"ap":', stats[4],
        ',"postcards":', ReadByte(addr("postcards")),
        ',"chests":"', hex(ReadArray(addr("chests_opened"), CHEST_BYTES)), '"',
        ',"reports":"', hex(ReadArray(addr("reports"), 2)), '"',
        ',"puppies":"', hex(ReadArray(addr("puppies"), PUPPY_BYTES)), '"',
        ',"cups":"', hex(ReadArray(addr("olympus_cups"), 4)), '"',
        ',"progress":"', hex(ReadArray(addr("world_progress"), 16)), '"',
        ',"progress_pre":"', hex(ReadArray(addr("progress_pre"), 4)), '"',
        ',"exp":', ReadInt(addr("sora_exp")),
        ',"abilities":"', hex(ReadArray(addr("sora_abilities"), 48)), '"',
        ',"inventory":"', hex(ReadArray(addr("inventory"), 256)), '"',
        ',"dive":"', hex(ReadArray(addr("dive_choice"), 6)), '"',
        ',"magic":"', hex(ReadArray(addr("magic"), 7)), '"',
        ',"magic_unlocked":', ReadByte(addr("magic_unlocked")),
        ',"shared":"', hex(ReadArray(addr("shared"), 8)), '"',
        ',"trinities":', ReadByte(addr("trinities")),
        ',"world_status":"', hex(ReadArray(addr("world_status"), 11)), '"',
    })
end

local function write_snapshot(body)
    seq = seq + 1
    local f = io.open(tmp_path, "w")
    if not f then return end
    f:write("{", body, ',"seq":', seq, ',"t":', os.time(), "}")
    f:close()
    -- Write-then-rename so the app never reads a half-written file.
    -- Windows rename won't overwrite, so remove the old file first.
    os.remove(out_path)
    os.rename(tmp_path, out_path)
end

-- Uninstalling from the device: the app leaves mod/uninstall.flag next to the state file, and
-- the next time the game starts, the bridge takes LuaBackend out of the game folder itself
-- (the game folder is in GameNative's private storage, which no other app can reach). A loaded
-- DLL can't be deleted but can be renamed, and once it's no longer called DINPUT8.dll nothing
-- loads it again. Runs in the game's working directory, the game folder. The flag's first
-- word "test" renames and immediately renames back, to check this works without removing.
local function self_uninstall(dir)
    local flag = dir .. "mod\\uninstall.flag"
    local f = io.open(flag, "r")
    if not f then return false end
    local mode = (f:read("*l") or ""):match("^%s*(%a*)")
    f:close()
    local function log(text)
        local l = io.open(dir .. "mod\\uninstall.log", "w")
        if l then l:write(text, "\n") l:close() end
    end
    os.remove("DINPUT8.dll.removed")
    local ok, err = os.rename("DINPUT8.dll", "DINPUT8.dll.removed")
    if not ok then
        log("FAIL could not rename DINPUT8.dll: " .. tostring(err))
        return true
    end
    if mode == "test" then
        local back, err2 = os.rename("DINPUT8.dll.removed", "DINPUT8.dll")
        log(back and "OK test: renamed and restored" or ("FAIL test: renamed but could not restore: " .. tostring(err2)))
        os.remove(flag)
        return false
    end
    os.remove("LuaBackend.toml")
    os.remove(dir .. "state.json")
    log("OK removed from the game folder")
    os.remove(flag)
    ConsolePrint("kh1companion: uninstalled from the game folder; it won't load next time")
    return true
end

function _OnInit()
    if GAME_ID ~= 0xAF71841E or ENGINE_TYPE ~= "BACKEND" then
        ConsolePrint("kh1companion: KH1 not detected, not running")
        return
    end
    if ReadByte(0x3A29A6) == 0xF0 then
        game_version = 2
    elseif ReadByte(0x3A2B86) == 0xF0 then
        game_version = 1
    else
        ConsolePrint("kh1companion: unknown KH1 build (not EGS/Steam 1.0.0.10), not running")
        return
    end

    out_dir = OUTPUT_DIR or os.getenv("KH1C_OUTPUT_DIR") or default_output_dir()
    if not ensure_dir(out_dir) then
        ConsolePrint("kh1companion: can't write to " .. out_dir .. ", not running")
        game_version = nil
        return
    end
    if self_uninstall(out_dir) then
        game_version = nil
        return
    end
    out_path = out_dir .. "state.json"
    tmp_path = out_dir .. "state.json.tmp"
    ConsolePrint("kh1companion: " .. (game_version == 2 and "Steam" or "EGS") .. " build, writing " .. out_path)
end

-- Research aid, off unless dump.flag sits next to the state file: whenever the flag's text
-- changes, write 16 MB of game memory to dump-<text>.bin, for finding new values by comparing
-- snapshots (tools/memdiff.py; tools/thor.py snap rewrites the flag on each bottom-screen tap).
-- Read only, like the rest of the bridge.
local DUMP_FROM, DUMP_LEN, DUMP_CHUNK = 0x2000000, 0x1000000, 0x100000
local dump_last = nil

local function dump_on_flag()
    local flag = io.open(out_dir .. "dump.flag", "r")
    if not flag then dump_last = nil return end
    local label = (flag:read("*l") or ""):match("^%s*([%w_-]+)")
    flag:close()
    if not label or label == dump_last then return end
    dump_last = label
    local f = io.open(out_dir .. "dump-" .. label .. ".bin", "wb")
    if not f then return end
    for at = DUMP_FROM, DUMP_FROM + DUMP_LEN - 1, DUMP_CHUNK do
        local chunk = ReadString(at, DUMP_CHUNK)
        if #chunk ~= DUMP_CHUNK then chunk = string.rep("\0", DUMP_CHUNK) end
        f:write(chunk)
    end
    f:close()
    ConsolePrint("kh1companion: wrote dump-" .. label .. ".bin")
end

function _OnFrame()
    if not game_version then return end
    frame = frame + 1
    if frame % POLL_FRAMES ~= 0 then return end

    dump_on_flag()
    local body = snapshot()
    local now = os.time()
    if body ~= last_payload or now - last_write >= HEARTBEAT_SECS then
        write_snapshot(body)
        last_payload = body
        last_write = now
    end
end
