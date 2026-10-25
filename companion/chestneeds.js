// What a chest needs before you can reach or open it, from walkthroughs only. Keyed by world, then the
// chest's name as in KH1_CHESTS. `need`: all of these (same names as the chest data, so logic.js's
// has() can judge them); `src`: the walkthroughs that state it outright for this chest.
// Kept only where 2+ walkthroughs say it and none says otherwise; a chest not listed needs nothing
// the guides agree on. Sources and disagreements: docs/chest-needs-sources.md.
//   KW KH Wiki walkthrough · ES ElectroSpecter · KC KingContributor · WP winnie_the_poop & MTincher ·
//   SS Spirit_Slash3r · CC CChan (Final Mix) · EP EmPleh, Trinity Mark FAQ (all GameFAQs) · IGN IGN wiki
window.KH1_CHEST_NEEDS = {
  "Traverse Town": {
    "1st District Blue Trinity Balcony Chest": { need: ["Blue Trinity"], src: "KW ES KC WP" },
    "1st District Candle Puzzle Chest": { need: ["Progressive Blizzard"], src: "KW ES KC SS" },
    "Alleyway Behind Crates Chest": { need: ["Red Trinity"], src: "KW ES KC WP CC" },
    "Item Workshop Left Chest": { need: ["Green Trinity"], src: "KW ES KC WP IGN" },
    "Mystical House Glide Chest": { need: ["Progressive Glide"], src: "KW ES KC CC" },
    "Mystical House Yellow Trinity Chest": { need: ["Yellow Trinity"], src: "ES EP" },
    "Secret Waterway Near Stairs Chest": { need: ["Red Trinity"], src: "ES KC WP" },
    "Secret Waterway White Trinity Chest": { need: ["White Trinity"], src: "KW ES SS" },
  },
  "Wonderland": {
    "Bizarre Room Green Trinity Chest": { need: ["Green Trinity"], src: "KW ES" },
    "Rabbit Hole Green Trinity Chest": { need: ["Green Trinity"], src: "KW ES" },
    "Lotus Forest Glide Chest": { need: ["Progressive Glide"], src: "KW ES" },
    "Lotus Forest Thunder Plant Chest": { need: ["Progressive Thunder"], src: "KW ES" },
    "Lotus Forest Through the Painting White Trinity Chest": { need: ["White Trinity"], src: "KW ES SS" },
    "Tea Party Garden Above Lotus Forest Entrance 1st Chest": { need: ["Progressive Glide"], src: "ES KC WP CC" },
    "Tea Party Garden Across From Bizarre Room Entrance Chest": { need: ["Progressive Glide"], src: "KW ES" },
  },
  "Olympus Coliseum": {
    "Coliseum Gates Blizzaga Chest": { need: ["Progressive Blizzard:3"], src: "ES CC" },
    "Coliseum Gates Left Blue Trinity Chest": { need: ["Blue Trinity"], src: "KW ES" },
    "Coliseum Gates Right Blue Trinity Chest": { need: ["Blue Trinity"], src: "KW ES KC WP CC" },
    "Coliseum Gates White Trinity Chest": { need: ["White Trinity"], src: "KW ES SS" },
  },
  "Deep Jungle": {
    "Camp Blue Trinity Chest": { need: ["Blue Trinity"], src: "KW ES KC WP CC" },
    "Climbing Trees Blue Trinity Chest": { need: ["Blue Trinity"], src: "KW ES KC WP CC" },
    "Cavern of Hearts White Trinity Chest": { need: ["White Trinity"], src: "ES SS" },
    "Tree House Suspended Boat Chest": { need: ["Progressive Glide"], src: "KW ES" },
  },
  "Agrabah": {
    "Cave of Wonders Entrance White Trinity Chest": { need: ["White Trinity"], src: "ES WP SS CC" },
    "Cave of Wonders Silent Chamber Blue Trinity Chest": { need: ["Blue Trinity"], src: "KW WP EP" },
    "Palace Gates High Close to Palace Chest": { need: ["High Jump"], src: "ES KC" },
    "Palace Gates High Opposite Palace Chest": { need: ["High Jump", "Progressive Glide"], src: "ES KC WP" },
    "Storage Green Trinity Chest": { need: ["Green Trinity"], src: "KW ES" },
  },
  "Monstro": {
    "Mouth Green Trinity Top of Boat Chest": { need: ["Green Trinity", "High Jump"], src: "KW SS" },
    "Mouth High Platform Across from Boat Chest": { need: ["High Jump"], src: "ES KC WP" },
    "Mouth High Platform Near Teeth Chest": { need: ["High Jump"], src: "KC SS" },
    "Mouth Near Ship Chest": { need: ["High Jump"], src: "KC IGN" },
    "Chamber 6 White Trinity Chest": { need: ["White Trinity"], src: "KW ES SS" },
  },
  "Atlantica": {
    "Triton's Palace White Trinity Chest": { need: ["White Trinity"], src: "ES SS" },
  },
  "Halloween Town": {
    "Guillotine Square Pumpkin Structure Left Chest": { need: ["Progressive Glide"], src: "ES WP" },
    "Guillotine Square Pumpkin Structure Right Chest": { need: ["Progressive Glide"], src: "ES WP CC IGN" },
    "Moonlight Hill White Trinity Chest": { need: ["White Trinity"], src: "ES SS" },
    "Oogie's Manor Grounds Red Trinity Chest": { need: ["Red Trinity"], src: "KW CC" },
  },
  "Neverland": {
    "Captain's Cabin Chest": { need: ["Green Trinity"], src: "KW ES" },
    "Hold Yellow Trinity Green Chest": { need: ["Yellow Trinity"], src: "ES KC WP CC EP" },
    "Hold Yellow Trinity Left Blue Chest": { need: ["Yellow Trinity"], src: "ES KC EP" },
    "Hold Yellow Trinity Right Blue Chest": { need: ["Yellow Trinity"], src: "ES KC EP" },
    "Pirate Ship Deck White Trinity Chest": { need: ["White Trinity"], src: "ES SS EP" },
  },
  "Hollow Bastion": {
    "Rising Falls High Platform Chest": { need: ["Progressive Glide"], src: "KW ES KC WP SS" },
    "Rising Falls White Trinity Chest": { need: ["White Trinity"], src: "KW ES WP SS" },
    "Castle Gates Freestanding Pillar Chest": { need: ["Progressive Glide"], src: "KW ES WP SS" },
    "Castle Gates High Pillar Chest": { need: ["Progressive Glide"], src: "KW ES WP SS" },
    "Castle Gates Gravity Chest": { need: ["Progressive Gravity"], src: "KW ES KC WP SS CC IGN" },
    "High Tower 1st Gravity Chest": { need: ["Progressive Gravity"], src: "KW ES KC WP SS" },
    "High Tower 2nd Gravity Chest": { need: ["Progressive Gravity"], src: "KW ES KC WP SS CC" },
    "Library Top of Bookshelf Chest": { need: ["Progressive Glide"], src: "KW KC WP" },
    "Lift Stop Heartless Sigil Door Gravity Chest": { need: ["Progressive Gravity"], src: "KW ES KC WP SS" },
    "Lift Stop Library Node Gravity Chest": { need: ["Progressive Gravity"], src: "ES KC WP" },
    "Lift Stop Outside Library Gravity Chest": { need: ["Progressive Gravity"], src: "ES WP SS" },
    "Lift Stop Under High Tower Sliding Blocks Chest": { need: ["Progressive Glide", "Progressive Gravity"], src: "KW ES WP" },
  },
};
