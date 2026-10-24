"""Write sample bridge snapshots to dev/scenarios/ for previewing the page without the game.

Open  http://localhost:8737/?state=/dev/scenarios/<name>.json  with the dev server running.
Usage:  python tools/make_scenarios.py
"""
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dev" / "scenarios"


def snapshot(world, room, level, exp, progress=(), inventory=None, abilities=(), magic=(), shared=(), trinities=0, chests=()):
    prog = bytearray(16)
    for i, v in progress:
        prog[i] = v
    inv = bytearray(256)
    for i, n in (inventory or {}).items():
        inv[i] = n
    flags = bytearray(509)
    for B, b in chests:
        flags[B] |= 1 << b
    pad = lambda xs, n: bytes(list(xs) + [0] * (n - len(xs)))
    return {
        "v": 1, "edition": "steam", "world": world, "room": room, "in_field": True, "level": level,
        "max_hp": 18 + level * 3, "max_mp": 2, "ap": 2 + level // 3, "postcards": 0,
        "chests": flags.hex(), "reports": "0000", "puppies": "00" * 13, "cups": "00000000",
        "progress": prog.hex(), "progress_pre": "00000000", "exp": exp,
        "abilities": pad(abilities, 48).hex(), "inventory": inv.hex(), "magic": pad(magic, 7).hex(),
        "shared": pad(shared, 8).hex(), "trinities": trinities, "dive": "000000000000", "seq": 1, "t": int(time.time()),
    }


SCENARIOS = {
    # Day 1 on the islands, one log and the cloth found.
    "destiny-islands": snapshot(1, 0x00, 3, 30, inventory={192: 1, 193: 1}),
    # Hollow Bastion before Maleficent: Warrior path, Midday, High Jump 2, no Glide yet.
    "hollow-bastion": snapshot(
        15, 0x04, 38, 30000,
        progress=[(0, 0x3E), (1, 0x6E), (2, 0x28), (3, 0x30), (4, 0x78), (5, 0x46), (6, 0x64), (8, 0x6E), (9, 0x35), (10, 0x32), (14, 0x14)],
        abilities=[0xB6, 0x8A, 0xB5, 0x93, 0xBC, 0x86, 0x95, 0xB7, 0x94, 0x85, 0xB8],
        magic=[2, 2, 2, 1, 1, 1, 1], shared=[0x81, 0x81, 0x82], trinities=0b01111,
    ),
}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, state in SCENARIOS.items():
        (OUT / f"{name}.json").write_text(json.dumps(state), encoding="utf-8")
        print("wrote", OUT / f"{name}.json")
