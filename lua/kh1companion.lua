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

-- Where the snapshot goes. Leave nil to use %LOCALAPPDATA%\KH1Companion\.
-- Under GameNative/Winlator, point this at a Wine drive that maps to Android
-- shared storage so the companion app can read it, e.g. "D:\\KH1Companion\\".
OUTPUT_DIR = nil

local POLL_FRAMES      = 15   -- ~4 Hz at 60 fps
local HEARTBEAT_FRAMES = 120  -- rewrite at least every ~2 s so the app can tell we're alive

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
    world_progress = {0x2DEB264, 0x2DEA864},  -- 12 bytes, one per world
    hud            = {0x2812E9C, 0x281249C},  -- float > 0 while Sora's HUD is up
}
local CHEST_BYTES  = 509
local PUPPY_BYTES  = 13

local game_version = nil  -- 1 = EGS, 2 = Steam
local out_dir, out_path, tmp_path
local frame, seq = 0, 0
local last_payload, frames_since_write = nil, 0

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

local function snapshot()
    local stats = ReadArray(addr("sora_stats"), 4)
    -- Everything except "seq" and "alive" goes into the change check.
    return table.concat({
        '"v":1',
        ',"edition":"', game_version == 2 and "steam" or "egs", '"',
        ',"world":', ReadByte(addr("world")),
        ',"room":', ReadByte(addr("room")),
        ',"in_field":', (ReadFloat(addr("hud")) > 0) and "true" or "false",
        ',"level":', ReadShort(addr("sora_level")),
        ',"max_hp":', stats[1], ',"max_mp":', stats[3], ',"ap":', stats[4],
        ',"postcards":', ReadByte(addr("postcards")),
        ',"chests":"', hex(ReadArray(addr("chests_opened"), CHEST_BYTES)), '"',
        ',"reports":"', hex(ReadArray(addr("reports"), 2)), '"',
        ',"puppies":"', hex(ReadArray(addr("puppies"), PUPPY_BYTES)), '"',
        ',"cups":"', hex(ReadArray(addr("olympus_cups"), 4)), '"',
        ',"progress":"', hex(ReadArray(addr("world_progress"), 12)), '"',
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

    out_dir = OUTPUT_DIR or ((os.getenv("LOCALAPPDATA") or ".") .. "\\KH1Companion\\")
    if not ensure_dir(out_dir) then
        ConsolePrint("kh1companion: can't write to " .. out_dir .. ", not running")
        game_version = nil
        return
    end
    out_path = out_dir .. "state.json"
    tmp_path = out_dir .. "state.json.tmp"
    ConsolePrint("kh1companion: " .. (game_version == 2 and "Steam" or "EGS") .. " build, writing " .. out_path)
end

function _OnFrame()
    if not game_version then return end
    frame = frame + 1
    frames_since_write = frames_since_write + 1
    if frame % POLL_FRAMES ~= 0 then return end

    local body = snapshot()
    if body ~= last_payload or frames_since_write >= HEARTBEAT_FRAMES then
        write_snapshot(body)
        last_payload = body
        frames_since_write = 0
    end
end
