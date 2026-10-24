# Vendored source data

| File | From | License |
|---|---|---|
| `ap-kh1-Locations.py` | [ArchipelagoMW/Archipelago](https://github.com/ArchipelagoMW/Archipelago) `worlds/kh1/Locations.py` @ fcff008 | MIT |
| `rando-chest-items.csv` | [gaithern/KH1FM-RANDOMIZER](https://github.com/gaithern/KH1FM-RANDOMIZER) `Documentation/KH1FM Documentation - Chest Items.csv` @ 57e701f | MIT |
| `rando-static-items.csv` | same repo, `Documentation/KH1FM Documentation - Static Items.csv` @ 57e701f | MIT |

`tools/gen_data.py` turns these into `companion/data.js`. Room IDs: in-game room byte = the room's `.ard` file number − 1
(checked against Item Workshop `tw12` = 0x0B, Secret Waterway `tw23` = 0x16 and HB Entrance Hall `pc05` = 0x04 from community scripts).

| `multipresence-kh1-Rooms.cs`, `multipresence-kh1-Worlds.cs` | [Dekirai/MultiPresence](https://github.com/Dekirai/MultiPresence) `MultiPresence/Models/KH1/` @ 0992d0f | MIT |

MultiPresence names every KH1 room by its in-game room byte (list index = room byte) and every world by its world byte.
It agrees with the room bytes confirmed by community scripts and the map-file rule. Where the randomizer docs' map-file
mapping disagrees (Monstro 0x02/0x03, Halloween Town 0x08), MultiPresence is used.

| `rando-sora-levelup-abilities.csv`, `rando-sora-levelup-stats.csv`, `rando-exp-chart.csv` | [gaithern/KH1FM-RANDOMIZER](https://github.com/gaithern/KH1FM-RANDOMIZER) `Documentation/KH1FM Documentation - Battle Table Sora Level Up Abilities.csv`, `... Level Up Stats.csv`, `... EXP Chart.csv` @ 57e701f | MIT |

Sora's level-up rewards per dream path (Warrior / Guardian / Mystic), the shared stat table, and the three EXP curves
(Dawn / Midday / Dusk; "EXP to Add" = EXP from the previous level). They feed `KH1_LEVELS` in `companion/data.js`.

| `ap-kh1-Rules.py` | [ArchipelagoMW/Archipelago](https://github.com/ArchipelagoMW/Archipelago) `worlds/kh1/Rules.py` @ fcff008 | MIT |

`tools/ap_rules.py` walks its per-location rules at Beginner difficulty with options off and writes each chest's requirements into `KH1_CHESTS[].q`.
