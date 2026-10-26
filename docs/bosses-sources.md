# Bosses: sources

What `companion/bosses.js` is built on (read 2026-10-25).

## The lists

Each world's story bosses are in the order the walkthroughs meet them, across every visit (KW and GG agree on
the order; FD and KW on which visit). Fights the walkthroughs call skippable are optional (the Shark), with the
cups and superbosses. Left out: the island sparring matches and End of the World's Behemoths (regular Heartless
there, per GG and TR).

**35 story bosses, 9 optional.**

## Tips

A tip is kept only where **2 or more walkthroughs say it** for that fight. Each tip lists its sources. Where
fewer agree, the boss gets fewer tips; Unknown gets none (only CC covers it).

| Key | Walkthrough |
|---|---|
| KW | KH Wiki, Walkthrough:Kingdom Hearts (khwiki.com), boss boxes |
| GG | GamerGuides, Kingdom Hearts Final Mix walkthrough |
| IGN | IGN wiki guide, Kingdom Hearts walkthrough |
| TR | TrueTrophies, Kingdom Hearts Final Mix walkthrough |
| FD | Fandom KH wiki, per-visit walkthroughs |
| ES | ElectroSpecter, Guide and Walkthrough v2.0, GameFAQs 19404 |
| KC | KingContributor, Guide and Walkthrough vFINAL, GameFAQs 53583 |
| SS | Spirit_Slash3r, Guide and Walkthrough v1.9, GameFAQs 34818 |
| CC | CChan, FAQ/Walkthrough (Final Mix) v2.1e, GameFAQs 19799 |

## Beaten

A boss ticks only on save evidence, never on where you are:

- **Story counter**: the Archipelago KH1 PC client's own thresholds for its "Defeat X" checks
  (`1fmAPConnector.lua`, `define_world_progress_location_threshholds`; `1fmAPEotWDoor.lua` for the Phantom at
  0x96). Its world `n` is our `progress[n-1]`; its extra Traverse Town byte is `progress[14]`.
- **Ansem's Reports** the fight hands over (Archipelago `Locations.py`): 1 Genie Jafar, 3 giant Ursula,
  5 Maleficent, 7 Oogie Boogie, 8 Hades, 9 Hook, 11 Kurt Zisa, 12 Sephiroth, 13 Unknown.
- **Rewards** only one fight gives first: Blue Trinity and Fire (Guard Armor), Aero (Opposite Armor),
  Stop (Parasite Cage II), White Trinity (Riku), Yellow Trinity (Hercules Cup). The spell and Trinity bytes
  aren't confirmed in play yet. Not used: Blizzard and Cure (another fight also gives a level), Gravity (a cup
  also does), and equipment (equipping it leaves the bag).
- The Dive's and the islands' Darkside: once that part is over (the same test the story guide uses).
- A story boss beaten puts the story bosses before it in that world behind you too.

No signal of their own (ticked only by a later boss): Leon, Card Soldiers, Cloud, the Cave of Wonders
Guardian, Lock, Shock and Barrel. Never ticked (nothing in the save): the Shark, Rock Titan, Ice Titan, and
End of the World after Chernabog. Genie Jafar ticks from 0x5A (the Archipelago value), a little after the fight.
