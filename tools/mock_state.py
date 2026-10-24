"""Fake a KH1 playthrough by writing a state.json (default mock/state.json), for work without the game.

Walks through worlds and rooms and opens a chest now and then, in the same
format lua/kh1companion.lua writes.
Usage:  python tools/mock_state.py [--out mock/state.json] [--fast]
then:   python tools/devserver.py --state mock/state.json
"""
import argparse
import json
import os
import random
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("--out", type=Path, default=ROOT / "mock" / "state.json")
ap.add_argument("--fast", action="store_true", help="10x speed")
args = ap.parse_args()
OUT = args.out
OUT.parent.mkdir(parents=True, exist_ok=True)
TICK = 0.05 if args.fast else 0.5
WORLD_IDS = {"Traverse Town": 3, "Wonderland": 4, "Deep Jungle": 5, "Agrabah": 8, "Hollow Bastion": 15}

src = (ROOT / "companion" / "data.js").read_text(encoding="utf-8")
chests = json.loads(re.search(r"KH1_CHESTS = (\[.*?\]);", src).group(1))

rng = random.Random(1)
flags = bytearray(509)
for c in rng.sample(chests, 70):
    flags[c["B"]] |= 1 << c["b"]
puppies = bytearray(13)
for i in range(37):
    puppies[i // 8] |= 0x80 >> (i % 8)
reports = bytearray(2)
reports[0] = 0b10110

seq, level = 0, 24
plan = [(w, r) for w in WORLD_IDS for r in range(1, 4)]
while True:
    for world, room in plan:
        for _ in range(16):
            closed = [c for c in chests if c["w"] == world and not flags[c["B"]] >> c["b"] & 1]
            if closed and rng.random() < 0.15:
                c = rng.choice(closed)
                flags[c["B"]] |= 1 << c["b"]
            seq += 1
            state = {
                "v": 1, "edition": "steam", "world": WORLD_IDS[world], "room": room, "in_field": True,
                "level": level, "max_hp": 84, "max_mp": 6, "ap": 22, "postcards": 4,
                "chests": flags.hex(), "reports": reports.hex(), "puppies": puppies.hex(),
                "cups": "00000000", "progress": "00" * 12, "seq": seq, "t": int(time.time()),
            }
            tmp = OUT.with_suffix(".json.tmp")
            tmp.write_text(json.dumps(state))
            for _attempt in range(10):
                try:
                    os.replace(tmp, OUT)
                    break
                except PermissionError:  # Windows: the http server has it open; try again shortly
                    time.sleep(0.02)
            time.sleep(TICK)
