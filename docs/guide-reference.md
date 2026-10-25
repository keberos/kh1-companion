# Guide reference

The objective-by-objective reference the in-app Guide (`companion/guide.js`) is built from. It's written for this
project from the [KH Wiki's KH1 walkthroughs](https://www.khwiki.com/Walkthrough:Kingdom_Hearts) (all 14 pages, raw
wikitext, read 2026-10-24) and checked against play on the AYN Thor. Players never see it whole; the Guide reveals
it in spoiler-free layers.

## Rules

- **One objective at a time, only once the game has handed it out.** A step can carry `from`, a save test for
  when the game gives it; until then there's no next step.
- **Nothing during scenes.** A newly unlocked objective appears only once the HUD is back (the bridge's
  `in_field`), so it never shows while the scene that reveals it is still playing. Steps already shown stay
  visible through menus. (The Dive is exempt: its first platform has no HUD.)
- **Gaps are fine.** Between objectives, the Guide says there's nothing to do right now rather than show the last
  step or peek at the next.
- **Every step needs a save test** for "done". Without one, an objective is folded into a neighbour that has one.

## How steps are detected

| Test | Meaning | Source |
|---|---|---|
| `p`, `at` | per-world story byte (`progress[p]`, 16 bytes at 0x2DEB264 EGS / 0x2DEA864 Steam) reached `at` | Archipelago KH1 client thresholds (gaithern/KH-1FM-AP-LUA, credited to RetroAchievements code notes); event names from Archipelago's `Locations.py` |
| `pre` | one of the 4 bytes before those (`progress_pre`) reached a value | read on the Thor |
| `items` / `has` | inventory counts / an item, spell, ability or Trinity in the save | Archipelago item ids (slot = id − 2641000) |
| `reach` | the player walked into that map room **while the step was current** | the room byte |
| `dive`, `end` | Dive room order; "only once you've moved on" | room order / world change |

Story byte index `p`: 0 Traverse Town, 1 Deep Jungle, 2 Olympus, 3 Wonderland, 4 Agrabah, 5 Monstro, 6 Atlantica,
8 Halloween Town, 9 Neverland, 10 Hollow Bastion, 11 End of the World, 14 Traverse Town's extra byte;
15 read 0x12 on Destiny Islands' second day.

Finished steps are remembered on the device (items get handed over, rooms are walked through) and forgotten on a
new game.

## Missables

| What | When it's lost |
|---|---|
| Everything on Destiny Islands | once you leave on the night of the storm |
| Neverland's Clock Tower chests | after the Behemoth in Hollow Bastion |
| The Final Rest is the last save | past the final door there's no going back |

(Halloween Town's manor Red Trinity is missable in the original, but Final Mix moves it, so it isn't here.)

## Story order

Dive → Destiny Islands → Traverse Town → Wonderland / Olympus / Deep Jungle (any order) → Traverse Town (Secret
Waterway, Merlin, Opposite Armor) → Agrabah → Monstro → Halloween Town / Atlantica (any order) → Neverland →
Hollow Bastion → Traverse Town (Kairi) → Hollow Bastion (Behemoth) → End of the World. The 100 Acre Wood is reached
through Merlin's book whenever you have Torn Pages; it has no story-byte checkpoints yet, so it has no Guide steps.

## Dive to the Heart

| # | Objective | Done when | Test |
|---|---|---|---|
| 1 | Walk to the light; keep one weapon, give one up (sets abilities and stats) | leaving the first station | `dive` |
| 2 | Practise swinging, beat the Shadows; examine the door, open the chest, break crate and barrel, open the door | through the door | `dive` |
| 3 | Answer Tidus, Wakka and Selphie (sets the EXP curve) | back on the station | `dive` |
| 4 | Beat the Shadows to reveal the save point; follow the glass path to the giant shadow | waking on the islands | `end: dive` |

`progress_pre` in the Dive: `0a 04..53 00 00` (byte 1 counts up). The Dive's weapon choice reads world 0 / room 0
with no HUD, like the title screen; `progress_pre` tells them apart.

