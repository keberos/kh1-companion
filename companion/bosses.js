// Boss fights per world, for the Bosses card (docs/bosses-sources.md).
// story: in the order the walkthroughs meet them, across every visit. optional: cup fights and superbosses.
// tips: [text, sources]; a tip is kept only where 2+ walkthroughs say it (keys in the sources doc).
// beaten: save evidence that the fight is behind you, judged by KH1Logic.bossesFor():
//   {p, at} story counter p has reached `at` (the Archipelago PC client's threshold for that fight) ·
//   {has} its reward (see has()) · {report: n} the Ansem's Report it gives · {end} that part of the game is over ·
//   {any: [...]}. No `beaten`: only a later story boss in the same world shows it's behind you.
window.KH1_BOSSES = {
  "Awakening": {
    story: [
      { name: "Darkside", visit: "the end of the Dive", src: "KW GG TR", beaten: { end: "dive" },
        tips: [["Hit its hands, and its fist after it punches", "KW GG"], ["Outrun the homing orbs", "KW GG"],
          ["Losing is fine: the story goes on", "KW GG TR"]] },
    ],
  },
  "Destiny Islands": {
    story: [
      { name: "Darkside", visit: "the last night", src: "KW GG TR", beaten: { end: "islands" },
        tips: [["Climb its arm to hit the head", "GG TR"], ["This time you must win: use Potions", "KW GG TR"],
          ["Outrun the homing orbs", "KW GG"]] },
    ],
  },
  "Traverse Town": {
    story: [
      { name: "Leon", visit: "1st visit", src: "KW GG TR IGN",
        tips: [["Losing is fine: the story goes on", "KW GG IGN"], ["Dodge his fireball, or Guard it back", "KW GG"],
          ["Hit, then back off", "GG IGN"]] },
      { name: "Guard Armor", visit: "1st visit", src: "KW GG IGN", beaten: { any: [{ p: 0, at: 0x2B }, { has: "Blue Trinity" }, { has: "Progressive Fire" }] },
        tips: [["Break the hands first, then the feet", "KW GG IGN"], ["Finish the body once its limbs are gone", "KW GG IGN"]] },
      { name: "Opposite Armor", visit: "2nd visit", src: "KW GG TR FD", beaten: { any: [{ p: 14, at: 0x14 }, { has: "Progressive Aero" }] },
        tips: [["Hands first, then the feet, then the body", "KW GG"], ["Get clear of, or Guard, its charged beam", "GG TR"],
          ["Heal with Cure", "KW GG"]] },
    ],
  },
  "Wonderland": {
    story: [
      { name: "Card Soldiers and the tower", visit: "1st visit", src: "KW GG",
        tips: [["Thin out the cards first", "KW GG"], ["Break the cranks, then the tower", "KW GG"]] },
      { name: "Trickmaster", visit: "1st visit", src: "KW GG TR", beaten: { p: 3, at: 0x2E },
        tips: [["Hit its body from the chair or table", "GG TR"], ["Combo it when it collapses", "KW GG TR"],
          ["Lit batons hurt double: Dodge Roll the fire", "KW GG"]] },
    ],
  },
  "Olympus Coliseum": {
    story: [
      { name: "Cloud", visit: "1st visit", src: "KW GG TR IGN",
        tips: [["Losing is fine: the story goes on", "GG IGN"], ["Counter after his leaping strike", "GG IGN"],
          ["Dodge Roll his dashing slashes", "KW GG"]] },
      { name: "Cerberus", visit: "1st visit", src: "KW GG TR IGN", beaten: { p: 2, at: 0x25 },
        tips: [["Dodge Roll the fireballs", "KW GG TR IGN"], ["Keep moving when dark pillars rise", "KW GG TR IGN"],
          ["Jump on its back to hit the heads", "KW IGN"]] },
    ],
    optional: [
      { name: "Hercules", visit: "Hercules Cup", src: "KW ES KC SS", beaten: { has: "Yellow Trinity" },
        tips: [["Throw a barrel when he taunts to drop his glow", "KW ES KC SS"], ["You fight him alone", "ES KC"],
          ["Dodge his dash", "KW ES"]] },
      { name: "Hades", visit: "Hades Cup", src: "KW ES KC SS", beaten: { report: 8 },
        tips: [["Dodge Roll through his spinning flames", "KW KC SS"], ["Keep away from his flamethrower", "KW ES KC"]] },
      { name: "Rock Titan", visit: "Hades Cup", src: "KW ES KC SS",
        tips: [["Hit its feet until it falls, then the heads", "KW ES KC SS"], ["Jump its stomp's shockwave", "ES KC"]] },
      { name: "Ice Titan", visit: "Gold Match", src: "KW ES KC SS",
        tips: [["Guard the small icicles back at it", "KW ES KC SS"], ["Fight from the stands", "KW SS"],
          ["Keep moving when ice falls", "KW KC"]] },
      { name: "Sephiroth", visit: "Platinum Match", src: "KW ES KC", beaten: { report: 12 },
        tips: [["Keep Aero up", "KW KC"], ["Bring plenty of Potions and Ethers", "KW ES"]] },
    ],
  },
  "Deep Jungle": {
    story: [
      { name: "Sabor", visit: "1st visit, on arrival", src: "KW IGN", beaten: { p: 1, at: 0x0D },
        tips: [["Dodge the pounce, then combo", "KW IGN"]] },
      { name: "Sabor, again", visit: "1st visit, later", src: "GG TR IGN", beaten: { p: 1, at: 0x42 },
        tips: [["Lock on: Fire homes in", "GG TR"], ["Dodge the leaps, then combo", "GG IGN"]] },
      { name: "Clayton", visit: "1st visit", src: "KW GG TR", beaten: { p: 1, at: 0x56 },
        tips: [["Hit the invisible lizard until it shows", "GG TR"], ["Dodge its eye beams", "KW GG"],
          ["Beating Clayton ends the fight", "KW GG TR"]] },
    ],
  },
  "Agrabah": {
    story: [
      { name: "Pot Centipede", visit: "1st visit", src: "KW GG TR", beaten: { p: 4, at: 0x35 },
        tips: [["Hit whichever end isn't attacking", "KW GG"], ["Clear the Pot Spiders it calls", "KW GG"]] },
      { name: "Cave of Wonders Guardian", visit: "1st visit", src: "KW GG",
        tips: [["Hit its eyes", "KW GG"], ["Aero stops the thrown blades", "KW GG"]] },
      { name: "Jafar", visit: "1st visit", src: "KW TR IGN", beaten: { p: 4, at: 0x49 },
        tips: [["Chase him to each platform", "TR IGN"], ["Keep moving to dodge his beam", "KW TR IGN"],
          ["Genie's punches are slow: just avoid them", "KW IGN"]] },
      { name: "Genie Jafar", visit: "1st visit", src: "KW GG", beaten: { any: [{ p: 4, at: 0x5A }, { report: 1 }] },
        tips: [["Go after Iago and the lamp", "KW GG"], ["His fireballs are easy to dodge or block", "KW GG"]] },
    ],
    optional: [
      { name: "Kurt Zisa", visit: "the Desert", src: "KW ES KC", beaten: { report: 11 },
        tips: [["Cast Aero at once: it seals your magic", "ES KC"], ["Break the orbs in its hands", "ES KC"],
          ["Combo its head when it falls", "ES KC"]] },
    ],
  },
  "Monstro": {
    story: [
      { name: "Parasite Cage", visit: "1st visit", src: "KW GG ES KC CC", beaten: { p: 5, at: 0x2E },
        tips: [["Magic from range, then close in", "GG ES CC"], ["Dodge or Guard its flailing arms", "KW KC"]] },
      { name: "Parasite Cage, again", visit: "1st visit", src: "KW ES KC SS CC", beaten: { any: [{ p: 5, at: 0x46 }, { has: "Progressive Stop" }] },
        tips: [["Stay out of the acid", "KW SS TR"], ["Hit the orb when its mouth opens", "KW ES KC"],
          ["Avoid its poison spit", "KW ES KC CC"]] },
    ],
  },
  "Atlantica": {
    story: [
      { name: "Ursula", visit: "1st visit", src: "KW GG TR IGN", beaten: { p: 6, at: 0x53 },
        tips: [["Magic into her cauldron until it bursts", "KW GG TR IGN"], ["Strike while she's stunned", "KW GG TR IGN"],
          ["Hit Flotsam and Jetsam for MP", "KW GG IGN"]] },
      { name: "Giant Ursula", visit: "1st visit", src: "KW TR IGN", beaten: { any: [{ p: 6, at: 0x5D }, { report: 3 }] },
        tips: [["Attack the back of her head", "KW IGN"], ["Mermaid Kick away when she breathes in", "KW TR IGN"],
          ["Keep Aero up", "KW IGN"]] },
    ],
    optional: [
      { name: "Shark", visit: "1st visit", src: "KW GG ES KC SS",
        tips: [["Cast Aero first", "KW GG ES KC"], ["Stay at its side, away from the jaws", "GG ES SS"],
          ["Swim away if you'd rather not fight", "GG ES"]] },
    ],
  },
  "Halloween Town": {
    story: [
      { name: "Lock, Shock and Barrel", visit: "1st visit", src: "KW GG TR",
        tips: [["They're quick: magic finds them", "KW GG TR"]] },
      { name: "Oogie Boogie", visit: "1st visit", src: "KW GG", beaten: { any: [{ p: 8, at: 0x62 }, { report: 7 }] },
        tips: [["Take out the Gargoyles first", "KW GG"], ["Step on the glowing symbol to reach him", "KW GG"],
          ["Knock his dice back", "KW GG"]] },
      { name: "Oogie's Manor", visit: "1st visit", src: "KW GG ES KC SS", beaten: { p: 8, at: 0x6A },
        tips: [["Destroy every dark orb on the manor", "KW GG ES KC SS"], ["The lanterns and Gargoyles can be destroyed", "GG ES"],
          ["Keep Aero up", "GG KC"]] },
    ],
  },
  "Neverland": {
    story: [
      { name: "Anti-Sora", visit: "1st visit", src: "KW GG", beaten: { p: 9, at: 0x35 },
        tips: [["Of the three copies, hit the real one", "KW GG"], ["It sinks and pops up behind you", "KW GG"],
          ["Cure and Aero help", "KW GG"]] },
      { name: "Captain Hook", visit: "1st visit", src: "KW GG IGN", beaten: { any: [{ p: 9, at: 0x56 }, { report: 9 }] },
        tips: [["Fly off to escape his big attacks", "KW GG"], ["Take out the flying Battleship", "GG IGN"]] },
    ],
    optional: [
      { name: "Phantom", visit: "the Clock Tower", src: "KW ES KC", beaten: { p: 9, at: 0x96 },
        tips: [["Keep the clock stopped with Stop", "KW ES KC"], ["Match its orb: red Fire, blue Blizzard, yellow Thunder, white melee", "ES KC"]] },
    ],
  },
  "Hollow Bastion": {
    story: [
      { name: "Riku", visit: "1st visit", src: "KW TR IGN", beaten: { any: [{ p: 10, at: 0x32 }, { has: "White Trinity" }] },
        tips: [["Be patient: hit when he's open", "KW IGN"], ["Heal often: he hits hard", "KW IGN"]] },
      { name: "Maleficent", visit: "1st visit", src: "KW GG TR IGN", beaten: { any: [{ p: 10, at: 0x5A }, { report: 5 }] },
        tips: [["Knock her platform down (Gravity works)", "KW GG TR IGN"], ["Get wide when she calls meteors", "KW GG TR IGN"],
          ["Her Heartless drop orbs to refill", "TR IGN"]] },
      { name: "Dragon Maleficent", visit: "1st visit", src: "KW GG", beaten: { p: 10, at: 0x6E },
        tips: [["Tinker Bell and Aero, then stay at her head", "KW GG"], ["Jump the shockwave when she stomps", "KW GG"],
          ["Guard her homing fireball", "KW GG"]] },
      { name: "Riku, again", visit: "1st visit", src: "KW GG IGN", beaten: { p: 10, at: 0x82 },
        tips: [["You're alone: bring healing items", "KW GG"], ["Glide around the edge during Dark Aura", "KW GG"],
          ["Guard his combo, then counter", "GG IGN"]] },
      { name: "Behemoth", visit: "2nd visit", src: "KW GG TR IGN", beaten: { p: 10, at: 0xB9 },
        tips: [["Climb its back and hit the horn", "KW GG TR IGN"], ["Combo it when it drops", "KW TR IGN"],
          ["Get clear of its lightning", "KW GG IGN"]] },
    ],
    optional: [
      { name: "Unknown", visit: "Hollow Bastion", src: "CC", beaten: { report: 13 }, tips: [] },
    ],
  },
  "End of the World": {
    story: [
      { name: "Chernabog", visit: "the volcano", src: "KW GG TR", beaten: { p: 11, at: 0x33 },
        tips: [["Fly behind his head and attack", "KW GG"], ["Back off when flames gather", "KW GG TR"], ["Keep Aero up", "KW GG"]] },
      { name: "Ansem", visit: "past the final door", src: "KW GG TR IGN",
        tips: [["When Attack turns to Freeze, don't press it", "KW GG TR IGN"], ["Get behind him when the guardian shields his front", "KW TR"]] },
      { name: "Darkside", visit: "past the final door", src: "KW GG", tips: [["Same as before: hit the hands", "KW GG"]] },
      { name: "Ansem, again", visit: "past the final door", src: "KW IGN",
        tips: [["Same tricks as before", "KW IGN"], ["Watch for the guardian bursting from the ground", "KW IGN"]] },
      { name: "World of Chaos", visit: "past the final door", src: "KW GG IGN",
        tips: [["Keep Aero up and hit Ansem", "KW GG"], ["Fly from the lasers, then come back", "KW GG"],
          ["Small foes drop HP", "GG IGN"]] },
    ],
  },
};
