// KH1 world maps: hand-authored room graphs, one per world.
//
// Sources: room layout and exits from the Kingdom Hearts Wiki "Settings and Areas"
// sections (khwiki.com, KH1 subsection of each world page); room bytes from the
// KH1FM randomizer docs (room byte = .ard map file number - 1, see tools/sources/).
//
// Node fields:
//   id     room name exactly as the chest data spells it (chest.r), or a plain name
//   label  short display name (defaults to id)
//   x, y   grid cell
//   rooms  in-game room bytes for this node, where known
//   save   true if the wiki mentions a save point here
//   match  chest-name prefixes for chests that have no room in the data
// Edges: [a, b] or [a, b, "approx"] when the wiki implies the exit but doesn't spell it out.
window.KH1_MAPS = {
  "Destiny Islands": {
    nodes: [
      { id: "Seashore", x: 0, y: 0, rooms: [0x00], save: true },
      { id: "Cove", x: 1, y: 0, rooms: [0x02] },
      { id: "Secret Place", x: 0, y: 1, rooms: [0x0A] },
    ],
    edges: [["Seashore", "Cove"], ["Seashore", "Secret Place"]],
  },

  "Awakening": {
    nodes: [{ id: "Dive to the Heart", x: 0, y: 0, rooms: [0x01, 0x02, 0x04, 0x05], match: ["Chest"] }],
    edges: [],
  },

  "Traverse Town": {
    nodes: [
      { id: "Green Room", x: 0, y: 0 },
      { id: "Red Room", x: 1, y: 0 },
      { id: "Gizmo Shop", x: 2, y: 0, rooms: [0x11] },
      { id: "Dalmatians' House", label: "Dalmatians", x: 3, y: 0, rooms: [0x10] },
      { id: "2nd District", x: 1, y: 1, rooms: [0x01] },
      { id: "Alleyway", x: 2, y: 1 },
      { id: "Secret Waterway", x: 4, y: 1, rooms: [0x16] },
      { id: "Accessory Shop", x: 0, y: 2 },
      { id: "1st District", x: 1, y: 2, rooms: [0x00] },
      { id: "3rd District", x: 3, y: 2, rooms: [0x02, 0x18] },
      { id: "Mystical House", x: 4, y: 2 },
      { id: "Item Workshop", x: 0, y: 3, rooms: [0x0B] },
      { id: "Item Shop", x: 1, y: 3, rooms: [0x09] },
      { id: "Geppetto's House", label: "Geppetto's", x: 2, y: 3, rooms: [0x0C] },
      { id: "Magician's Study", x: 4, y: 3 },
    ],
    edges: [
      ["1st District", "Accessory Shop"], ["Accessory Shop", "Item Workshop"], ["1st District", "Item Shop"],
      ["1st District", "Geppetto's House"], ["1st District", "2nd District"], ["1st District", "3rd District"],
      ["1st District", "Alleyway"],
      ["2nd District", "Gizmo Shop"], ["2nd District", "Dalmatians' House"], ["2nd District", "Green Room"],
      ["2nd District", "Red Room"], ["2nd District", "3rd District"],
      ["Alleyway", "Dalmatians' House"], ["Alleyway", "Secret Waterway"],
      ["3rd District", "Mystical House"], ["Mystical House", "Magician's Study"],
      ["Secret Waterway", "Mystical House", "approx"],
    ],
  },

  "Wonderland": {
    nodes: [
      { id: "Rabbit Hole", x: 0, y: 0 },
      { id: "Bizarre Room", x: 1, y: 0, rooms: [0x01, 0x02] },
      { id: "Queen's Castle", x: 2, y: 0, save: true },
      { id: "Tea Party Garden", label: "Tea Party", x: 1, y: 1 },
      { id: "Lotus Forest", x: 2, y: 1 },
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
      { id: "Jungle: Vines 2", label: "Vines 2", x: 2, y: 0 },
      { id: "Jungle: Tunnel", label: "Tunnel", x: 0, y: 1 },
      { id: "Jungle: Vines", label: "Vines", x: 3, y: 1 },
      { id: "Camp: Tent", label: "Tent", x: 0, y: 2, rooms: [0x0E] },
      { id: "Camp", x: 1, y: 2, rooms: [0x0C] },
      { id: "Hippos' Lagoon", x: 2, y: 2 },
      { id: "Bamboo Thicket", x: 1, y: 3, rooms: [0x02] },
      { id: "Jungle: Cliff", label: "Cliff", x: 2, y: 3, rooms: [0x0B] },
      { id: "Waterfall Cavern", x: 3, y: 3 },
      { id: "Cavern of Hearts", x: 3, y: 2, rooms: [0x0A] },
    ],
    edges: [
      ["Tree House", "Jungle: Tunnel"], ["Jungle: Tunnel", "Climbing Trees"], ["Climbing Trees", "Tree House"],
      ["Jungle: Tunnel", "Camp", "approx"], ["Camp", "Camp: Tent"], ["Camp", "Hippos' Lagoon"],
      ["Hippos' Lagoon", "Jungle: Vines"], ["Hippos' Lagoon", "Jungle: Vines 2"], ["Jungle: Vines", "Jungle: Vines 2"],
      ["Jungle: Vines 2", "Climbing Trees"],
      ["Camp", "Bamboo Thicket"], ["Bamboo Thicket", "Jungle: Cliff"], ["Jungle: Cliff", "Waterfall Cavern"],
      ["Waterfall Cavern", "Cavern of Hearts"],
    ],
  },

  "100 Acre Wood": {
    nodes: [
      { id: "Wood: Meadow", label: "Meadow", x: 0, y: 0 },
      { id: "Pooh's House", x: 1, y: 0, rooms: [0x00, 0x01] },
      { id: "Hunny Tree", x: 2, y: 0 },
      { id: "Wood: Hill", label: "Hill", x: 0, y: 1 },
      { id: "100 Acre Wood", label: "Book map", x: 1, y: 1, rooms: [0x0A] },
      { id: "Bouncing Spot", x: 2, y: 1, rooms: [0x07] },
      { id: "Rabbit's House", x: 0, y: 2 },
      { id: "Muddy Path", x: 2, y: 2 },
    ],
    edges: ["Wood: Meadow", "Pooh's House", "Hunny Tree", "Wood: Hill", "Bouncing Spot", "Rabbit's House", "Muddy Path"]
      .map((n) => ["100 Acre Wood", n]),
  },

  "Agrabah": {
    nodes: [
      { id: "Palace Gates", x: 1, y: 0 },
      { id: "Agrabah: Alley", label: "Alley", x: 0, y: 1 },
      { id: "Main Street", x: 1, y: 1 },
      { id: "Agrabah: Bazaar", label: "Bazaar", x: 2, y: 1 },
      { id: "Aladdin's House", x: 2, y: 0, rooms: [0x12], save: true },
      { id: "Agrabah: Storage", label: "Storage", x: 0, y: 2, save: true },
      { id: "Agrabah: Plaza", label: "Plaza", x: 1, y: 2 },
      { id: "Cave: Entrance", label: "Cave Entrance", x: 3, y: 2 },
      { id: "Cave: Hall", label: "Cave Hall", x: 3, y: 1 },
      { id: "Bottomless Hall", x: 3, y: 0 },
      { id: "Treasure Room", x: 4, y: 0 },
      { id: "Lamp Chamber", x: 5, y: 0, rooms: [0x10] },
      { id: "Dark Chamber", x: 4, y: 1, save: true },
      { id: "Silent Chamber", x: 5, y: 1 },
      { id: "Relic Chamber", x: 4, y: 2 },
      { id: "Hidden Room", x: 5, y: 2 },
    ],
    edges: [
      ["Agrabah: Plaza", "Agrabah: Storage"], ["Agrabah: Plaza", "Main Street"], ["Main Street", "Palace Gates"],
      ["Main Street", "Agrabah: Alley"], ["Main Street", "Agrabah: Bazaar"], ["Main Street", "Aladdin's House"],
      ["Agrabah: Alley", "Agrabah: Bazaar", "approx"],
      ["Agrabah: Plaza", "Cave: Entrance", "approx"], // via the Desert, once the Carpet joins
      ["Cave: Entrance", "Cave: Hall"], ["Cave: Hall", "Bottomless Hall"], ["Bottomless Hall", "Treasure Room"],
      ["Treasure Room", "Lamp Chamber"],
      ["Cave: Hall", "Dark Chamber", "approx"], ["Dark Chamber", "Relic Chamber", "approx"],
      ["Dark Chamber", "Silent Chamber", "approx"], ["Relic Chamber", "Hidden Room", "approx"],
    ],
  },

  "Monstro": {
    nodes: [
      { id: "Throat", x: 0, y: 0, rooms: [0x02] },
      { id: "Monstro: Mouth", label: "Mouth", x: 0, y: 1, save: true },
      { id: "Chamber 1", x: 1, y: 1 },
      { id: "Monstro: Chamber 3", label: "Chamber 3", x: 1, y: 2 },
      { id: "Monstro: Chamber 2", label: "Chamber 2", x: 2, y: 1 },
      { id: "Monstro: Chamber 5", label: "Chamber 5", x: 2, y: 0 },
      { id: "Chamber 6", x: 3, y: 0 },
      { id: "Chamber 4", x: 3, y: 1, save: true },
      { id: "Bowels", x: 4, y: 1 },
    ],
    edges: [
      ["Monstro: Mouth", "Throat"], ["Monstro: Mouth", "Chamber 1"], ["Chamber 1", "Monstro: Chamber 3"],
      ["Chamber 1", "Monstro: Chamber 2"], ["Monstro: Chamber 2", "Monstro: Chamber 3"],
      ["Monstro: Chamber 2", "Monstro: Chamber 5"], ["Monstro: Chamber 5", "Chamber 6", "approx"],
      ["Monstro: Chamber 5", "Chamber 4"], ["Chamber 4", "Bowels"],
    ],
  },

  "Atlantica": {
    nodes: [
      { id: "Triton's Throne", label: "Throne Room", x: 0, y: 0, rooms: [0x0F], save: true },
      { id: "Triton's Palace", x: 1, y: 0, rooms: [0x0E], match: ["Triton's Palace"] },
      { id: "Undersea Garden", x: 0, y: 1, rooms: [0x05] },
      { id: "Undersea Gorge", x: 1, y: 1, rooms: [0x03], match: ["Undersea Gorge"] },
      { id: "Ariel's Grotto", x: 2, y: 1, rooms: [0x0D], match: ["Ariel's Grotto"] },
      { id: "Sunken Ship", x: 3, y: 1, rooms: [0x06], match: ["Sunken Ship"] },
      { id: "Below Deck", x: 4, y: 1, rooms: [0x07] },
      { id: "Tranquil Grotto", x: 0, y: 2 },
      { id: "Undersea Valley", x: 1, y: 2, rooms: [0x00] },
      { id: "Calm Depths", x: 2, y: 2 },
      { id: "Undersea Cave", x: 3, y: 2, rooms: [0x04] },
      { id: "Den of Tides", x: 4, y: 2 },
      { id: "Ursula's Lair", x: 2, y: 3, rooms: [0x0C], match: ["Ursula's Lair"] },
      { id: "Tidal Abyss", x: 3, y: 3 },
      { id: "Cavern Nook", x: 4, y: 3, rooms: [0x0A], save: true },
    ],
    edges: [
      ["Tranquil Grotto", "Undersea Valley"], ["Undersea Valley", "Calm Depths"], ["Calm Depths", "Undersea Cave"],
      ["Undersea Valley", "Undersea Gorge", "approx"], ["Undersea Cave", "Undersea Gorge", "approx"],
      ["Undersea Gorge", "Ariel's Grotto"], ["Undersea Gorge", "Undersea Garden"], ["Undersea Gorge", "Triton's Palace"],
      ["Triton's Palace", "Triton's Throne"], ["Undersea Gorge", "Sunken Ship"], ["Sunken Ship", "Below Deck"],
      ["Sunken Ship", "Den of Tides"], ["Den of Tides", "Cavern Nook"], ["Den of Tides", "Tidal Abyss"],
      ["Tidal Abyss", "Ursula's Lair"],
    ],
  },

  "Halloween Town": {
    nodes: [
      { id: "Research Lab", x: 1, y: 0, rooms: [0x0A] },
      { id: "Torture Chamber", x: 4, y: 0, rooms: [0x07, 0x08] },
      { id: "Guillotine Gate", x: 0, y: 1 },
      { id: "Guillotine Square", x: 1, y: 1, rooms: [0x00] },
      { id: "Graveyard", x: 2, y: 1, rooms: [0x02] },
      { id: "Boneyard", x: 3, y: 1 },
      { id: "Oogie Manor/Manor Ruins", label: "Oogie's Manor", x: 4, y: 1 },
      { id: "Cemetery", x: 2, y: 2 },
      { id: "Moonlight Hill", x: 3, y: 2 },
      { id: "Bridge", x: 4, y: 2 },
    ],
    edges: [
      ["Guillotine Gate", "Guillotine Square"], ["Guillotine Square", "Research Lab"], ["Guillotine Square", "Graveyard"],
      ["Graveyard", "Boneyard"], ["Boneyard", "Moonlight Hill"], ["Moonlight Hill", "Graveyard"],
      ["Moonlight Hill", "Cemetery"], ["Moonlight Hill", "Bridge"], ["Bridge", "Oogie Manor/Manor Ruins"],
      ["Oogie Manor/Manor Ruins", "Torture Chamber"], ["Bridge", "Guillotine Square", "approx"], // sewers
    ],
  },

  "Olympus Coliseum": {
    nodes: [
      { id: "Coliseum Gates", x: 0, y: 0, rooms: [0x00] },
      { id: "Lobby", x: 1, y: 0, rooms: [0x01] },
      { id: "Coliseum", x: 2, y: 0, rooms: [0x02, 0x05, 0x06] },
    ],
    edges: [["Coliseum Gates", "Lobby"], ["Lobby", "Coliseum"]],
  },

  "Neverland": {
    nodes: [
      { id: "Ship: Hold (Yellow Trinity)", label: "Secret Room", x: 0, y: 0 },
      { id: "Ship: Cabin", label: "Cabin", x: 2, y: 0, save: true },
      { id: "Captain's Cabin", x: 3, y: 0 },
      { id: "Ship: Hold", label: "Hold", x: 0, y: 1, rooms: [0x02] },
      { id: "Freezer", x: 1, y: 1 },
      { id: "Ship: Galley", label: "Galley", x: 2, y: 1 },
      { id: "Pirate Ship", x: 3, y: 1, rooms: [0x08] },
      { id: "Clock Tower", x: 4, y: 1, rooms: [0x09] },
    ],
    edges: [
      ["Ship: Hold", "Ship: Hold (Yellow Trinity)"], ["Ship: Hold", "Freezer"], ["Freezer", "Ship: Galley"],
      ["Ship: Galley", "Ship: Cabin"], ["Ship: Cabin", "Captain's Cabin"], ["Ship: Cabin", "Pirate Ship", "approx"],
      ["Pirate Ship", "Clock Tower"],
    ],
  },

  "Hollow Bastion": {
    nodes: [
      { id: "High Tower", x: 1, y: 0 },
      { id: "Castle Chapel", x: 2, y: 0, rooms: [0x0B] },
      { id: "Great Crest", x: 1, y: 1 },
      { id: "Lift Stop", x: 2, y: 1 },
      { id: "Grand Hall", x: 3, y: 1 },
      { id: "Library", x: 0, y: 2, rooms: [0x05], save: true, match: ["Library"] },
      { id: "Entrance Hall", x: 1, y: 2, rooms: [0x04], match: ["Entrance Hall"] },
      { id: "Rising Falls", x: 0, y: 3 },
      { id: "Castle Gates", x: 1, y: 3 },
      { id: "Base Level", x: 1, y: 4 },
      { id: "Waterway", x: 2, y: 4 },
      { id: "Dungeon", x: 3, y: 4 },
    ],
    edges: [
      ["Rising Falls", "Castle Gates"], ["Castle Gates", "Base Level"], ["Base Level", "Waterway"],
      ["Waterway", "Dungeon"], ["Castle Gates", "Entrance Hall"], ["Entrance Hall", "Library"],
      ["Library", "Lift Stop"], ["Entrance Hall", "Great Crest"], // via the second half of the Castle Gates
      ["Great Crest", "Lift Stop"], ["Great Crest", "High Tower"], ["High Tower", "Lift Stop"],
      ["High Tower", "Castle Chapel"], ["Castle Chapel", "Lift Stop"], ["Lift Stop", "Grand Hall"],
    ],
  },

  "End of the World": {
    nodes: [
      ...["Traverse Town", "Wonderland", "Olympus Coliseum", "Deep Jungle", "Agrabah"].map((w, i) => (
        { id: "World Terminus: " + w, label: "WT: " + w.replace("Olympus Coliseum", "Olympus"), x: i, y: 0 })),
      { id: "Final Dimension", x: 0, y: 1 },
      { id: "Giant Crevasse", x: 1, y: 1 },
      { id: "World Terminus", x: 2, y: 1 },
      { id: "Final Rest", x: 4, y: 1, save: true },
      ...["Atlantica", "Halloween Town", "Neverland", "100 Acre Wood", "Hollow Bastion"].map((w, i) => (
        { id: "World Terminus: " + w, label: "WT: " + w, x: i, y: 2, rooms: w === "Atlantica" ? [0x15] : undefined })),
    ],
    edges: [
      ["Final Dimension", "Giant Crevasse"], ["Giant Crevasse", "World Terminus"],
      ["World Terminus", "Final Rest", "approx"], // via Evil Grounds and the Volcanic Crater
      ...["Traverse Town", "Wonderland", "Olympus Coliseum", "Deep Jungle", "Agrabah", "Atlantica", "Halloween Town",
        "Neverland", "100 Acre Wood", "Hollow Bastion"].map((w) => ["World Terminus", "World Terminus: " + w]),
    ],
  },
};
