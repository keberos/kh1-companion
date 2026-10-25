r"""Read (and later write) KH1 Final Mix PC saves: KHFM_WW.png from KINGDOM HEARTS HD 1.5+2.5 ReMIX.

The save is a PNG whose private "sqEX" chunk holds 200 slots. Layout from Xeeynamo's Kingdom Save
Editor (KHSave.Archives/PcSaveArchive.cs, PcKh1Factory.cs; GPL-3.0, read for the format only):

  0x0000  PNG header, IHDR, tEXt, sqEX chunk header         (0x70 bytes)
  0x0070  200 slot entries, 0x158 bytes each:
            +0x00 name (0x40, ASCII)   +0x40 created (unix s)   +0x44 flag
            +0x48 modified (unix s)    +0x4C flag               +0x50 data length
            +0x54 flag                 +0x58 padding (0x100)
          The first 0xF0 bytes of the entry table are XORed with the 16 bytes at table+0xE0
          (which XOR to zero themselves, so the key sits there in the clear).
  0xA930  slot data, one slot every 0x16C40 bytes, each `length` bytes long
  ...     IDAT image (the save's preview picture) and IEND

A KH1 slot (0x16C00 bytes) is the game's save block. Known offsets inside it (same source):
  0x2040 world, 0x2044 room, 0x2048 spawn, 0x1641C munny, 0x1642C difficulty.

The slot is the same block of memory the bridge reads: on Steam it starts at 0x2DE9360 (EGS
0x2DE9D60), so every address in lua/kh1companion.lua's ADDR table that falls inside it maps to
`address - base` (checked against real saves: inventory 0x499, shared abilities 0x599, the
Destiny Islands story byte, level and EXP all agree). That makes a save a full companion
snapshot: `state` writes one per slot, for the page to show with no game running.

GameNative's "Export saves" / "Import saves" move this file in and out of the game as a ZIP
(manifest.json + files/<root>/KHFM_WW.png).

Writing: a save is a pair of entries, "BISLPS-25198-NN" (the slot) then "-NN/system.bin" (0x400
bytes), at entries 2n and 2n+1; the game shows NN on its load screen. `copy` puts a copy of one
save into the next empty pair, with optional byte edits, re-XORs the entry table, fixes the sqEX
chunk's PNG CRC (the game's own files carry a valid one), and writes a ZIP that GameNative's
Import saves accepts (same manifest and paths as the export it came from). Saves already in the
file are left byte for byte as they were.

Usage:
  python tools/kh1save.py list  <KHFM_WW.png | GameNative saves .zip>
  python tools/kh1save.py copy  <export .zip> <slot> <out .zip> [offset=hexbytes ...]
      e.g. copy saves.zip 10 test.zip 1641C=d2040000   (slot 10's save as the next one, munny 1234)
  python tools/kh1save.py state <KHFM_WW.png | GameNative saves .zip> [out dir, default dev/scenarios]
      then open http://localhost:8737/?state=/dev/scenarios/save-<slot>.json (tools/devserver.py)
"""
import json
import struct
import sys
import time
import zipfile
import zlib
from pathlib import Path

FILE_SIZE = 0x11EB09D
HEADER = 0x70
ENTRY = 0x158
ENTRIES = 200
STRIDE = 0x16C40
XOR_LEN = 0xF0
KEY_AT = XOR_LEN - 0x10
DATA_AT = HEADER + ENTRIES * ENTRY


def load(path):
    """The raw save file, from a KHFM_WW.png or a GameNative saves ZIP."""
    path = Path(path)
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as z:
            name = next(n for n in z.namelist() if n.endswith("KHFM_WW.png"))
            return z.read(name)
    return path.read_bytes()


def entry_table(raw):
    if len(raw) != FILE_SIZE:
        raise ValueError(f"not a KH1FM PC save: {len(raw)} bytes, expected {FILE_SIZE}")
    table = bytearray(raw[HEADER:HEADER + ENTRIES * ENTRY])
    key = bytes(table[KEY_AT:KEY_AT + 16])
    for i in range(XOR_LEN):
        table[i] ^= key[i & 15]
    return table


def slots(raw):
    """[(index, name, modified, data)] for every used slot."""
    table = entry_table(raw)
    out = []
    for i in range(ENTRIES):
        e = table[i * ENTRY:(i + 1) * ENTRY]
        name = e[:0x40].split(b"\0", 1)[0].decode("ascii", "replace")
        modified, length = struct.unpack_from("<i", e, 0x48)[0], struct.unpack_from("<i", e, 0x50)[0]
        if not name or length <= 0:
            continue
        at = DATA_AT + i * STRIDE
        out.append((i, name, modified, raw[at:at + length]))
    return out


def write_entry(table, i, name, when, data_len):
    e = bytearray(ENTRY)
    e[:len(name)] = name.encode("ascii")
    struct.pack_into("<6i", e, 0x40, when, 0, when, 0, data_len, 0)
    table[i * ENTRY:(i + 1) * ENTRY] = e


