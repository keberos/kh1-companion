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
| Wonderland | Queen's Castle Hedge Right Blue (Dalmatians 58–60) | KC: High Jump. ES, CC: through the pot in the Bizarre Room, no ability. |
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
