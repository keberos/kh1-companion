# Chest needs: sources

What `companion/chestneeds.js` is built on: what a chest needs before you can reach or open it, cross-checked
across walkthroughs (read 2026-10-25). The chest sheet names these needs only when the player lacks them.

## Rule

- A need is kept only when **2 or more walkthroughs state it outright for that chest** (the ability is how
  they reach or open it) and **none gives another way**. "Come back later", a need named for the room or
  path, or an ability implied by the order of play counts as unstated.
- Where the guides are silent the chest gets nothing. Where they disagree, or only one guide says something, the
  chest gets a `note` instead of a need: never a lock, just what the guides say, shown in the chest's sheet when
  "What unlocks them" is on. Where an ability helps but a harder way works without it, the note says so.
- The Archipelago randomizer rules (the `q` field in `data.js`) are not a source.

**Result: 55 confirmed, 21 disputed, 156 unstated** (of 232 chests). 37 chests carry a note: the 21 disputed,
five confirmed ones where a guide adds or drops an ability, seven where only one guide says something, and the
Giant Crevasse.

## Sources

| Key | Walkthrough |
|---|---|
| KW | KH Wiki, Walkthrough:Kingdom Hearts (khwiki.com), one page per world |
| ES | ElectroSpecter, Guide and Walkthrough v2.0, GameFAQs 19404 |
| KC | KingContributor, Guide and Walkthrough vFINAL, GameFAQs 53583 |
| WP | winnie_the_poop & MTincher, Guide and Walkthrough v1.0, GameFAQs 33728 |
| SS | Spirit_Slash3r, Guide and Walkthrough v1.9, GameFAQs 34818 |
| CC | CChan, FAQ/Walkthrough (Final Mix) v2.1e, GameFAQs 19799 |
| EP | EmPleh, Trinity Mark FAQ v1.01, GameFAQs 33497 |
| LK | Lemlei & Kngdmhrtsgmr, 100 Acre Wood FAQ v2.60, GameFAQs 36082 |
| IGN | IGN wiki guide, Kingdom Hearts walkthrough |

GameFAQs guides are under `ps2/516587-kingdom-hearts/faqs/<id>`. Most were written for the original game; a
chest is matched to its Final Mix name by world, room and description, never by contents alone, since Final
Mix changed some contents.

## Confirmed

