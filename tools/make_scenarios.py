"""Write sample bridge snapshots to dev/scenarios/ for previewing the page without the game.

Open  http://localhost:8737/?state=/dev/scenarios/<name>.json  with the dev server running.
Usage:  python tools/make_scenarios.py
"""
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dev" / "scenarios"


def snapshot(world, room, level, exp, progress=(), inventory=None, abilities=(), magic=(), shared=(), trinities=0, chests=(), status=()):
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
        "magic_unlocked": sum(1 << i for i, v in enumerate(magic) if v),
        "shared": pad(shared, 8).hex(), "trinities": trinities, "dive": "000000000000", "world_status": pad(status, 11).hex(), "seq": 1, "t": int(time.time()),
    }


def title():
    # Title screen after boot: world 0 room 0, no HUD; memory holds leftovers, so the page shows nothing.
    s = snapshot(0, 0x00, 38, 30000, chests=[(20, 0), (21, 2)])
    s["in_field"] = False
    return s


def chests_named(world, names):
    """Flag bits of the named chests, from the generated chest data."""
    import re
    data = (ROOT / "companion" / "data.js").read_text(encoding="utf-8")
    chests = json.loads(re.search(r"KH1_CHESTS = (\[.*?\]);", data).group(1))
    found = [(c["B"], c["b"]) for c in chests if c["w"] == world and c["n"] in names]
    assert len(found) == len(names), f"missing chests in {world}"
    return found


def traverse_town():
    """Early game for showcase screenshots: back in Traverse Town after the first Guard Armor,
    LV 9 Warrior/Midday, Wonderland and Olympus on the Gummi map, nothing past that revealed."""
    cum = [0, 0]
    exp_chart = (ROOT / "tools" / "sources" / "rando-exp-chart.csv").read_text(encoding="utf-8").splitlines()[1:]
    mid = sorted((int(r.split(",")[2]), int(r.split(",")[6])) for r in exp_chart if ",Midday," in r)
    for _, n in mid:
        cum.append(cum[-1] + n)
    opened = chests_named("Traverse Town", ["2nd District Boots and Shoes Awning Chest", "2nd District Rooftop Chest",
                                            "Accessory Shop Chest", "Alleyway Balcony Chest", "Green Room Table Chest",
                                            "Red Room Chest"]) + chests_named("Destiny Islands", ["Chest"])
    s = snapshot(3, 0x01, 9, cum[9] + 40, progress=[(0, 0x31)], abilities=[0xB6, 0x8A], magic=[1],
                 trinities=0b00001, chests=opened, status=[3, 2, 1])
    s["level"] = 9
    return s


SCENARIOS = {
    "title": title(),
    "traverse-town": traverse_town(),
    # Day 1 on the islands, one log and the cloth found.
    "destiny-islands": snapshot(1, 0x00, 3, 30, inventory={192: 1, 193: 1}),
    # Hollow Bastion before Maleficent: Warrior path, Midday, High Jump 2, no Glide yet.
    "hollow-bastion": snapshot(
        15, 0x04, 38, 30000,
        progress=[(0, 0x3E), (1, 0x6E), (2, 0x28), (3, 0x30), (4, 0x78), (5, 0x46), (6, 0x64), (8, 0x6E), (9, 0x35), (10, 0x32), (14, 0x14)],
        abilities=[0xB6, 0x8A, 0xB5, 0x93, 0xBC, 0x86, 0x95, 0xB7, 0x94, 0x85, 0xB8],
        magic=[2, 2, 2, 1, 1, 1, 1], shared=[0x81, 0x81, 0x82], trinities=0b01111,
        status=[3, 4, 4, 4, 4, 4, 4, 3, 3, 0, 4],
    ),
}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, state in SCENARIOS.items():
        (OUT / f"{name}.json").write_text(json.dumps(state), encoding="utf-8")
        print("wrote", OUT / f"{name}.json")
