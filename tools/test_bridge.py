"""Run lua/kh1companion.lua against fake game memory and check the JSON it writes.

Needs lupa (pip install lupa). Uses Lua 5.4 when available, like LuaBackend.
Usage:  python tools/test_bridge.py
"""
import json
import struct
import tempfile
from pathlib import Path

try:
    import lupa.lua54 as lupa
except ImportError:
    import lupa

ROOT = Path(__file__).resolve().parent.parent
STEAM = {  # Steam addresses, mirrored from the script's ADDR table
    "gl_check": 0x3A29A6, "world": 0x233FE84, "room": 0x233FE84 + 0x8,
    "level": 0x2DE9398, "stats": 0x2DE9366, "chests": 0x2DE992C, "reports": 0x2DEAD20,
    "puppies": 0x2DEAA63, "postcards": 0x2DEB01F, "hud": 0x281249C,
}


def run():
    mem = {}
    mem[STEAM["gl_check"]] = 0xF0
    mem[STEAM["world"]], mem[STEAM["room"]] = 0x03, 0x0B
    mem[STEAM["level"]] = 12
    for i, v in enumerate([72, 0, 5, 9]):
        mem[STEAM["stats"] + i] = v
    mem[STEAM["chests"] + 21] = 0b00000101  # byte 22 -> TT chests 2650221 and 2650223
    mem[STEAM["reports"]] = 0b1
    mem[STEAM["puppies"]], mem[STEAM["puppies"] + 1] = 0xFF, 0b11100000  # 11 puppies
    mem[STEAM["postcards"]] = 3
    for i, b in enumerate(struct.pack("<f", 1.0)):
        mem[STEAM["hud"] + i] = b

    out_dir = Path(tempfile.mkdtemp())
    lua = lupa.LuaRuntime()
    g = lua.globals()
    rb = lambda a: mem.get(int(a), 0)
    g.GAME_ID, g.ENGINE_TYPE = 0xAF71841E, "BACKEND"
    g.ReadByte = rb
    g.ReadShort = lambda a: rb(a) | rb(a + 1) << 8
    g.ReadFloat = lambda a: struct.unpack("<f", bytes(rb(a + i) for i in range(4)))[0]
    g.ReadArray = lambda a, n: lua.table(*[rb(a + i) for i in range(int(n))])
    g.ConsolePrint = print
    for name in ("WriteByte", "WriteShort", "WriteInt", "WriteArray", "WriteFloat"):
        g[name] = lambda *_: (_ for _ in ()).throw(AssertionError("bridge must not write memory"))

    lua.execute((ROOT / "lua" / "kh1companion.lua").read_text(encoding="utf-8"))
    g.OUTPUT_DIR = str(out_dir) + "\\"
    g._OnInit()
    for _ in range(30):
        g._OnFrame()

    state = json.loads((out_dir / "state.json").read_text())
    assert state["edition"] == "steam", state
    assert (state["world"], state["room"], state["level"]) == (3, 0x0B, 12), state
    assert (state["max_hp"], state["max_mp"], state["ap"]) == (72, 5, 9), state
    assert state["in_field"] is True and state["postcards"] == 3
    assert len(state["chests"]) == 509 * 2 and state["chests"][42:44] == "05"
    assert state["reports"] == "0100" and state["puppies"][:4] == "ffe0"
    seq_before = state["seq"]

    # Unchanged memory: no rewrite until the heartbeat.
    for _ in range(60):
        g._OnFrame()
    assert json.loads((out_dir / "state.json").read_text())["seq"] == seq_before
    mem[STEAM["room"]] = 0x0C
    for _ in range(15):
        g._OnFrame()
    state = json.loads((out_dir / "state.json").read_text())
    assert state["room"] == 0x0C and state["seq"] == seq_before + 1
    assert not (out_dir / "state.json.tmp").exists()
    print("bridge OK:", {k: state[k] for k in ("edition", "world", "room", "level", "seq")})


if __name__ == "__main__":
    run()