| World | Chest | Needs | Sources |
|---|---|---|---|
| Traverse Town | 1st District Blue Trinity Balcony | Blue Trinity | KW ES KC WP |
| Traverse Town | 1st District Candle Puzzle | Blizzard | KW ES KC SS |
| Traverse Town | Alleyway Behind Crates | Red Trinity | KW ES KC WP CC |
| Traverse Town | Item Workshop Left | Green Trinity | KW ES KC WP IGN |
| Traverse Town | Mystical House Glide | Glide | KW ES KC CC |
| Traverse Town | Mystical House Yellow Trinity | Yellow Trinity | ES EP |
| Traverse Town | Secret Waterway Near Stairs | Red Trinity | ES KC WP |
| Traverse Town | Secret Waterway White Trinity | White Trinity | KW ES SS |
| Wonderland | Bizarre Room Green Trinity | Green Trinity | KW ES |
| Wonderland | Rabbit Hole Green Trinity | Green Trinity | KW ES |
| Wonderland | Lotus Forest Glide | Glide | KW ES |
| Wonderland | Lotus Forest Thunder Plant | Thunder | KW ES |
| Wonderland | Lotus Forest Through the Painting White Trinity | White Trinity | KW ES SS |
| Wonderland | Tea Party Garden Above Lotus Forest Entrance 1st | Glide | ES KC WP CC |
| Wonderland | Tea Party Garden Across From Bizarre Room Entrance | Glide | KW ES |
| Olympus Coliseum | Coliseum Gates Blizzaga | Blizzaga | ES CC |
| Olympus Coliseum | Coliseum Gates Left Blue Trinity | Blue Trinity | KW ES |
| Olympus Coliseum | Coliseum Gates Right Blue Trinity | Blue Trinity | KW ES KC WP CC |
| Olympus Coliseum | Coliseum Gates White Trinity | White Trinity | KW ES SS |
| Deep Jungle | Camp Blue Trinity | Blue Trinity | KW ES KC WP CC |
| Deep Jungle | Climbing Trees Blue Trinity | Blue Trinity | KW ES KC WP CC |
| Deep Jungle | Cavern of Hearts White Trinity | White Trinity | ES SS |
| Deep Jungle | Tree House Suspended Boat | Glide | KW ES |
| Agrabah | Cave of Wonders Entrance White Trinity | White Trinity | ES WP SS CC |
| Agrabah | Cave of Wonders Silent Chamber Blue Trinity | Blue Trinity | KW WP EP |
| Agrabah | Palace Gates High Close to Palace | High Jump | ES KC |
| Agrabah | Palace Gates High Opposite Palace | High Jump + Glide | ES KC WP |
| Agrabah | Storage Green Trinity | Green Trinity | KW ES |
| Monstro | Mouth Green Trinity Top of Boat | Green Trinity + High Jump | KW SS |
| Monstro | Mouth High Platform Across from Boat | High Jump | ES KC WP |
| Monstro | Mouth High Platform Near Teeth | High Jump | KC SS |
| Monstro | Mouth Near Ship | High Jump | KC IGN |
| Monstro | Chamber 6 White Trinity | White Trinity | KW ES SS |
| Atlantica | Triton's Palace White Trinity | White Trinity | ES SS |
| Halloween Town | Guillotine Square Pumpkin Structure Left | Glide | ES WP |
| Halloween Town | Guillotine Square Pumpkin Structure Right | Glide | ES WP CC IGN |
| Halloween Town | Moonlight Hill White Trinity | White Trinity | ES SS |
| Halloween Town | Oogie's Manor Grounds Red Trinity | Red Trinity | KW CC |
| Neverland | Captain's Cabin | Green Trinity | KW ES |
| Neverland | Hold Yellow Trinity Green | Yellow Trinity | ES KC WP CC EP |
| Neverland | Hold Yellow Trinity Left Blue | Yellow Trinity | ES KC EP |
| Neverland | Hold Yellow Trinity Right Blue | Yellow Trinity | ES KC EP |
| Neverland | Pirate Ship Deck White Trinity | White Trinity | ES SS EP |
| Hollow Bastion | Rising Falls High Platform | Glide | KW ES KC WP SS |
| Hollow Bastion | Rising Falls White Trinity | White Trinity | KW ES WP SS |
| Hollow Bastion | Castle Gates Freestanding Pillar | Glide | KW ES WP SS |
| Hollow Bastion | Castle Gates High Pillar | Glide | KW ES WP SS |
| Hollow Bastion | Castle Gates Gravity | Gravity | KW ES KC WP SS CC IGN |
| Hollow Bastion | High Tower 1st Gravity | Gravity | KW ES KC WP SS |
| Hollow Bastion | High Tower 2nd Gravity | Gravity | KW ES KC WP SS CC |
| Hollow Bastion | Library Top of Bookshelf | Glide | KW KC WP |
| Hollow Bastion | Lift Stop Heartless Sigil Door Gravity | Gravity | KW ES KC WP SS |
| Hollow Bastion | Lift Stop Library Node Gravity | Gravity | ES KC WP |
| Hollow Bastion | Lift Stop Outside Library Gravity | Gravity | ES WP SS |
| Hollow Bastion | Lift Stop Under High Tower Sliding Blocks | Glide + Gravity | KW ES WP |

The Lift Stop gravity chests are matched by where the guides put them (entering from the Library, top of that
lift, past the emblem door). Every guide that describes a Lift Stop floating chest says Gravity lowers it.

## Disputed (noted, not a lock)