## Destiny Islands

| # | Objective | Handed out | Done when | Test |
|---|---|---|---|---|
| 1 | Kairi's list: 2 Logs (under the bridge; on the little island), Cloth (treehouse), Rope (west platform) | start | all in the bag | `items` |
| 2 | Bring them to Kairi and call it a day | — | day two | `pre[3] ≥ 1` (Thor) |
| 3 | Through the Cove door: name the raft, race Riku | day two | race over / list given | `pre[2] ≥ 0x14` (Thor: 07 → 0a on meeting Riku → 14) |
| 4 | Kairi's second list on the raft: 3 Mushrooms, 3 Fish, Seagull Egg, Drinking Water (+2 Coconuts); hidden Cove chest | race over | all in the bag | `items` |
| 5 | Bring the food to Kairi and go home (last chance on the islands) | — | the storm | `reach` Island Remains (only reachable that night) |
| 6 | The storm: ignore the Shadows, run to the bent Paopu tree | storm | reaching the Secret Place | `reach` Secret Place |
| 7 | Kairi in the Secret Place; the door's fight | — | leaving for Traverse Town | `end: islands` |

Optional any time: spar with Tidus, Wakka, Selphie (alone or together) and Riku; race Riku again for Pretty
Stones. To record: when the food hand-in happens (a `progress_pre` value), to replace step 5's room test.

## Traverse Town

| # | Objective | Handed out | Done when | Test |
|---|---|---|---|---|
| 1 | Save and meet Cid (Accessory Shop), see the 2nd District, back to Cid; Leon confronts you on the way out | arrival | waking in the Hotel | `reach` Green Room |
| 2 | Talk to Leon, open the chest, say you're ready; the biggest Heartless is in the 3rd District | — | Guard Armor beaten | `p0 ≥ 0x2B` |
| 3 | Donald and Goofy join; Fire, Dodge Roll, Blue Trinity; off on the Gummi Ship | — | | `p0 ≥ 0x31` |
| 4 | Red Trinity on the Alleyway bars; Leon in the Secret Waterway | has Red Trinity | Earthshine | `p0 ≥ 0x3E` |
| 5 | Cid's book: Fire on the 3rd District's flame door, across the Mystical House to Merlin | after Leon | in Merlin's House | `reach` Merlin's House |
| 6 | Open the 1st/3rd District door; Cid in the Small House (Riku on the way) | — | in the Small House | `reach` Small House |
| 7 | Red Trinity on the Gizmo Shop roof; ring the bell three times; the Keyhole's guard | — | Opposite Armor beaten | `p14 ≥ 0x14` |
| 8 | After Hollow Bastion: Cid's Navi-Gummi; Kairi and the mural in the Secret Waterway | Riku II beaten (`p10 ≥ 0x82`) | Oathkeeper | `p0 ≥ 0x8C` |

## Deep Jungle

| # | Objective | Done when | Test |
|---|---|---|---|
| 1 | After the leopard, follow Tarzan down the slide to the Camp and into the tent | in the tent | `reach` Camp: Tent |
| 2 | Jane's slides around the Camp and Tent; the slideshow | Protect-G event | `p1 ≥ 0x17` |
| 3 | With Tarzan through the Cliff, Lagoon and Climbing Trees to the Tree House; the leopard again at the Camp | Sabor beaten | `p1 ≥ 0x42` |
| 4 | Save the gorillas (Tree House, Cliff, Bamboo Thicket, Climbing Trees, Camp); free Jane (Blizzard the flowers); Clayton | Clayton beaten | `p1 ≥ 0x56` |
| 5 | Climb the Waterfall Cavern to the cave at the top | Navi-G Piece | `p1 ≥ 0x5C` |
| 6 | Seal the Keyhole | Jungle King, Red Trinity | `p1 ≥ 0x6E` |

## Olympus Coliseum

