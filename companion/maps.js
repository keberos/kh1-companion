// KH1 world maps: hand-authored room graphs, one per world, covering every room.
//
// Sources: room bytes and names from Dekirai/MultiPresence (Models/KH1/Rooms.cs, MIT;
// list index = room byte, see tools/sources/); layout and exits from the Kingdom Hearts
// Wiki "Settings and Areas" sections (khwiki.com, KH1 part of each world page).
// tools/test_logic.mjs checks that every named room byte belongs to exactly one node.
//
// Node fields:
//   id      room name as the chest data spells it (chest.r), or a plain name
//   label   short display name (defaults to id)
//   x, y    grid cell
//   rooms   in-game room bytes that belong to this node
//   save    true where a save point is confirmed (a source, or used in play); the list is known to be incomplete
//   match   chest-name prefixes for chests that have no room in the data
//   alone   true for rooms you only reach by story or cutscene (no exits drawn)
// Edges: [a, b], a confirmed way between two rooms.
// Paths follow the KH Wiki's room descriptions and KH1 walkthroughs (Walkthrough:Kingdom_Hearts/<world>),
// cross-checked against Archipelago chest names; every one is confirmed (checked 2026-10-24).
// `gate`: a room you can't get into until a story point ({p, at}: the guide's progress bytes,
// where the next step leads there) or an ability ({need}, Archipelago's Beginner logic), or
// one the story only takes you to in a scene ({scene}: never open to walk into).
window.KH1_MAPS = {
  "Awakening": {
    nodes: [
      { id: "Disembark", x: 0, y: 0, rooms: [0x00] },
      { id: "Cinderella Platform", label: "Station 1", x: 1, y: 0, rooms: [0x01] },
      { id: "Alice Platform", label: "Station 2", x: 2, y: 0, rooms: [0x02], match: ["Chest"] },
      { id: "Dream Islands", x: 3, y: 0, rooms: [0x05, 0x06] },
      { id: "Awakening", label: "Final Station", x: 4, y: 0, rooms: [0x03, 0x04] },
    ],
    edges: [["Disembark", "Cinderella Platform"], ["Cinderella Platform", "Alice Platform"],
      ["Alice Platform", "Dream Islands"], ["Dream Islands", "Awakening"]],
  },

  "Destiny Islands": {
    nodes: [
      { id: "Sora's Room", x: 0, y: 0, rooms: [0x09], alone: true, gate: { scene: true } },
      { id: "Island Remains", x: 2, y: 0, rooms: [0x08], alone: true, gate: { scene: true } },
      { id: "Cove", x: 0, y: 1, rooms: [0x02] },
      { id: "Seashore", x: 1, y: 1, rooms: [0x00, 0x03, 0x05] },
      { id: "Seaside Shack", x: 2, y: 1, rooms: [0x01, 0x04, 0x06], save: true },
      { id: "Secret Place", x: 1, y: 2, rooms: [0x07, 0x0A, 0x0B] },
    ],
    edges: [["Seashore", "Cove"], ["Seashore", "Seaside Shack"], ["Seashore", "Secret Place"]],
  },

  "Disney Castle": {
    nodes: [
      { id: "Gummi Hangar", x: 0, y: 0, gate: { scene: true }, rooms: [0x05] },
      { id: "Courtyard", x: 1, y: 0, gate: { scene: true }, rooms: [0x03, 0x08] },
      { id: "Colonnade", x: 2, y: 0, gate: { scene: true }, rooms: [0x01] },
      { id: "Audience Chamber", x: 3, y: 0, gate: { scene: true }, rooms: [0x00] },
      { id: "Path to the Crossroads", label: "Crossroads Path", x: 0, y: 1, gate: { scene: true }, rooms: [0x07] },
      { id: "Spiral Stairs", x: 1, y: 1, gate: { scene: true }, rooms: [0x04, 0x06] },
      { id: "Library", x: 3, y: 1, gate: { scene: true }, rooms: [0x02] },
    ],
    // KH1 only shows Disney Castle in story scenes; you never walk it, so no paths.
    edges: [],
  },

  "Traverse Town": {
    nodes: [
      { id: "Green Room", x: 0, y: 0, rooms: [0x05] },
      { id: "Red Room", x: 1, y: 0, rooms: [0x06] },
      { id: "Gizmo Shop", x: 2, y: 0, rooms: [0x11] },
      { id: "Dalmatians' House", label: "Dalmatians", x: 3, y: 0, rooms: [0x0D, 0x0E, 0x0F, 0x10] },
      { id: "Hallway", label: "Hotel Hallway", x: 0, y: 1, rooms: [0x07] },
      { id: "2nd District", x: 1, y: 1, rooms: [0x01] },
      { id: "Alleyway", x: 2, y: 1, rooms: [0x04] },
      { id: "Small House", x: 3, y: 1, rooms: [0x03, 0x19] },
      { id: "Secret Waterway", x: 4, y: 1, rooms: [0x16] },
      { id: "Accessory Shop", x: 0, y: 2, rooms: [0x0A], save: true },
      { id: "1st District", x: 1, y: 2, rooms: [0x00] },
      { id: "3rd District", x: 3, y: 2, rooms: [0x02, 0x18] },
      { id: "Mystical House", x: 4, y: 2, rooms: [0x08] },
      { id: "Merlin's House", x: 5, y: 2, rooms: [0x12] },
      { id: "Item Workshop", x: 0, y: 3, rooms: [0x0B] },
      { id: "Item Shop", x: 1, y: 3, rooms: [0x09] },
      { id: "Geppetto's House", label: "Geppetto's", x: 2, y: 3, rooms: [0x0C] },
      { id: "Magician's Lab", x: 4, y: 3, rooms: [0x14] },
      { id: "Magician's Study", x: 5, y: 3, rooms: [0x13] },
    ],
    edges: [
      ["1st District", "Accessory Shop"], ["Accessory Shop", "Item Workshop"], ["1st District", "Item Shop"],
      ["1st District", "Geppetto's House"], ["1st District", "2nd District"], ["1st District", "3rd District"],
      ["1st District", "Alleyway"],
      ["2nd District", "Gizmo Shop"], ["2nd District", "Dalmatians' House"], ["2nd District", "Hallway"],
      ["Hallway", "Green Room"], ["Hallway", "Red Room"], ["2nd District", "3rd District"],
      ["Alleyway", "Dalmatians' House"], ["Alleyway", "Secret Waterway"],
      ["3rd District", "Small House"], ["3rd District", "Mystical House"], ["Mystical House", "Merlin's House"],
      ["Merlin's House", "Magician's Study"], ["Magician's Study", "Magician's Lab"],
    ],
  },

  "Wonderland": {
    nodes: [
      { id: "Rabbit Hole", x: 0, y: 0, rooms: [0x00] },
      { id: "Bizarre Room", x: 1, y: 0, rooms: [0x01, 0x02, 0x06, 0x07, 0x08] },
      { id: "Queen's Castle", x: 2, y: 0, rooms: [0x03], save: true },
      { id: "Tea Party Garden", label: "Tea Party", x: 1, y: 1, rooms: [0x09] },
      { id: "Lotus Forest", x: 2, y: 1, rooms: [0x04, 0x05] },
    ],
    edges: [
      ["Rabbit Hole", "Bizarre Room"], ["Bizarre Room", "Queen's Castle"], ["Queen's Castle", "Lotus Forest"],
      ["Lotus Forest", "Tea Party Garden"], ["Tea Party Garden", "Bizarre Room"],
    ],
  },

  "Deep Jungle": {
    nodes: [
      { id: "Tree House", x: 0, y: 0, rooms: [0x00] },
      { id: "Climbing Trees", x: 1, y: 0, rooms: [0x06] },
      { id: "Jungle: Vines 2", label: "Vines 2", x: 2, y: 0, rooms: [0x04] },
      { id: "Jungle: Tunnel", label: "Tunnel", x: 0, y: 1, rooms: [0x08] },
      { id: "Treetop", x: 1, y: 1, rooms: [0x07] },
      { id: "Jungle: Vines", label: "Vines", x: 3, y: 1, rooms: [0x03] },
      { id: "Camp: Tent", label: "Tent", x: 0, y: 2, rooms: [0x0E] },
      { id: "Camp", x: 1, y: 2, rooms: [0x01, 0x0C] },
      { id: "Hippos' Lagoon", x: 2, y: 2, rooms: [0x05] },
      { id: "Cavern of Hearts", x: 3, y: 2, rooms: [0x0A], gate: { p: 1, at: 0x56 } },
      { id: "Jungle Slider", x: 0, y: 3, rooms: [0x0F, 0x10, 0x11, 0x12, 0x13] },
      { id: "Bamboo Thicket", x: 1, y: 3, rooms: [0x02, 0x0D] },
      { id: "Jungle: Cliff", label: "Cliff", x: 2, y: 3, rooms: [0x0B] },
      { id: "Waterfall Cavern", x: 3, y: 3, rooms: [0x09] },
    ],
    edges: [
      ["Tree House", "Jungle: Tunnel"], ["Jungle: Tunnel", "Treetop"], ["Treetop", "Climbing Trees"],
      ["Climbing Trees", "Tree House"], ["Jungle: Tunnel", "Jungle Slider"], ["Jungle Slider", "Camp"],
      ["Camp", "Camp: Tent"], ["Camp", "Hippos' Lagoon"],
      ["Hippos' Lagoon", "Jungle: Vines"], ["Hippos' Lagoon", "Jungle: Vines 2"], ["Jungle: Vines", "Jungle: Vines 2"],
      ["Jungle: Vines 2", "Climbing Trees"],
      ["Camp", "Bamboo Thicket"], ["Bamboo Thicket", "Jungle: Cliff"], ["Jungle: Cliff", "Waterfall Cavern"],
      ["Waterfall Cavern", "Cavern of Hearts"],
    ],
  },

  "100 Acre Wood": {
    nodes: [
      { id: "Wood: Meadow", label: "Meadow", x: 0, y: 0, rooms: [0x06] },
      { id: "Pooh's House", x: 1, y: 0, rooms: [0x00, 0x01] },
      { id: "Hunny Tree", x: 2, y: 0, rooms: [0x04] },
      { id: "Wood: Hill", label: "Hill", x: 0, y: 1, rooms: [0x05, 0x09] },
      { id: "100 Acre Wood", label: "Book map", x: 1, y: 1, rooms: [0x0A] },
      { id: "Bouncing Spot", x: 2, y: 1, rooms: [0x07] },
      { id: "Rabbit's House", x: 0, y: 2, rooms: [0x02, 0x03] },
      { id: "Muddy Path", x: 2, y: 2, rooms: [0x08] },
    ],
    edges: ["Wood: Meadow", "Pooh's House", "Hunny Tree", "Wood: Hill", "Bouncing Spot", "Rabbit's House", "Muddy Path"]
      .map((n) => ["100 Acre Wood", n]),
  },

  "Agrabah": {
    nodes: [
      { id: "Palace Gates", x: 1, y: 0, rooms: [0x06] },
      { id: "Aladdin's House", x: 2, y: 0, rooms: [0x12], save: true },
      { id: "Bottomless Hall", x: 3, y: 0, rooms: [0x0A] },
      { id: "Treasure Room", x: 4, y: 0, rooms: [0x0B] },
      { id: "Lamp Chamber", x: 5, y: 0, rooms: [0x10] },
      { id: "Agrabah: Alley", label: "Alley", x: 0, y: 1, rooms: [0x03] },
      { id: "Main Street", x: 1, y: 1, rooms: [0x05] },
      { id: "Agrabah: Bazaar", label: "Bazaar", x: 2, y: 1, rooms: [0x04] },
      { id: "Cave: Hall", label: "Cave Hall", x: 3, y: 1, rooms: [0x09] },
      { id: "Dark Chamber", x: 4, y: 1, rooms: [0x0D], save: true },
      { id: "Cave: Core", label: "Cave Core", x: 5, y: 1, rooms: [0x11, 0x14] },
      { id: "Agrabah: Storage", label: "Storage", x: 0, y: 2, rooms: [0x07], save: true },
      { id: "Agrabah: Plaza", label: "Plaza", x: 1, y: 2, rooms: [0x02, 0x13] },
      { id: "Desert", x: 2, y: 2, rooms: [0x00, 0x01] },
      { id: "Cave: Entrance", label: "Cave Entrance", x: 3, y: 2, rooms: [0x08] },
      { id: "Relic Chamber", x: 4, y: 2, rooms: [0x0C] },
      { id: "Silent Chamber", x: 5, y: 2, rooms: [0x0E] },
      { id: "Hidden Room", x: 4, y: 3, rooms: [0x0F] },
    ],
    edges: [
      ["Agrabah: Plaza", "Agrabah: Storage"], ["Agrabah: Plaza", "Main Street"], ["Main Street", "Palace Gates"],
      ["Main Street", "Agrabah: Alley"], ["Main Street", "Agrabah: Bazaar"], ["Main Street", "Aladdin's House"],
      ["Agrabah: Plaza", "Agrabah: Alley"], // over the awnings to the Alley's high exit
      ["Agrabah: Plaza", "Desert"], ["Desert", "Cave: Entrance"],
      ["Cave: Entrance", "Cave: Hall"], ["Cave: Hall", "Bottomless Hall"], ["Bottomless Hall", "Treasure Room"],
      ["Treasure Room", "Lamp Chamber"], ["Lamp Chamber", "Cave: Core"],
      ["Cave: Hall", "Dark Chamber"], // drop down on the right
      ["Dark Chamber", "Relic Chamber"], // chest "Dark Chamber Across from Relic Chamber Entrance"
      ["Cave: Entrance", "Relic Chamber"], // down the stairs to the right
      ["Relic Chamber", "Silent Chamber"], ["Silent Chamber", "Hidden Room"], ["Silent Chamber", "Cave: Hall"], // stairs up
    ],
  },

  "Monstro": {
    nodes: [
      { id: "Throat", x: 0, y: 0, rooms: [0x03], gate: { need: "High Jump" } },
      { id: "Stomach", x: 1, y: 0, rooms: [0x02], gate: { need: "High Jump" } },
      { id: "Monstro: Chamber 5", label: "Chamber 5", x: 2, y: 0, rooms: [0x09] },
      { id: "Chamber 6", x: 3, y: 0, rooms: [0x0A] },
      { id: "Monstro: Mouth", label: "Mouth", x: 0, y: 1, rooms: [0x00, 0x01], save: true },
      { id: "Chamber 1", x: 1, y: 1, rooms: [0x05] },
      { id: "Monstro: Chamber 2", label: "Chamber 2", x: 2, y: 1, rooms: [0x06] },
      { id: "Chamber 4", x: 3, y: 1, rooms: [0x08], save: true },
      { id: "Bowels", x: 4, y: 1, rooms: [0x04] },
      { id: "Monstro: Chamber 3", label: "Chamber 3", x: 1, y: 2, rooms: [0x07] },
    ],
    edges: [
      ["Monstro: Mouth", "Throat"], ["Throat", "Stomach"], ["Monstro: Mouth", "Chamber 1"],
      ["Chamber 1", "Monstro: Chamber 3"], ["Chamber 1", "Monstro: Chamber 2"],
      ["Monstro: Chamber 2", "Monstro: Chamber 3"], ["Monstro: Chamber 2", "Monstro: Chamber 5"],
      ["Monstro: Chamber 5", "Chamber 6"], ["Monstro: Chamber 5", "Chamber 4"], ["Chamber 4", "Bowels"],
    ],
  },

  "Atlantica": {
    nodes: [
      { id: "Triton's Throne", label: "Throne Room", x: 0, y: 0, rooms: [0x0F], save: true },
      { id: "Triton's Palace", x: 1, y: 0, rooms: [0x0E], match: ["Triton's Palace"] },
      { id: "Undersea Garden", x: 0, y: 1, rooms: [0x05] },
      { id: "Undersea Gorge", x: 1, y: 1, rooms: [0x03], match: ["Undersea Gorge"] },
      { id: "Ariel's Grotto", x: 2, y: 1, rooms: [0x0D], match: ["Ariel's Grotto"] },
      { id: "Sunken Ship", x: 3, y: 1, rooms: [0x06, 0x08], match: ["Sunken Ship"] },
      { id: "Below Deck", x: 4, y: 1, rooms: [0x07] },
      { id: "Tranquil Grotto", x: 0, y: 2, rooms: [0x01] },
      { id: "Undersea Valley", x: 1, y: 2, rooms: [0x00] },
      { id: "Calm Depths", x: 2, y: 2, rooms: [0x02] },
      { id: "Undersea Cave", x: 3, y: 2, rooms: [0x04] },
      { id: "Den of Tides", x: 4, y: 2, rooms: [0x09] },
      { id: "Open Sea", x: 1, y: 3, rooms: [0x10] },
      { id: "Ursula's Lair", x: 2, y: 3, rooms: [0x0C], match: ["Ursula's Lair"], gate: { p: 6, at: 0x32 } },
      { id: "Tidal Abyss", x: 3, y: 3, rooms: [0x0B] },
      { id: "Cavern Nook", x: 4, y: 3, rooms: [0x0A], save: true },
    ],
    edges: [
      ["Tranquil Grotto", "Undersea Valley"], ["Undersea Valley", "Calm Depths"], ["Calm Depths", "Undersea Cave"],
      ["Undersea Cave", "Undersea Gorge"],
      ["Undersea Gorge", "Ariel's Grotto"], ["Undersea Gorge", "Undersea Garden"], ["Undersea Gorge", "Triton's Palace"],
      ["Triton's Palace", "Triton's Throne"], ["Undersea Gorge", "Sunken Ship"], ["Sunken Ship", "Below Deck"],
      ["Sunken Ship", "Den of Tides"], ["Den of Tides", "Cavern Nook"], ["Den of Tides", "Tidal Abyss"],
      ["Tidal Abyss", "Ursula's Lair"], ["Calm Depths", "Open Sea"],
    ],
  },

  "Halloween Town": {
    nodes: [
      { id: "Lab Entryway", x: 1, y: 0, rooms: [0x01] },
      { id: "Research Lab", x: 2, y: 0, rooms: [0x0A] },
      { id: "Evil Playroom", x: 3, y: 0, rooms: [0x09] },
      { id: "Torture Chamber", x: 4, y: 0, rooms: [0x07] },
      { id: "Guillotine Gate", x: 0, y: 1, rooms: [0x0B] },
      { id: "Guillotine Square", x: 1, y: 1, rooms: [0x00] },
      { id: "Graveyard", x: 2, y: 1, rooms: [0x02] },
      { id: "Boneyard", x: 3, y: 1, rooms: [0x05] },
      { id: "Oogie Manor/Manor Ruins", label: "Oogie's Manor", x: 4, y: 1, rooms: [0x06, 0x08] },
      { id: "Cemetery", x: 2, y: 2, rooms: [0x0C] },
      { id: "Moonlight Hill", x: 3, y: 2, rooms: [0x03] },
      { id: "Bridge", x: 4, y: 2, rooms: [0x04] },
    ],
    edges: [
      ["Guillotine Gate", "Guillotine Square"], ["Guillotine Square", "Lab Entryway"], ["Lab Entryway", "Research Lab"],
      ["Guillotine Square", "Graveyard"], ["Graveyard", "Boneyard"], ["Boneyard", "Moonlight Hill"],
      ["Moonlight Hill", "Graveyard"], ["Moonlight Hill", "Cemetery"], ["Moonlight Hill", "Bridge"],
      ["Bridge", "Oogie Manor/Manor Ruins"], ["Oogie Manor/Manor Ruins", "Torture Chamber"],
      ["Oogie Manor/Manor Ruins", "Evil Playroom"], ["Bridge", "Guillotine Square"], // sewers
    ],
  },

  "Olympus Coliseum": {
    nodes: [
      { id: "Coliseum Gates", x: 0, y: 0, rooms: [0x00, 0x03] },
      { id: "Lobby", x: 1, y: 0, rooms: [0x01] },
      { id: "Coliseum", label: "Arena", x: 2, y: 0, rooms: [0x02, 0x05, 0x06], gate: { p: 2, at: 0x10 } },
    ],
    edges: [["Coliseum Gates", "Lobby"], ["Lobby", "Coliseum"]],
  },

  "Neverland": {
    nodes: [
      { id: "Ship: Hold (Yellow Trinity)", label: "Secret Room", x: 0, y: 0 },
      { id: "Ship: Cabin", label: "Cabin", x: 2, y: 0, rooms: [0x05], save: true },
      { id: "Captain's Cabin", x: 3, y: 0, rooms: [0x06] },
      { id: "Ship: Hold", label: "Hold", x: 0, y: 1, rooms: [0x00, 0x01, 0x02, 0x07] },
      { id: "Freezer", x: 1, y: 1, rooms: [0x03] },
      { id: "Ship: Galley", label: "Galley", x: 2, y: 1, rooms: [0x04] },
      { id: "Pirate Ship", x: 3, y: 1, rooms: [0x08] },
      { id: "Clock Tower", x: 4, y: 1, rooms: [0x09], gate: { p: 9, at: 0x56 } },
    ],
    edges: [
      ["Ship: Hold", "Ship: Hold (Yellow Trinity)"], ["Ship: Hold", "Freezer"], ["Freezer", "Ship: Galley"],
      ["Ship: Galley", "Ship: Cabin"], ["Ship: Cabin", "Captain's Cabin"], ["Captain's Cabin", "Pirate Ship"],
      ["Pirate Ship", "Clock Tower"],
    ],
  },

  "Hollow Bastion": {
    nodes: [
      { id: "High Tower", x: 1, y: 0, rooms: [0x03] },
      { id: "Castle Chapel", x: 2, y: 0, rooms: [0x0B, 0x0C, 0x0D, 0x10] },
      { id: "Great Crest", x: 1, y: 1, rooms: [0x02] },
      { id: "Lift Stop", x: 2, y: 1, rooms: [0x06] },
      { id: "Grand Hall", x: 3, y: 1, rooms: [0x0E], gate: { p: 10, at: 0x6E } },
      { id: "Dark Depths", x: 4, y: 1, rooms: [0x0F], gate: { p: 10, at: 0x6E } },
      { id: "Library", x: 0, y: 2, rooms: [0x05], save: true, match: ["Library"] },
      { id: "Entrance Hall", x: 1, y: 2, rooms: [0x04], match: ["Entrance Hall"] },
      { id: "Rising Falls", x: 0, y: 3, rooms: [0x00] },
      { id: "Castle Gates", x: 1, y: 3, rooms: [0x01] },
      { id: "Base Level", x: 1, y: 4, rooms: [0x07] },
      { id: "Waterway", x: 2, y: 4, rooms: [0x08, 0x09] },
      { id: "Dungeon", x: 3, y: 4, rooms: [0x0A] },
    ],
    edges: [
      ["Rising Falls", "Castle Gates"], ["Castle Gates", "Base Level"], ["Base Level", "Waterway"],
      ["Waterway", "Dungeon"], ["Castle Gates", "Entrance Hall"], ["Entrance Hall", "Library"],
      ["Library", "Lift Stop"], ["Entrance Hall", "Great Crest"], // via the second half of the Castle Gates
      ["Great Crest", "Lift Stop"], ["Great Crest", "High Tower"], ["High Tower", "Lift Stop"],
      ["High Tower", "Castle Chapel"], ["Castle Chapel", "Lift Stop"], ["Lift Stop", "Grand Hall"],
      ["Grand Hall", "Dark Depths"],
    ],
  },

  "End of the World": {
    nodes: [
      ...[["Traverse Town", 0x10], ["Wonderland", 0x11], ["Olympus Coliseum", 0x12], ["Deep Jungle", 0x13], ["Agrabah", 0x14]]
        .map(([w, r], i) => ({ id: "World Terminus: " + w, label: "WT: " + w.replace("Olympus Coliseum", "Olympus"), x: i, y: 0, rooms: [r] })),
      { id: "Gate to the Dark", x: 0, y: 1, rooms: [0x00] },
      { id: "Final Dimension", x: 1, y: 1, rooms: [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D] },
      { id: "Giant Crevasse", x: 2, y: 1, rooms: [0x0E] },
      { id: "World Terminus", x: 3, y: 1, rooms: [0x0F] },
      { id: "Evil Grounds", x: 4, y: 1, rooms: [0x1A] },
      { id: "Crater", x: 5, y: 1, rooms: [0x22] },
      ...[["Atlantica", 0x15], ["Halloween Town", 0x16], ["Neverland", 0x17], ["100 Acre Wood", 0x18], ["Hollow Bastion", 0x19]]
        .map(([w, r], i) => ({ id: "World Terminus: " + w, label: "WT: " + w, x: i, y: 2, rooms: [r] })),
      { id: "Volcanic Crater", x: 5, y: 2, rooms: [0x1B] },
      { id: "Final Door", x: 0, y: 3, rooms: [0x20] },
      { id: "The Void", x: 1, y: 3, rooms: [0x21, 0x24, 0x25, 0x26] },
      { id: "Crumbling Island", x: 2, y: 3, rooms: [0x1F] },
      { id: "Homecoming", x: 3, y: 3, rooms: [0x1E, 0x23] },
      { id: "Final Rest", x: 4, y: 3, rooms: [0x1D], save: true },
      { id: "Linked Worlds", x: 5, y: 3, rooms: [0x1C] },
    ],
    edges: [
      ["Gate to the Dark", "Final Dimension"], ["Final Dimension", "Giant Crevasse"], ["Giant Crevasse", "World Terminus"],
      ...["Traverse Town", "Wonderland", "Olympus Coliseum", "Deep Jungle", "Agrabah", "Atlantica", "Halloween Town",
        "Neverland", "100 Acre Wood", "Hollow Bastion"].map((w) => ["World Terminus", "World Terminus: " + w]),
      ["World Terminus", "Evil Grounds"], ["Evil Grounds", "Crater"], ["Crater", "Volcanic Crater"],
      ["Volcanic Crater", "Linked Worlds"], ["Linked Worlds", "Final Rest"], ["Final Rest", "Homecoming"],
      ["Homecoming", "Crumbling Island"], ["Crumbling Island", "The Void"], ["The Void", "Final Door"],
    ],
  },
};
