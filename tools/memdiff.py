r"""Find game values by comparing the bridge's memory snapshots (lua/kh1companion.lua, dump.flag).

Each snapshot is 16 MB starting at game offset 0x2000000 (the bridge's DUMP_FROM). Give the
snapshots in order with a label each; this prints the offsets whose byte is the same in every
snapshot with one label and different between labels, as bridge addresses.

  python tools/memdiff.py off:dump-1.bin on:dump-2.bin off:dump-3.bin on:dump-4.bin

Usage on the Thor: create Download/KH1Companion/dump.flag, then each time the pause menu closes the
bridge writes the next dump-N.bin there. Delete the flag (and the dumps) when done.
"""
import sys
from collections import defaultdict

DUMP_FROM = 0x2000000


def main(argv):
    pairs = [a.split(":", 1) for a in argv[1:]]
    if len(pairs) < 3 or any(len(p) != 2 for p in pairs):
        print(__doc__)
        return 2
    groups = defaultdict(list)
    for label, path in pairs:
        groups[label].append(open(path, "rb").read())
    if len(groups) < 2:
        raise SystemExit("need at least two labels")
    n = min(len(b) for bs in groups.values() for b in bs)
    hits = []
    labels = list(groups)
    first = [groups[l][0] for l in labels]
    for i in range(n):
        vals = [b[i] for b in first]
        if len(set(vals)) < len(vals):
            continue  # some labels share a value here
        if all(all(b[i] == v for b in groups[l]) for l, v in zip(labels, vals)):
            hits.append((i, vals))
    print(f"{len(hits)} candidate byte(s); labels {labels}")
    for i, vals in hits[:200]:
        print(f"  0x{DUMP_FROM + i:07X}  " + "  ".join(f"{l}={v:#04x}" for l, v in zip(labels, vals)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
