# Vendored source data

| File | From | License |
|---|---|---|
| `ap-kh1-Locations.py` | [ArchipelagoMW/Archipelago](https://github.com/ArchipelagoMW/Archipelago) `worlds/kh1/Locations.py` @ fcff008 | MIT |
| `ap-kh1-Rules.py` | [ArchipelagoMW/Archipelago](https://github.com/ArchipelagoMW/Archipelago) `worlds/kh1/Rules.py` @ fcff008 | MIT |
| `rando-chest-items.csv` | [gaithern/KH1FM-RANDOMIZER](https://github.com/gaithern/KH1FM-RANDOMIZER) `Documentation/KH1FM Documentation - Chest Items.csv` @ 57e701f | MIT |
| `rando-sora-levelup-abilities.csv`, `rando-sora-levelup-stats.csv`, `rando-exp-chart.csv` | [gaithern/KH1FM-RANDOMIZER](https://github.com/gaithern/KH1FM-RANDOMIZER) `Documentation/KH1FM Documentation - Battle Table Sora Level Up Abilities.csv`, `... Level Up Stats.csv`, `... EXP Chart.csv` @ 57e701f | MIT |
| `multipresence-kh1-Rooms.cs`, `multipresence-kh1-Worlds.cs` | [Dekirai/MultiPresence](https://github.com/Dekirai/MultiPresence) `MultiPresence/Models/KH1/` @ 0992d0f | MIT |

`tools/gen_data.py` turns these into `companion/data.js`:

- **Chests and Ansem Reports** come from Archipelago's location list (name and save-flag bit), with each chest's room and
  vanilla contents from the randomizer's chest table.
- **Chest requirements:** `tools/ap_rules.py` walks Archipelago's per-location rules at Beginner difficulty with options
  off and writes each chest's requirements into `KH1_CHESTS[].q`.
- **Room names:** MultiPresence names every KH1 room by its in-game room byte (list index = room byte) and every world by
  its world byte. The map nodes in `companion/maps.js` list their room bytes from it.
- **Levels:** Sora's level-up rewards per dream path (Warrior / Guardian / Mystic), the shared stat table, and the three
  EXP curves (Dawn / Midday / Dusk; "EXP to Add" = EXP from the previous level) feed `KH1_LEVELS`.