| World | Chest | What the guides say |
|---|---|---|
| Wonderland | Queen's Castle Hedge Right Blue (Final Mix's Dalmatians chest) | FD, GG, TR: through the doorway behind the Lotus Forest's boulder, no ability. KC's High Jump and ES and CC's pot route are for the original 58–60 chest, which Final Mix made a Meteor-G. Which red hedge chest that is isn't settled, so it carries no note. |
| Wonderland | Tea Party Garden Bear and Clock Puzzle (balcony) | KW: Glide. ES: from the Bizarre Room exit, no ability. |
| Deep Jungle | Hippo's Lagoon Left, Right | KW: jump and glide. ES (both) and KC (Left): by jumping; ES: Glide only makes it easier. |
| Agrabah | Cave of Wonders Entrance Tall Tower (Dalmatians 49–51) | ES, KC, CC: Glide. WP: a barrel launches you there. |
| Agrabah | Cave of Wonders Hidden Room Left, Right | EP: Yellow Trinity. ES: High Jump to the ledge instead; the Trinity isn't needed. |
| Monstro | Chamber 3, Dalmatians 55–57 | KC: High Jump + Glide; CC: High Jump. ES, WP: by the route from Chamber 6. |
| Monstro | Chamber 3 Platform Above Chamber 2 Entrance (Dalmatians 76–78) | KC: Glide. ES, WP, CC: jump from a barrel. |
| Monstro | Chamber 5 Atop Barrel (Dalmatians 79–81) | KC: Glide; CC: High Jump. ES: up the ledges with a barrel. |
| Monstro | Chamber 6 Platform Near Chamber 5 Entrance (Torn Page) | KC: High Jump + Glide; CC: Glide. ES, LK: throw a barrel onto the step; LK: not required. |
| Atlantica | Ursula's Lair Use Fire on Urchin | ES, SS: Fire. KW: keep attacking it. |
| Halloween Town | Bridge Left of Gate, Right of Gate | KC: glide, "easier than climbing". ES: jump from a ledge. |
| Halloween Town | Oogie's Manor Lower, Upper Iron Cage | KC: Glide. ES: from the roof of the mouth / a walkway. |
| Neverland | Hold Flight 1st, 2nd | SS: Glide. WP, CC, IGN: Neverland's flight. |
| Hollow Bastion | Rising Falls Floating Platform Near Bubble, Near Save | ES, KC, SS, WP: Glide. KW: freeze the bubbles with Blizzard. |
| 100 Acre Wood | Bouncing Spot Left Cliff | KW: Tigger's seesaw. KC: Glide from the tree. |

Also disputed, on chests confirmed above: Glide for Palace Gates High Close to Palace (KC yes, ES no) and
High Jump for the Guillotine Square pumpkin (WP yes, ES climbs a ledge).

Confirmed by 2+ guides but not matched to a Final Mix chest, so not a lock: in the Giant Crevasse, the
Haste2-G chest (KW ES SS) and the Haste-G chest (KW ES) need Glide (all five Crevasse chests note that guides
glide to most of them); in Hollow Bastion's Base Level, the second Tornado-G chest needs Glide (ES KC WP).

Only one guide (noted): Agrabah Main Street High Above Palace Gates Entrance (High Jump, ES), Coliseum Gates
Blizzara (Blizzara on the torches, ES), Lotus Forest Through the Painting Thunder Plant (Thunder, KW), Item
Workshop Right (Green Trinity, KW), Monstro Mouth High Platform Boat Side (High Jump, KC), Accessory Shop Roof
(push a crate and climb, ES), Pirate Ship Crows Nest (fly up from the deck, ES).

## Compared with Archipelago's rules

The randomizer logic agrees with the guides on 35 of the 55 confirmed chests. Where they differ:

- **Guides add a need**: Traverse Town Secret Waterway Near Stairs (Red Trinity: the only way in); Hollow
  Bastion Castle Gates Freestanding Pillar, High Pillar and Library Top of Bookshelf (Glide); Agrabah Palace
  Gates High Opposite Palace (Glide as well as High Jump); Monstro Mouth High Platform Near Teeth (High Jump).
