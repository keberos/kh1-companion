# Guide reference

The objective-by-objective reference the in-app Guide (`companion/guide.js`) is built from. It's written for this
project from the [KH Wiki's KH1 walkthroughs](https://www.khwiki.com/Walkthrough:Kingdom_Hearts) (raw wikitext,
read 2026-10-24) and checked against play on the AYN Thor. It isn't shown to players; the Guide reveals it in
spoiler-free layers.

**Rule:** a step shows only once the game has handed it out, and stays until it's done. Between objectives, while
scenes play, the Guide shows nothing rather than the last step or the next one.

Each objective needs two save checkpoints: when the game **hands it out** and when it's **done**. Status:

- **AP**: a story-progress threshold from the Archipelago KH1 client (gaithern/KH-1FM-AP-LUA, `world_progress`).
- **Thor**: read off the save during play on the Thor (date given).
- **To record**: no checkpoint yet. The Guide merges the objective into a neighbour that has one rather than guess.

Bytes: `progress[i]` is the per-world story byte (16 bytes at 0x2DEB264 EGS / 0x2DEA864 Steam);
`pre[i]` is the 4 bytes just before it (`progress_pre`). Inventory counts use the Archipelago item ids.

## Dive to the Heart (world 0)

| # | Objective | Where | Handed out | Done | Checkpoint |
|---|---|---|---|---|---|
| 1 | Walk to the light; pick a weapon to keep and one to give up | First station (room 0) | game start | the station breaks | Thor: room leaves 0; Dive answers byte 0 = kept weapon (0 Sword, 1 Shield, 2 Rod) |
| 2 | Practise: take a swing, beat the Shadows, lock on | Second station | after the choice | sinking into the darkness | room order (`dive` rank) |
| 3 | Examine the door; open the chest, break the crate and barrel; open the door | Third station | on landing | door opens | room order |
| 4 | Answer Tidus, Wakka and Selphie (sets the EXP curve) | Dream islands | through the door | back on the station | room order; the curve has no save byte (inferred from EXP) |
| 5 | Beat the Shadows to reveal the save point, save, follow the glass path | Awakening | after the questions | reaching the last station | room order |
| 6 | Defeat the giant shadow (Darkside) | Last station | on arrival | waking on the islands | world becomes 1 |

`pre` while in the Dive: `0a 04..53 00 00` (Thor, 2026-10-24); byte 1 counts up through it.

## Destiny Islands (world 1)

| # | Objective | Where | Handed out | Done | Checkpoint |
|---|---|---|---|---|---|
| 1 | Talk to Kairi; gather 2 Logs, 1 Cloth, 1 Rope | Seashore | Kairi's list | all four in the bag | items (Log/Cloth/Rope); remembered once seen, since they're handed over |
| – | *Optional:* spar with Tidus, Wakka, Selphie (alone or all three) and Riku | Seashore | any time | — | none needed |
| 2 | Bring the supplies to Kairi, then "call it a day" | Seashore | supplies gathered | day two starts (sunset talk, then a Disney Castle scene) | Thor: `pre[3]` 00 → 01 (2026-10-24) |
| 3 | Meet Riku through the Cove door: name the raft, then race him | Cove | day two starts | Kairi hands out the food list | Thor: `pre[2]` 07 at day-two start → 0a on meeting Riku → 14 (race done or list given: to confirm) |
| – | *Optional:* race again for Pretty Stones | Cove | after the first race | — | none needed |
| 4 | Talk to Kairi on the raft; gather 3 Mushrooms, 3 Fish, 2 Coconuts, 1 Seagull Egg, Drinking Water | Cove, Seashore, Secret Place | Kairi's second list | all in the bag | items; the last mushroom (Secret Place) plays a scene with a cloaked figure |
| – | *Optional:* the hidden chest in the Cove (throw a crate at the hole near the wooden tower) | Cove | any time on day two | chest flag | chest data |
| 5 | Bring the food to Kairi and "go home" | Cove | food gathered | night scenes start (Kairi talk, Disney Castle departure, Sora's room) | to record |
| — | *Scenes: nothing to do* | | | | |
| 6 | The storm: run to the bent Paopu tree to find Riku (the wooden sword can't hurt the Shadows) | Island Remains | storm starts | Riku vanishes; the Keyblade appears | to record |
| 7 | Fight through to the Secret Place to find Kairi | Secret Place | Keyblade in hand | the door opens | to record |
| 8 | Defeat the giant shadow again (Darkside) | Island Remains | after the Secret Place | arriving in Traverse Town | `progress[0]` > 0 |

`progress[15]` read 0x12 on day two (Thor, 2026-10-24). The islands can't be revisited once left, so anything
missed there is gone.

## Traverse Town (world 3), first visit

| # | Objective | Where | Handed out | Done | Checkpoint |
|---|---|---|---|---|---|
| 1 | Look around: save in the Accessory Shop (meet Cid), then the 2nd District; fight the Shadows there | 1st, 2nd District | arrival | Leon finds you | to record |
| 2 | Leave the Accessory Shop after talking to Cid: Leon confronts you (win or lose, the story goes on) | 1st District | after visiting the 2nd District and Cid | waking in the Hotel's Green Room | to record |
| 3 | Talk to Leon, open the chest, say you're ready; find the biggest Heartless | Hotel → Alleyway → 3rd District | after the scenes | the 3rd District boss scene | to record |
| 4 | Defeat the Guard Armor | 3rd District | entering the 3rd District | the win | AP: `progress[0]` ≥ 0x2B |
| 5 | Scenes: Donald and Goofy join; Fire and Dodge Roll | 3rd District | after the boss | leaving for the Gummi Ship | AP: `progress[0]` ≥ 0x31 |

### Later visits

| # | Objective | Where | Handed out | Done | Checkpoint |
|---|---|---|---|---|---|
| 6 | Red Trinity into the Secret Waterway; talk to Leon (Earthshine) | Alleyway → Secret Waterway | return with the Red Trinity | talking to Leon | AP: `progress[0]` ≥ 0x3E |
| 7 | Cid asks you to deliver a book: Fire on the flame door in the 3rd District, meet Merlin and the Fairy Godmother | 3rd District → Mystical House | Cid after the Waterway | Merlin's scenes | to record |
| 8 | Go to Cid in the house in the 3rd District (Riku meets you on the way); open the 1st/3rd District door | 3rd District | Merlin's hint | Cid's talk; Warp-G | to record |
| 9 | Ring the bell above the Gizmo Shop three times; defeat the Opposite Armor | Gizmo Shop | after Cid's talk | the win; the Keyhole | AP: `progress[14]` ≥ 0x14 |
| 10 | After Hollow Bastion: talk to Kairi in the Secret Waterway (the Navi-Gummi behind the mural) | Secret Waterway | return after Hollow Bastion | Kairi's charm | AP: `progress[0]` ≥ 0x8C |

## How checkpoints get recorded

Play with the bridge running and log `progress_pre`, `progress`, the inventory and the room as they change
(the scratch `watch_story.py` does this over adb). Each change marks a story moment; match it to the objective it
started or finished, then add it here and to `guide.js` with a test.
