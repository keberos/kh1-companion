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