- **Guides need less**: Palace Gates High Close to Palace (High Jump; Glide disputed); the Guillotine Square
  pumpkin chests (Glide; High Jump disputed); Traverse Town 1st District Blue Trinity Balcony (no Glide);
  Mystical House chests (no Fire). Story items Archipelago adds (Slides, Footprints, Forget-Me-Not,
  Jack-In-The-Box, Green Trinity for Neverland's deck) belong to room access, which stays hidden.
- **Archipelago allows another way the guides don't**: Rising Falls High Platform (Blizzard or Glide; guides:
  Glide); Monstro Mouth Near Ship (High Jump or Glide; guides: High Jump).
- **Archipelago needs something no guide states**: e.g. 100 Acre Wood Bouncing Spot Left Cliff and Right
  Tree Alcove (High Jump + Glide; KW: Tigger launches you), Traverse Town Accessory Shop Roof (High Jump; ES:
  push a crate over and climb), Geppetto's House and Deep Jungle Tree House Rooftop (High Jump), Olympus
  Coliseum Blizzara chest and Item Workshop Right (only one guide each), and the Monstro, Halloween Town and
  Giant Crevasse chests listed above.

## When a chest opens up

`when` in `companion/chestneeds.js` (read 2026-10-25). A chest row says *After <event>* or *Later visit*, and
its sheet gives the sentence. Chests with nothing recorded keep the line "Some chests only open up later in
this world or on a return visit". The page never says a chest is available now, and never says when a return
visit becomes possible.

### Rule

- **later**: 2+ walkthroughs say outright that the chest, or the only way to it, opens after an event on the
  first visit ("after the first bossfight", "the boulder has moved, giving access to...", "Availability: after
  defeating the Cards and Tower"). The order a guide happens to collect things in doesn't count.
- **return**: 2+ walkthroughs put the chest on a later trip to the world (a "When you return" / "World Revisit"
  / "Collectibles" section, "come back after...", "available after <event in another world>"), and none
  gets it on the first visit.
- A guide that gets the chest earlier than that cancels it. So do return claims that rest only on Thunder,
  Blizzard or the Red Trinity in Wonderland, Olympus Coliseum or Deep Jungle: those three worlds can be
  played in any order, so you may already have the spell.
- Events are named by what happens, not who: "the first boss fight here", "the fight in the Evil Playroom".

**Result: 19 later, 49 return, 164 nothing recorded** (of 232 chests).

### Sources added for timing

| Key | Walkthrough |
|---|---|
| FD | Kingdom Hearts Wiki (Fandom): "Kingdom Hearts item locations" and the per-world walkthroughs. Notes per chest, e.g. "Only available after presenting the evidence" |
| GG | GamerGuides, Kingdom Hearts Final Mix (HD 1.5 ReMIX) walkthrough, including its World Revisit pages |
| TR | TrueTrophies, Kingdom Hearts Final Mix walkthrough, including each world's Collectibles section |

The eight sources above were reread for timing too. ES's Dalmatian and Trinity tables give an "Availability"
per chest. KW has "When you Return" / "Second Visit" sections, and CC's Dalmatian list has "come back after"
notes. GG, TR and FD are written for Final Mix, so they settle which chest is which where Final Mix moved
contents.

### Later in the visit

| World | Chest | After | Sources |
|---|---|---|---|
| Wonderland | Rabbit Hole Defeat Heartless 2 | the trial | FD ES GG |
| Wonderland | Queen's Castle Hedge Left Red, Right Red | the trial | FD ES KW TR |
| Wonderland | Queen's Castle Hedge Right Blue | the trial | FD ES |
| Wonderland | Bizarre Room Lamp | the trial | KW FD |
| Wonderland | Tea Party Garden Bear and Clock Puzzle | the trial | FD TR KW |
| Wonderland | Lotus Forest Thunder Plant | the trial | FD ES |
| Wonderland | Lotus Forest Through the Painting Thunder Plant | the trial | FD KW |
| Monstro | Mouth Boat Deck, Near Ship, High Platform Boat Side, Near Teeth, Across from Boat | the first boss fight here | FD TR (+ ES KW, ES CC) |
| Atlantica | Ursula's Lair Use Fire on Urchin | the first fight in Ursula's Lair | FD KW GG ES SS |
| Halloween Town | Oogie's Manor Hollow | the fight in the Evil Playroom | FD TR |
| Halloween Town | Oogie's Manor Lower Iron Cage | the fight in the Evil Playroom | FD TR ES |
| Neverland | Captain's Cabin | the fight in the Captain's Cabin | FD ES |
| Neverland | Clock Tower | the fight on the ship's deck | ES KW |
| 100 Acre Wood | Bouncing Spot Under Giant Pot | Tigger's Giant Pot | FD KW |

The hedge chests: GG, TR and FD agree that Final Mix's hedge chests hold Dalmatians (reached from the area
behind the boulder), a Meteor-G (through the pot) and a Thundara-G (through the latch on the ceiling of the
Bizarre Room). All three routes open after the trial. Which red chest is the pot one and which is the latch
one isn't settled, so both red chests list the sources for both. KW collects one of them on its return
visit, which doesn't conflict: that is after the trial too.

