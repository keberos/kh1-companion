// KH1 story guide: per-world milestones in order, for the Guide tab.
//
// Thresholds and event names come from the KH1FM Archipelago client
// (gaithern/KH-1FM-AP-LUA, define_world_progress_location_threshholds), which in turn
// credits RetroAchievements' code notes for KH1. A step counts as done once that world's
// story-progress byte (state.progress) reaches `at`. Hints are short, spoiler-light
// summaries written for this project. `where` is a map room id, set only where confident.
//
// `p` is the index into the bridge's progress bytes: worlds in the game's progress order
// (index 7 is unused), and 14 is Traverse Town's extra byte (+0xE).
window.KH1_GUIDE = {
  "Traverse Town": [
    { p: 0, at: 0x2B, title: "Defeat the Guard Armor", where: "3rd District", rewards: ["Brave Warrior"],
      hint: "Explore the districts until Leon finds you. After the talk in the Hotel, head into the 3rd District: the Guard Armor fight starts there." },
    { p: 0, at: 0x31, title: "Regroup with Donald and Goofy", where: "3rd District", rewards: ["Dodge Roll", "Fire", "Blue Trinity"],
      hint: "Finish the scenes after the Guard Armor. Donald and Goofy join and teach you new skills before you leave on the Gummi Ship." },
    { p: 0, at: 0x3E, title: "Meet Leon in the Secret Waterway", where: "Secret Waterway", rewards: ["Earthshine"],
      hint: "On a return visit, reach the Secret Waterway through the drain in the Alleyway and talk to Leon." },
    { p: 14, at: 0x14, title: "Defeat the Opposite Armor", where: "Gizmo Shop", rewards: ["Aero"],
      hint: "On a later visit, ring the bell on top of the Gizmo Shop in the 2nd District three times to reveal the Keyhole. A boss stands guard." },
    { p: 0, at: 0x8C, title: "Find Kairi's gift", where: "Secret Waterway", rewards: ["Oathkeeper"],
      hint: "Late in the story, after Hollow Bastion, return to Traverse Town and visit the Secret Waterway." },
  ],
  "Deep Jungle": [
    { p: 1, at: 0x17, title: "Meet Jane at the camp", where: "Camp: Tent", rewards: ["Protect-G"],
      hint: "Find your way down to the Camp and talk to Jane in the tent." },
    { p: 1, at: 0x42, title: "Defeat Sabor", rewards: ["White Fang"],
      hint: "Sabor the leopard returns. Beat him to move the story along." },
    { p: 1, at: 0x56, title: "Defeat Clayton", where: "Jungle: Cliff", rewards: ["Cure"],
      hint: "Follow the gorilla trouble through the Bamboo Thicket to the Cliff, where Clayton makes his move." },
    { p: 1, at: 0x5C, title: "Reach the Cavern of Hearts", where: "Cavern of Hearts", rewards: ["Navi-G Piece"],
      hint: "Behind the waterfall: climb the Waterfall Cavern to the cave at the top." },
    { p: 1, at: 0x6E, title: "Seal Deep Jungle's Keyhole", where: "Cavern of Hearts", rewards: ["Jungle King", "Red Trinity"],
      hint: "Finish the business in the Cavern of Hearts to lock the Keyhole." },
  ],
  "Olympus Coliseum": [
    { p: 2, at: 0x0D, title: "Pass Phil's training", where: "Lobby", rewards: ["Thunder"],
      hint: "Talk to Phil in the Lobby and clear his barrel-smashing test." },
    { p: 2, at: 0x10, title: "Get an Entry Pass", where: "Coliseum Gates", rewards: ["Entry Pass"],
      hint: "Phil won't let you compete yet. Someone outside at the gates can get you in." },
    { p: 2, at: 0x25, title: "Defeat Cerberus", where: "Coliseum", rewards: ["Inferno Band"],
      hint: "Win your way through the preliminaries. The final round brings a three-headed guest." },
    { p: 2, at: 0x28, title: "Become a junior hero", where: "Coliseum Gates", rewards: ["Hero's License"],
      hint: "Talk to Phil and Hercules after Cerberus." },
  ],
  "Wonderland": [
    { p: 3, at: 0x2E, title: "Defeat the Trickmaster", where: "Bizarre Room", rewards: ["Blizzard", "Ifrit's Horn"],
      hint: "Clear Alice's name by gathering evidence in the Lotus Forest and Bizarre Room, then chase the culprit back to the Bizarre Room." },
    { p: 3, at: 0x30, title: "Find the Navi-G Piece", where: "Bizarre Room", rewards: ["Navi-G Piece"],
      hint: "After the Trickmaster, search the Bizarre Room." },
  ],
  "Agrabah": [
    { p: 4, at: 0x35, title: "Defeat the Pot Centipede", rewards: ["Ray of Light"],
      hint: "Team up with Aladdin and chase the pot-shaped Heartless through the city." },
    { p: 4, at: 0x49, title: "Defeat Jafar", where: "Lamp Chamber", rewards: ["Blizzard"],
      hint: "Cross the desert to the Cave of Wonders and work down to the Treasure Room, then the Lamp Chamber." },
    { p: 4, at: 0x5A, title: "Defeat Genie Jafar", where: "Lamp Chamber", rewards: ["Fire"],
      hint: "Jafar isn't finished. Watch out for the lava." },
    { p: 4, at: 0x78, title: "Seal Agrabah's Keyhole", rewards: ["Genie", "Three Wishes", "Green Trinity"],
      hint: "After Jafar, return to the Cave of Wonders and find the Keyhole." },
  ],
  "Monstro": [
    { p: 5, at: 0x2E, title: "Defeat the Parasite Cage", where: "Bowels", rewards: ["Goofy Cheer"],
      hint: "Chase Pinocchio through the chambers. The flashing passages lead to Chamber 4, then the Bowels." },
    { p: 5, at: 0x46, title: "Defeat the Parasite Cage again", where: "Throat", rewards: ["Stop"],
      hint: "Return with High Jump and climb the Throat from the Mouth to reach the Stomach." },
  ],
  "Atlantica": [
    { p: 6, at: 0x32, title: "Find the Crystal Trident", where: "Sunken Ship", rewards: ["Crystal Trident"],
      hint: "Follow Ariel to the Sunken Ship and search it." },
    { p: 6, at: 0x53, title: "Defeat Ursula", where: "Ursula's Lair", rewards: ["Mermaid Kick"],
      hint: "Sebastian shows a hidden way from the Sunken Ship into the Den of Tides and on to Ursula's Lair." },
    { p: 6, at: 0x5D, title: "Defeat giant Ursula", rewards: ["Thunder"],
      hint: "Use Mermaid Kick to fight through the Calm Depths current to the open sea." },
    { p: 6, at: 0x64, title: "Seal Atlantica's Keyhole", where: "Ariel's Grotto", rewards: ["Crabclaw"],
      hint: "The Keyhole is somewhere Ariel keeps her treasures." },
  ],
  "Halloween Town": [
    { p: 8, at: 0x1E, title: "Visit the Graveyard", where: "Graveyard", rewards: ["Forget-Me-Not"],
      hint: "Help Jack and Dr. Finkelstein. Explore past Guillotine Square." },
    { p: 8, at: 0x62, title: "Defeat Oogie Boogie", where: "Torture Chamber", rewards: ["Holy Circlet"],
      hint: "Cross Moonlight Hill and the Bridge to Oogie's Manor and work down to the Torture Chamber." },
    { p: 8, at: 0x6A, title: "Defeat Oogie's Manor", where: "Oogie Manor/Manor Ruins", rewards: ["Gravity"],
      hint: "Oogie merges with his manor. Destroy the glowing orbs." },
    { p: 8, at: 0x6E, title: "Seal Halloween Town's Keyhole", rewards: ["Pumpkinhead"],
      hint: "Follow Jack after the manor falls." },
  ],
  "Neverland": [
    { p: 9, at: 0x35, title: "Defeat your shadow", where: "Captain's Cabin", rewards: ["Raven's Claw"],
      hint: "Escape the Hold through the Galley and up to the Cabin. The ladder leads to the Captain's Cabin." },
    { p: 9, at: 0x3F, title: "Confront Hook", rewards: ["Cure"],
      hint: "Make your way back down and toward the deck." },
    { p: 9, at: 0x56, title: "Defeat Captain Hook", where: "Pirate Ship", rewards: ["Ars Arcanum"],
      hint: "Take the Corridor to the Pirate Ship deck." },
    { p: 9, at: 0x6E, title: "Seal Neverland's Keyhole", where: "Clock Tower", rewards: ["Fairy Harp", "Tinker Bell", "Glide"],
      hint: "Peter Pan takes you to the Clock Tower." },
    { p: 9, at: 0x96, title: "Defeat the Phantom", where: "Clock Tower", rewards: ["Stop"],
      hint: "Optional and late game: a ghost haunts the Clock Tower. Bring Stop magic and watch its clock." },
  ],
  "Hollow Bastion": [
    { p: 10, at: 0x32, title: "Defeat Riku", where: "Entrance Hall", rewards: ["White Trinity"],
      hint: "Climb from the Rising Falls to the Castle Gates and into the Entrance Hall." },
    { p: 10, at: 0x5A, title: "Defeat Maleficent", where: "Castle Chapel", rewards: ["Donald Cheer"],
      hint: "Solve the Library's book puzzle to open the way up, then climb past the Great Crest and High Tower to the Chapel." },
    { p: 10, at: 0x6E, title: "Defeat Dragon Maleficent", where: "Castle Chapel", rewards: ["Fireglow"],
      hint: "Right after Maleficent: she isn't done." },
    { p: 10, at: 0x82, title: "Defeat Riku again", where: "Grand Hall", rewards: ["Ragnarok"],
      hint: "A hidden passage opens in the Chapel. Take the Lift Stop to the Grand Hall." },
    { p: 10, at: 0xB9, title: "Defeat the Behemoth", where: "Grand Hall", rewards: ["Omega Arts"],
      hint: "Enter the emblem portal in the Grand Hall. Aim for its horn." },
    { p: 10, at: 0xC3, title: "Speak to the princesses", rewards: ["Fire"],
      hint: "After the Keyhole is sealed, talk to everyone gathered in the castle." },
  ],
  "End of the World": [
    { p: 11, at: 0x33, title: "Defeat Chernabog", rewards: ["Superglide"],
      hint: "Finish the World Terminus and drop into the hole it leaves. Fly up to reach the demon." },
  ],
};
