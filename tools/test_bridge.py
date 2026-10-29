"""Run lua/kh1companion.lua against fake game memory and check the JSON it writes.

Needs lupa (pip install lupa). Uses Lua 5.4 when available, like LuaBackend.
Usage:  python tools/test_bridge.py
"""
import json
import struct
import sys
import tempfile
from pathlib import Path

try:
    import lupa.lua54 as lupa
except ImportError:
    import lupa

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import kh1save  # noqa: E402
STEAM = {  # Steam addresses, mirrored from the script's ADDR table
    "gl_check": 0x3A29A6, "world": 0x233FE84, "room": 0x233FE84 + 0x8,
    "level": 0x2DE9398, "stats": 0x2DE9366, "chests": 0x2DE992C, "reports": 0x2DEAD20,
    "puppies": 0x2DEAA63, "postcards": 0x2DEB01F, "hud": 0x281249C,
    "dive": 0x2DE97EC, "magic": 0x2DE97F2, "magic_unlocked": 0x2DE93D4, "shared": 0x2DE98F9, "trinities": 0x2DEAF7B, "world_status": 0x2DEB250, "progress_pre": 0x2DEA860, "exp": 0x2DE93A0, "abilities": 0x2DE93A4, "inventory": 0x2DE97F9,
}


def make_save(path, rooms):
    """A KHFM_WW.png holding one save per (world, room), with a real XORed entry table."""
    raw = bytearray(kh1save.FILE_SIZE)
    table = bytearray(kh1save.ENTRIES * kh1save.ENTRY)
    for n, (w, r) in enumerate(rooms):
        kh1save.write_entry(table, 2 * n, f"BISLPS-25198-{n + 1:02d}", 1000 + n, 0x16C00)
        kh1save.write_entry(table, 2 * n + 1, f"-{n + 1:02d}/system.bin", 1000 + n, 0x400)
        at = kh1save.DATA_AT + 2 * n * kh1save.STRIDE
        raw[at + 0x2040], raw[at + 0x2044] = w, r
    key = bytes(range(0xA1, 0xB1))
    table[kh1save.KEY_AT:kh1save.KEY_AT + 16] = bytes(16)
    for i in range(kh1save.XOR_LEN):
        table[i] ^= key[i & 15]
    raw[kh1save.HEADER:kh1save.HEADER + len(table)] = table
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(bytes(raw))
    assert [(d[0x2040], d[0x2044]) for _, _, _, d in kh1save.slots(bytes(raw)) if len(d) > 0x400] == list(rooms)


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
    mem[STEAM["progress_pre"] + 1] = 0x0B
    for i, b in enumerate(struct.pack("<I", 70000)):
        mem[STEAM["exp"] + i] = b
    mem[STEAM["abilities"]], mem[STEAM["abilities"] + 1] = 0x81, 0x36
    mem[STEAM["inventory"] + 192] = 2  # two Logs
    mem[STEAM["dive"]] = 1  # kept the Shield
    mem[STEAM["magic"]] = 2  # Fira
    mem[STEAM["magic_unlocked"]] = 0x01  # Fire learned
    mem[STEAM["shared"]] = 0x81  # High Jump
    mem[STEAM["trinities"]] = 0b101
    mem[STEAM["world_status"]] = 3  # Traverse Town visited
    for i, b in enumerate(struct.pack("<f", 1.0)):
        mem[STEAM["hud"] + i] = b

    out_dir = Path(tempfile.mkdtemp())
    lua = lupa.LuaRuntime()
    g = lua.globals()
    rb = lambda a: mem.get(int(a), 0)
    g.GAME_ID, g.ENGINE_TYPE = 0xAF71841E, "BACKEND"
    g.ReadByte = rb
    g.ReadShort = lambda a: rb(a) | rb(a + 1) << 8
    g.ReadInt = lambda a: struct.unpack("<i", bytes(rb(a + i) for i in range(4)))[0]
    g.ReadFloat = lambda a: struct.unpack("<f", bytes(rb(a + i) for i in range(4)))[0]
    g.ReadArray = lambda a, n: lua.table(*[rb(a + i) for i in range(int(n))])
    g.ConsolePrint = print
    for name in ("WriteByte", "WriteShort", "WriteInt", "WriteArray", "WriteFloat"):
        g[name] = lambda *_: (_ for _ in ()).throw(AssertionError("bridge must not write memory"))

    lua.execute((ROOT / "lua" / "kh1companion.lua").read_text(encoding="utf-8"))
    g.OUTPUT_DIR = str(out_dir) + "\\"
    # A save file where the game keeps it, so the bridge reports the rooms saved in.
    home = out_dir / "home"
    save = home / "Documents" / "My Games" / "KINGDOM HEARTS HD 1.5+2.5 ReMIX" / "Steam" / "76561190000000000" / "KHFM_WW.png"
    make_save(save, [(1, 1), (3, 10), (3, 10)])
    g.os.getenv = lambda name: str(home) if name == "USERPROFILE" else None
    clock = {"now": 1000}  # the heartbeat is wall-clock based; drive time by hand
    g.os.time = lambda *_: clock["now"]
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
    assert state["progress_pre"] == "000b0000" and state["exp"] == 70000
    assert state["abilities"][:4] == "8136" and len(state["abilities"]) == 96
    assert state["dive"] == "010000000000" and state["world_status"] == "03" + "00" * 10
    assert state["magic"] == "02000000000000" and state["magic_unlocked"] == 1 and state["shared"][:2] == "81" and state["trinities"] == 5
    assert len(state["inventory"]) == 512 and state["inventory"][384:386] == "02"
    assert state["saved_in"] == [[1, 1], [3, 10]], state["saved_in"]
    seq_before = state["seq"]

    # Unchanged memory and no time passing: no rewrite.
    seq_now = seq_before
    for _ in range(60):
        g._OnFrame()
    assert json.loads((out_dir / "state.json").read_text())["seq"] == seq_now, "rewrote without a change"
    clock["now"] += 3
    for _ in range(15):
        g._OnFrame()
    assert json.loads((out_dir / "state.json").read_text())["seq"] == seq_now + 1, "no heartbeat after 3 s"
    seq_before = seq_now + 1
    mem[STEAM["room"]] = 0x0C
    for _ in range(15):
        g._OnFrame()
    state = json.loads((out_dir / "state.json").read_text())
    assert state["room"] == 0x0C and state["seq"] == seq_before + 1
    assert not (out_dir / "state.json.tmp").exists()

    # A new save shows within a few seconds: the entry table is re-read every 300 frames.
    make_save(save, [(1, 1), (3, 10), (3, 10), (5, 4)])
    for _ in range(300):
        g._OnFrame()
    assert json.loads((out_dir / "state.json").read_text())["saved_in"] == [[1, 1], [3, 10], [5, 4]]
    print("bridge OK:", {k: state[k] for k in ("edition", "world", "room", "level", "seq")})


if __name__ == "__main__":
    run()