### Return visit

| World | Chests | Sources |
|---|---|---|
| Traverse Town | 1st District Candle Puzzle | ES GG TR KW FD |
| Traverse Town | Alleyway Behind Crates; Secret Waterway Near Stairs | KW GG TR ES |
| Traverse Town | Geppetto's House | ES GG KW TR FD |
| Traverse Town | Item Workshop Left, Right | KW GG ES TR |
| Traverse Town | Mystical House Glide | ES GG KW TR CC |
| Traverse Town | Mystical House Yellow Trinity | GG TR ES |
| Traverse Town | Secret Waterway White Trinity | KW GG TR ES |
| Wonderland | Rabbit Hole Defeat Heartless 3 | FD ES |
| Wonderland | Rabbit Hole Green Trinity; Bizarre Room Green Trinity | KW ES GG TR |
| Wonderland | Lotus Forest Glide; Tea Party Garden Above Lotus Forest Entrance 1st, 2nd; Across From Bizarre Room Entrance | ES GG KW TR |
| Wonderland | Lotus Forest Through the Painting White Trinity | KW GG ES |
| Olympus Coliseum | Coliseum Gates Blizzara | ES GG TR |
| Olympus Coliseum | Coliseum Gates Blizzaga | ES TR |
| Olympus Coliseum | Coliseum Gates White Trinity | KW GG ES |
| Deep Jungle | Cavern of Hearts White Trinity | KW GG ES |
| Agrabah | Storage Green Trinity | ES TR IGN |
| Agrabah | Cave of Wonders Entrance White Trinity | GG TR ES |
| Agrabah | Cave of Wonders Entrance Tall Tower; Hidden Room Left, Right | ES GG TR |
| Agrabah | Palace Gates High Close to Palace, High Opposite Palace; Main Street High Above Palace Gates Entrance | ES GG |
| Monstro | Chamber 6 White Trinity | KW GG TR ES |
| Atlantica | Triton's Palace White Trinity | KW GG ES |
| Halloween Town | Cemetery Behind Grave, Between Graves, By Cat Shape, By Striped Grave | FD KW TR GG ES |
| Halloween Town | Guillotine Square Pumpkin Structure Left, Right | ES GG |
| Halloween Town | Moonlight Hill White Trinity | GG ES |
| Neverland | Hold Flight 1st, 2nd; Hold Yellow Trinity Green, Left Blue, Right Blue | ES GG TR |
| Neverland | Pirate Ship Crows Nest | ES GG TR KW |
| Neverland | Pirate Ship Deck White Trinity | GG TR ES |
| Hollow Bastion | Grand Hall Left of Gate | KW GG ES CC FD |
| Hollow Bastion | Grand Hall Oblivion, Steps Right Side | KW GG FD |
| Hollow Bastion | Rising Falls Under Water 2nd | GG FD |

### Disagreements and single sources (nothing recorded)