def add_save(raw, data, system, when=None):
    """A new save in the first empty pair of entries; returns (new raw, its number NN)."""
    raw = bytearray(raw)
    table = entry_table(bytes(raw))
    used = {i for i, *_ in slots(bytes(raw))}
    pair = next(i for i in range(0, ENTRIES, 2) if i not in used and i + 1 not in used)
    names = [n for _, n, _, _ in slots(bytes(raw)) if n.startswith("BISLPS-25198-")]
    nn = max([int(n[-2:]) for n in names] or [0]) + 1
    when = int(when or time.time())
    write_entry(table, pair, f"BISLPS-25198-{nn:02d}", when, len(data))
    write_entry(table, pair + 1, f"-{nn:02d}/system.bin", when, len(system))
    key = bytes(table[KEY_AT:KEY_AT + 16])
    for i in range(XOR_LEN):
        table[i] ^= key[i & 15]
    raw[HEADER:HEADER + ENTRIES * ENTRY] = table
    for i, blob in ((pair, data), (pair + 1, system)):
        at = DATA_AT + i * STRIDE
        raw[at:at + STRIDE] = bytes(blob) + bytes(STRIDE - len(blob))
    fix_crc(raw)
    return bytes(raw), nn


def fix_crc(raw):
    """Recompute the sqEX chunk's CRC (chunk header at 0x58)."""
    length = struct.unpack_from(">I", raw, 0x58)[0]
    end = 0x60 + length
    struct.pack_into(">I", raw, end, zlib.crc32(raw[0x5C:end]))


def pack(template_zip, raw, out_zip):
    """A GameNative saves ZIP: the template's entries, with KHFM_WW.png replaced."""
    with zipfile.ZipFile(template_zip) as src, zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as dst:
        for info in src.infolist():
            body = raw if info.filename.endswith("KHFM_WW.png") else src.read(info.filename)
            dst.writestr(info.filename, body)


def summary(data):
    if len(data) < 0x16C00:
        return f"(not a game slot: {data[:16].hex()})"
    world, room = data[0x2040], struct.unpack_from("<I", data, 0x2044)[0]
    munny = struct.unpack_from("<I", data, 0x1641C)[0]
    return f"world {world:2d} room {room:3d} munny {munny}"


# Steam addresses from lua/kh1companion.lua, as offsets into the save block.
SAVE_BASE = 0x2DE9360


def field(data, steam_addr, n):
    at = steam_addr - SAVE_BASE
    return data[at:at + n]


def snapshot(data, modified):
    """The bridge's state.json for a save slot. World and room are where the save was made; the
    HUD is taken as up, as it is once a save has loaded."""
    u32 = lambda a: struct.unpack("<I", field(data, a, 4))[0]
    stats = field(data, 0x2DE9366, 4)
    return {
        "v": 1, "edition": "steam",
        "world": data[0x2040], "room": struct.unpack_from("<I", data, 0x2044)[0] & 0xFF, "in_field": True,
        "level": struct.unpack("<H", field(data, 0x2DE9398, 2))[0],
        "max_hp": stats[0], "max_mp": stats[2], "ap": stats[3],
        "postcards": field(data, 0x2DEB01F, 1)[0],
        "chests": field(data, 0x2DE992C, 509).hex(),
        "reports": field(data, 0x2DEAD20, 2).hex(),
        "puppies": field(data, 0x2DEAA63, 13).hex(),
        "cups": field(data, 0x2DEB160, 4).hex(),
        "progress": field(data, 0x2DEA864, 16).hex(),
        "progress_pre": field(data, 0x2DEA860, 4).hex(),
        "exp": u32(0x2DE93A0),
        "abilities": field(data, 0x2DE93A4, 48).hex(),
        "inventory": field(data, 0x2DE97F9, 256).hex(),
        "dive": field(data, 0x2DE97EC, 6).hex(),
        "magic": field(data, 0x2DE97F2, 7).hex(),
        "magic_unlocked": field(data, 0x2DE93D4, 1)[0],
        "shared": field(data, 0x2DE98F9, 8).hex(),
        "trinities": field(data, 0x2DEAF7B, 1)[0],
        "world_status": field(data, 0x2DEB250, 11).hex(),
        "seq": 1, "t": modified,
    }


def main(argv):
    if len(argv) >= 5 and argv[1] == "copy":
        raw = load(argv[2])
        by_index = {i: (data, nxt) for (i, _, _, data), nxt in zip(slots(raw), slots(raw)[1:])}
        data, (_, _, _, system) = by_index[int(argv[3])]
        data = bytearray(data)
        for edit in argv[5:]:
            off, val = edit.split("=")
            data[int(off, 16):int(off, 16) + len(bytes.fromhex(val))] = bytes.fromhex(val)
        new, nn = add_save(raw, data, system)
        pack(argv[2], new, argv[4])
        print(f"{argv[4]}: save {nn:02d} = slot {argv[3]} with {len(argv) - 5} edit(s); {summary(bytes(data))}")
        return 0
    if len(argv) < 3 or argv[1] not in ("list", "state"):
        print(__doc__)
        return 2
    raw = load(argv[2])
    games = [s for s in slots(raw) if len(s[3]) >= 0x16C00]
    if argv[1] == "list":
        for i, name, modified, data in slots(raw):
            when = time.strftime("%Y-%m-%d %H:%M", time.localtime(modified))
            print(f"slot {i:3d}  {name:20s} {when}  {len(data):#x} bytes  {summary(data)}")
        return 0
    out = Path(argv[3]) if len(argv) > 3 else Path(__file__).resolve().parent.parent / "dev" / "scenarios"
    out.mkdir(parents=True, exist_ok=True)
    for i, name, modified, data in games:
        path = out / f"save-{i}.json"
        path.write_text(json.dumps(snapshot(data, modified)), encoding="utf-8")
        print(f"{path}  {summary(data)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