| # | Objective | Done when | Test |
|---|---|---|---|
| 1 | Talk to Phil, try the block, pass the barrel test | Thunder | `p2 ≥ 0x0D` |
| 2 | Phil says no; someone hands you a pass on the way out | Entry Pass | `p2 ≥ 0x10` |
| 3 | Win the preliminaries (losing the final is fine); the three-headed guest (Cure helps) | Cerberus beaten | `p2 ≥ 0x25` |
| 4 | Phil and Hercules; Cloud's gift on the way out | Hero's License | `p2 ≥ 0x28` |

The cups open later; the Yellow Trinity Keyhole needs the Hercules Cup.

## Wonderland

| # | Objective | Done when | Test |
|---|---|---|---|
| 1 | Bizarre Room: talk to the Doorknob, push the bed, drink from the blue bottle, leave where the bed was | in the Queen's Castle | `reach` Queen's Castle |
| 2 | Evidence: Footprints (mushroom steps), Antenna (lily pad), Stench (stove, via the tree), Claw Marks (faucet → cabinet, after growing with a Potion) | any one piece | `any` of the four |
| 3 | The trial; break the cage tower; Cheshire Cat; Tea Party Garden; light both lamps in the Bizarre Room; talk to the cat on the table | Trickmaster beaten | `p3 ≥ 0x2E` |
| 4 | The Doorknob yawns: seal the Keyhole | Navi-G Piece | `p3 ≥ 0x30` |

To verify: Archipelago files Blizzard under the Trickmaster event, while the walkthrough has the Cheshire Cat give
it after the evidence.

## Agrabah

| # | Objective | Done when | Test |
|---|---|---|---|
| 1 | Clear the Plaza; Aladdin's House (Carpet, keyhole behind the drawers); Jasmine in the Alley; the Carpet to the Desert | in the Desert | `reach` Desert |
| 2 | Rescue Aladdin; Aladdin's House, then the Palace Gates | Pot Centipede beaten | `p4 ≥ 0x35` |
| 3 | Back through the Plaza to the cave; its guardian | at the Cave: Entrance | `reach` Cave: Entrance |
| 4 | Relic, Silent (statue jewel), Hidden Room (pillar), Hall, Bottomless Hall, Treasure Room, Lamp Chamber | Jafar beaten | `p4 ≥ 0x49` |
| 5 | Jafar again, over lava | Genie Jafar beaten | `p4 ≥ 0x5A` |
| 6 | Seal the Keyhole; Carpet escape | Genie, Three Wishes, Green Trinity | `p4 ≥ 0x78` |

## Monstro

| # | Objective | Done when | Test |
|---|---|---|---|
| 1 | Chase Pinocchio: Chambers 1, 2, 3, 5, 6, then 4; save; the Bowels | Parasite Cage beaten | `p5 ≥ 0x2E` |
| 2 | Chest by Geppetto (High Jump); up the ship to the Throat; the Stomach | Parasite Cage II | `p5 ≥ 0x46` |

## Atlantica

| # | Objective | Done when | Test |
|---|---|---|---|
| 1 | Swimming lesson; hit the clam; Undersea Valley → Calm Depths → Cave → Gorge → Triton's Palace | in Triton's Throne | `reach` Triton's Throne |
| 2 | Ariel's Grotto; the dolphin in the Undersea Valley to the Sunken Ship; the chest past the shark | Crystal Trident | `p6 ≥ 0x32` |
| 3 | Place it in the Grotto; palace scenes; beat the shark, press the button; Den of Tides, Tidal Abyss | Ursula beaten | `p6 ≥ 0x53` |
| 4 | Mermaid Kick through the Calm Depths current to the open sea | Ursula II beaten | `p6 ≥ 0x5D` |
| 5 | Ariel's Grotto with the trident | Crabclaw | `p6 ≥ 0x64` |

## Halloween Town