- Rabbit Hole Defeat Heartless 1: FD only. It says the chest is there only *before* the trial, so it can be
  missed.
- Traverse Town Blue Trinity Balcony, 2nd District Boots and Shoes Awning, Gizmo Shop Facade and the three
  Alleyway chests: KW gets them on later visits, but GG, TR and ES get them on the first.
- Traverse Town 2nd District Rooftop (ladder after the Guard Armor), Green Room Table (after the fight with
  Leon), Agrabah Alley (after meeting Jafar there), Palace Gates Low (after the Pot Centipede), Hollow Bastion
  Entrance Hall Left of Emblem Door, Neverland Cabin (after the Captain's Cabin fight): FD only.
- Wonderland Lotus Forest Thunder Plant chests: KW, ES and TR get them on a return visit because they need
  Thunder, which you may already have. They are recorded as *after the trial*, which every guide agrees with.
- Deep Jungle Tree House Suspended Boat: ES, GG and KW come back with Glide, but FD reaches it on the first
  visit with mid-air attacks.
- Agrabah Plaza Top Corner: TR puts it on a return visit; FD and KW get it on the first.
- Monstro chambers (Chamber 2 Platform, Chamber 5 Platform and Atop Barrel, Chamber 6 platforms, Chamber 3
  ledges): KW and TR put them on a return visit; GG, ES and FD reach them on the first with barrels.
  Mouth Green Trinity Top of Boat: TR puts it on a return visit; KW gets it right after the first boss.
- Halloween Town Guillotine Square High Tower: ES and GG come back for it; TR got it on the first visit.
  Oogie's Manor Upper Iron Cage: TR gets it after the Evil Playroom fight; FD, GG and ES get it before. Oogie's
  Manor Grounds Red Trinity: TR on a return; ES on the first.
- Hollow Bastion Rising Falls White Trinity: KW and GG on the second visit; ES says it's available after the
  first fight with Riku, on the first visit. Lift Stop Library Node After High Tower Switch: GG on the second
  visit; FD on the first.

## First visit, nothing needed

`first` in `companion/chestneeds.js` (read 2026-10-28). It covers every chest that had no entry before this
pass. These chests get the **Now** tag, and their sheet says "The walkthroughs get this one on the first visit,
with nothing special." Each chest now carries exactly one tag:
- **Now**: a `first` entry, or a confirmed need the player has.
- **Later**: a need the player lacks, or a `when`.
- **None** ("not sure"): no entry, or only a note.

### Rule

- 2+ walkthroughs get the chest on the first visit with no ability, spell or Trinity beyond what the story
  hands you by then. None of them names a need, an event it waits on, or says it "can now be reached" later.
- A guide that collects it on a later visit without saying why doesn't count against it. A guide that says
  it couldn't be reached earlier, or reaches it a different way (Glide against a plain jump), does: the
  chest stays unsure.
- A single guide naming an event (e.g. Fandom's "Available after encountering Jafar in the Alley") is enough
  to leave a chest unsure. One event with two sources became a `when`: Traverse Town Green Room Table, after
  talking to Yuffie (FD; ES: "you need her advice to open the chest").
- Some first-visit chests sit in rooms the story opens partway through a world, such as the Waterfall Cavern,
  the Cave of Wonders and the End of the World. They still count: nothing beyond the story is needed.

**Result: 103 first, 1 new later, 22 still unsure** (plus 17 chests with only a note, which also stay
unsure). Across all 232 chests: 103 first-visit, 21 with a confirmed need and no timing (Now or Later,
depending on what the player has), 69 with a timing, 39 unsure.

### Sources per world

| World | First-visit chests | Sources |
|---|---|---|
| Destiny Islands, Awakening | the one chest each | GG TR FD; ES SS |
| Traverse Town | Accessory Shop; 2nd District Boots and Shoes Awning, Gizmo Shop Facade; Alleyway Balcony, Blue Room Awning, Corner; Green Room Clock Puzzle; Red Room | GG TR FD ES KW (2+ each) |
| Wonderland | Lotus Forest Corner, Nut | GG FD ES (+TR) |
| Olympus Coliseum | Coliseum Gates Left Behind Columns | TR FD ES KC |
| Deep Jungle | all 13 left: Cliff, Hippo's Lagoon Center, Tent, Tree House Beneath and Rooftop, Tunnel, Vines, Vines 2, Waterfall Cavern ×4 | GG FD (+TR ES) |
| Agrabah | 21: Plaza By Storage and Raised Terrace, Storage Behind Barrel, Main Street Right Palace Entrance and High Above Alley Entrance, Aladdin's House ×2, Cave of Wonders Entrance Left, Hall ×2, Bottomless Hall Across Chasm and Raised Platform, Treasure Room ×4, Dark Chamber ×4, Relic Chamber Stairs | GG FD (+TR ES) |
| Monstro | Chamber 2 Ground, Platform; Chamber 3 Ground, Near Chamber 6 Entrance; Chamber 5 Low 1st, 2nd; Chamber 6 Low | GG TR FD (+KW) |
| Atlantica | Ariel's Grotto ×3; Sunken Ship ×3 | GG TR FD |
| Halloween Town | Under Jack's House Stairs, Bridge Under Bridge, Oogie's Manor Entrance Steps and Inside Entrance | GG TR FD |
| Neverland | Galley | GG TR KW FD |
| Hollow Bastion | 16: Rising Falls Water's Surface and Under Water 1st, Base Level ×2, Waterway ×3, Dungeon ×2, Entrance Hall Push the Statue, Library carousels ×3, Great Crest ×2, High Tower Above Sliding Blocks | GG TR FD |
| End of the World | all 21 left: Final Dimension ×10, World Terminus ×10, Final Rest | GG TR KW FD |
| 100 Acre Wood | Meadow Inside Log | TR LK FD |

### Still unsure (no entry)

- **Traverse Town 2nd District Rooftop**: Fandom says the ladder works only after the Guard Armor fight; TR says it was "fixed" by the second visit.
- **Wonderland Rabbit Hole Defeat Heartless 1**: Fandom only. It says the chest is there only before the trial.
- **Agrabah Alley** (after meeting Jafar there) and **Palace Gates Low** (after the Pot Centipede): Fandom names an event.
- **Agrabah Bazaar Across Windows and High Corner**: TR says the Bazaar door is "now open" after a scene.
- **Agrabah Plaza Top Corner**: TR says it "can now reach" it on a return visit.
- **Agrabah Relic Chamber Jump from Stairs**: TR says it isn't reachable at first; GG and Fandom say you push a block down first.
- **Agrabah Bottomless Hall Pillar**: GG makes a hard jump; TR glides.
- **Atlantica Undersea Gorge Jammed**: TR says the way opens after the shark.
- **Halloween Town Boneyard Tombstone Puzzle**: it waits on the story (the Mayor's puzzle).
- **Halloween Town Guillotine Square High Tower**: TR jumps; Fandom uses High Jump; GG and ES come back with Glide.
- **Monstro Chamber 3 Platform Near Chamber 6 Entrance, Chamber 5 Platform, Chamber 6 Other Platform and Raised Area**: GG, TR and Fandom use barrels or jumps; KW comes back "since you have abilities", and TR glides to the Chamber 5 one.
- **Neverland Cabin**: Fandom only (after the Captain's Cabin fight).
- **Hollow Bastion Base Level Platform Near Entrance**: GG glides; TR and Fandom jump. ES, KC and WP say Glide for the original game's chest here.
- **Hollow Bastion Entrance Hall Left of Emblem Door**: Fandom: after the boss fight.
- **Hollow Bastion Library Top of Bookshelf Turn the Carousel**: reached from the Glide chest beside it; GG jumps.
- **Hollow Bastion Lift Stop Library Node After High Tower Switch**: GG and TR on the second visit; Fandom on the first.
- **100 Acre Wood Bouncing Spot Right Tree Alcove**: KW glides; Fandom uses Roo's seesaw.
