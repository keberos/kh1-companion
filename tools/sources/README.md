# Vendored source data

| File | From | License |
|---|---|---|
| `ap-kh1-Locations.py` | [ArchipelagoMW/Archipelago](https://github.com/ArchipelagoMW/Archipelago) `worlds/kh1/Locations.py` @ fcff008 | MIT |
| `rando-chest-items.csv` | [gaithern/KH1FM-RANDOMIZER](https://github.com/gaithern/KH1FM-RANDOMIZER) `Documentation/KH1FM Documentation - Chest Items.csv` @ 57e701f | MIT |
| `rando-static-items.csv` | same repo, `Documentation/KH1FM Documentation - Static Items.csv` @ 57e701f | MIT |

`tools/gen_data.py` turns these into `companion/data.js`. Room IDs: in-game room byte = the room's `.ard` file number − 1
(checked against Item Workshop `tw12` = 0x0B, Secret Waterway `tw23` = 0x16 and HB Entrance Hall `pc05` = 0x04 from community scripts).