| # | Objective | Done when | Test |
|---|---|---|---|
| 1 | Guillotine Square scene; follow Jack to the lab | in the Research Lab | `reach` Research Lab |
| 2 | Sally in the Graveyard (up the stairs, left of the square) | Forget-Me-Not | `p8 ≥ 0x1E` |
| 3 | Lab, then the Graveyard coffin to the Boneyard; the mayor's pumpkins | Jack-in-the-Box | `has` |
| 4 | Moonlight Hill lever, Bridge, Oogie's Manor, the Evil Playroom trio, the green door | Oogie Boogie beaten | `p8 ≥ 0x62` |
| 5 | The manor's glowing orbs | Oogie's Manor beaten | `p8 ≥ 0x6A` |
| 6 | The Keyhole where the manor stood | Pumpkinhead | `p8 ≥ 0x6E` |

## Neverland

| # | Objective | Done when | Test |
|---|---|---|---|
| 1 | With Peter Pan: Hold → Freezer → Galley → Cabin → Captain's Cabin | Anti-Sora beaten | `p9 ≥ 0x35` |
| 2 | Down the trapdoor, out on deck, off the plank: you can fly | Hook encounter (Cure) | `p9 ≥ 0x3F` |
| 3 | Beat the deck Heartless until Hook comes out | Hook beaten | `p9 ≥ 0x56` |
| 4 | Clock Tower: hit the face that's 15 minutes off | Keyhole: Tinker Bell, Glide | `p9 ≥ 0x6E` |
| – | *Optional, late:* the Phantom (talk to Tinker Bell, Peter in the party, bring Stop) | | `p9 ≥ 0x96` |

## Hollow Bastion

| # | Objective | Handed out | Done when | Test |
|---|---|---|---|---|
| 1 | Freeze the bubbles up the Rising Falls; moving platforms to the Castle Gates | | at the Castle Gates | `reach` Castle Gates |
| 2 | Base Level, Waterway, Dungeon (the Beast clears bars); buttons and gears open the door; Entrance Hall | | Riku beaten | `p10 ≥ 0x32` |
| 3 | The library: shelve books by letter; the last book opens the upper hall | | Theon Vol. 6 | `has` |
| 4 | Emblem pieces: fountain (vases), candles (Fire), statue (Red Trinity), pushed statue (chest) | | all four | `all` |
| 5 | Lift Stop, Great Crest, High Tower (Gravity on floating platforms), Castle Chapel | | Maleficent beaten | `p10 ≥ 0x5A` |
| 6 | Save; through the portal | | Dragon beaten | `p10 ≥ 0x6E` |
| 7 | The new way beside the save point to the Grand Hall | | Riku II beaten | `p10 ≥ 0x82` |
| 8 | After Traverse Town: the princesses, then the Grand Hall's Keyhole into the Dark Depths (Clock Tower chests lost after) | Kairi's gift (`p0 ≥ 0x8C`) | Behemoth beaten | `p10 ≥ 0xB9` |
| 9 | The princesses, Aerith in the Library, Belle upstairs | | Fire upgrade | `p10 ≥ 0xC3` |

## End of the World

| # | Objective | Done when | Test |
|---|---|---|---|
| 1 | Final Dimension chests (some are fights); the far exit | in the Giant Crevasse | `reach` Giant Crevasse |
| 2 | Down the Crevasse's platforms to the white portal | in the World Terminus | `reach` World Terminus |
| 3 | Pillars into pieces of each world; the flame portal; the machine; the vortex | Chernabog beaten | `p11 ≥ 0x33` |
| 4 | Volcanic Crater → hallways of lost worlds → Linked Worlds (break the emblem) → Final Rest, the last save | at the Final Rest | `reach` Final Rest |
| 5 | Through the door: the Secret Place, then the final battle in stages | — | none (the end) |

## Recording more checkpoints

Play with the bridge running and log `progress_pre`, `progress`, the inventory and the room as they change, with a
shot of the game's screen at each change (the scratch `watch_story.py` does this over adb). Match each change to
the objective it started or finished, then add it here and to `guide.js` with a test.
