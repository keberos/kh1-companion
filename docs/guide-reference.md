# Guide reference

What the in-app Guide (`companion/guide.js`) is built on. Every story step starts and ends on a value of the game's
own story counters, as documented in the **RetroAchievements code notes for Kingdom Hearts: Final Mix**
(retroachievements.org/codenotes.php?g=2780, read 2026-10-25). Those notes are for the PS2 release; the counters
hold the same values on PC (the Archipelago KH1 client's thresholds come from the same notes, and our recordings on
the Thor match). The walkthrough detail in the hints is our own summary of the
[KH Wiki's KH1 walkthroughs](https://www.khwiki.com/Walkthrough:Kingdom_Hearts).

## Rules

- **A step shows only once the game hands it out** (`from`), and **never during a cutscene**: a newly unlocked step
  waits for the HUD (`in_field`). Between objectives the Guide says there's nothing to do right now.
- **Next steps are breadcrumbs**: only what to do next, never what happens after. Detail lives in "Show me".
- **No step without a save test.** Where the game records nothing (e.g. finishing Riku's race), there's no step:
  the game moves you along itself.

## The counters

Each counter only goes up. A code note "A–B event" means the counter moves from A to B when that event happens, so
"done once the counter reaches B".

| Bridge field | PS2 address (notes) | What |
|---|---|---|
| `progress_pre[0]` | 0x3f9880 | Gummi routes |
| `progress_pre[1]` | 0x3f9881 | Dive to the Heart |
| `progress_pre[2]` | 0x3f9882 | Destiny Islands |
| `progress_pre[3]` | 0x3f9883 | Disney Castle scenes (they play between the island days) |
| `progress[0]` | 0x3f9884 | Traverse Town |
| `progress[1]`–`[6]` | 0x3f9885–8a | Deep Jungle, Olympus, Wonderland, Agrabah, Monstro, Atlantica |
| `progress[8]`–`[11]` | 0x3f988c–8f | Halloween Town, Neverland, Hollow Bastion, End of the World |
| `progress[14]` | 0x3f9892 | Traverse Town's bell and Keyhole |

On PC (Steam) `progress` starts at 0x2DEA864 and `progress_pre` 4 bytes before it.

## Story values used

**Destiny Islands** (`pre[2]`; early values recorded on the Thor): 01 day one · 04 supplies handed to Kairi (they leave the bag, so this byte is the only sign they were gathered) ·
07 called it a day · 0A met Riku in the Cove (the race follows, unrecorded) · 14 Kairi's food list · 17 food handed
over · 1E the storm · 24 Riku's scene, the Keyblade. `pre[3]` moves 0→1 with the Disney Castle scene between days.

**Traverse Town** (`p0`): 2B Guard Armor · 31 regrouped · 3E Leon in the Secret Waterway · 42 traded Cid the gummi
piece for the book · 46 book delivered · 4A Riku scene · 4E Cid at his house · 5C Neverland's Navi-G to Cid ·
64 Transform-G · 6E back after Hollow Bastion · 78 Cid on the Secret Waterway Navi-G · 8C Oathkeeper · 96 Cid
installs it. `p14`: 0A Opposite Armor beaten · 14 Keyhole sealed.

**Deep Jungle** (`p1`): 14 control after Tarzan · 17 reunited in the tent · 1A all slides · 20 slideshow · 23 the
gorillas · 28 Tree House scene · 2B back at camp · 32/35 Heartless cleared, back in the tent · 37 talked to Jane ·
3C/3F/42 Sabor · 44 Jane taken · 47 Jane freed · 50/53/56 Clayton · 5C waterfall cavern · 6E Keyhole, Red Trinity.

**Olympus** (`p2`): 04 talked to Phil twice · 0A barrels · 0D Thunder · 10 Entry Pass · 13 signed up · 16/19
prelims · 1C/22 Cloud · 25 Cerberus · 28 Hero's License.

**Wonderland** (`p3`): 04/07 the Doorknob · 0D the court · 11 evidence presented · 21 the cage tower, Alice taken ·
2B the Trickmaster fight starts · 2E beaten · 30 Keyhole.

**Agrabah** (`p4`): 17 the Carpet freed · 1E/24 Aladdin rescued · 27 Genie at Aladdin's House · 35 Pot Centipede ·
3C/3F the cave's guardian · 46 Maleficent · 49 Jafar · 50/53 Genie Jafar · 5A lamp · 5D escape · 64/6E scenes ·
78 Three Wishes, Green Trinity.

**Monstro** (`p5`): 14 Pinocchio · 17 Geppetto · 1A/1E Riku · 28 Pinocchio caught · 2B/2E Parasite Cage ·
32 water rising · 3C/3F Parasite Cage II · 46 scene.

**Atlantica** (`p6`): 0A Ariel joins · 14 King Triton · 1E Ariel's Grotto · 28 the shark · 32 Crystal Trident ·
3C Triton breaks it · 42/46 the trident stolen · 49 the switch · 50/53 Ursula · 5A/5D giant Ursula · 64 Keyhole.

**Halloween Town** (`p8`): 07 Jack · 0A/0F the heart, a missing ingredient · 12/1E the Graveyard, Forget-Me-Not ·
21/28 "surprise" needed · 2B/32 Jack-in-the-Box · 35 the heart stolen · 38/3F the chase · 46 the manor · 50/53 Lock,
Shock and Barrel · 5C/62 Oogie Boogie · 64 the manor · 6A Keyhole · 6E Pumpkinhead.

**Neverland** (`p9`): 0A/14 Anti-Sora made · 1E pixie dust · 28/32/35 Anti-Sora · 38 Peter leaves · 3C/3F flying ·
46/50/53 Hook · 56 Ars Arcanum · 5A/64 Keyhole · 6A/6E Tinker Bell, Glide. 96 the Phantom (Archipelago).

**Hollow Bastion** (`p10`): 0A/14 landing · 1E Riku takes the Keyblade · 28 the princesses · 32 White Trinity
(Riku beaten) · 46 Ansem possesses Riku · 50 Riku's new Keyblade · 5A Maleficent · 6E the dragon · 82 Sora a
Heartless · 8C/96/A0 back as Sora · AA second landing · B9 Behemoth · BE/C3 Final Keyhole.

**End of the World** (`p11`): 32 before Chernabog · 33 Superglide · 5A back on the islands · 64 Ansem's monologue ·
66 Ansem I · 6E Donald and Goofy taken · 93 Goofy's portal · 9B the World of Chaos's face.

Also in the notes and not used yet: a game-mode byte (cutscene, FMV, boss), per-chest and Trinity bit flags with
names, the 100 Acre Wood's progress, the Olympus cups, and event flags for Wonderland's evidence and Jane's slides.

## Checked on PC

The values above come from the PS2 notes. A step counts as checked once a real PC save or recording shows its
value; `companion/guide-checked.js` lists those, and the page marks every other step *unconfirmed* (with a note in
"Show me"). So far: the Dive and Destiny Islands.

To check more, export saves as you play and run

    node tools/check_saves.mjs <saves .zip>

It prints, for each save, where it is, which done steps its counters confirm, any counter value not in this page
(add it here), and the Guide's next nudge. If the nudge matches what you were doing, run it again with `--confirm`.
It never names a step you haven't done.

## Testing without playing

`tools/make_story_fixtures.mjs` plays the story forward from real saves through these values, in game order, and
writes a snapshot just before and just after every step (`tools/fixtures/story-points.json`); `tools/test_story.mjs`
checks each one and that no later save sends the Guide back. What it assumes the game does around the steps (scenes
that follow by themselves, key items leaving the bag) is listed in the generator's `AROUND` table.

A device remembers finished steps, so in live play nothing goes back. A save loaded on a new device has only the
save to go on, and two steps can show again there, since nothing in the save proves them:

- **Traverse Town, Look around town**, until the Guard Armor: it's done by walking into the Green Room, and no
  counter value before 2B is known.
- **Hollow Bastion, Solve the library**, between the emblem door and the chapel (50): the door takes the emblem
  pieces, and no counter marks it open. Two saves, either side of the door, would show what does.

End of the World's walking steps are done by being in their room or a later one, and the final door also by `p11`
reaching 5A (back on the islands).

## Missables

| What | Lost when |
|---|---|
| Everything on Destiny Islands | you go home on the second night |
| Neverland's Clock Tower chests | the Behemoth in Hollow Bastion is beaten |
| The Final Rest is the last save | you open the final door |
