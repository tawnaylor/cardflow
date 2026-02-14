export const STORAGE_KEY = "cardflow_cards_v1";

/**
 * Demo cards (used when localStorage is empty).
 * This is the data shape your real "Add Card / Scan" flow should save.
 */
export const demoCards = [
  {
    id: "pk-001",
    game: "pokemon",
    name: "Charizard",
    set: "Base Set",
    setCode: "BS",
    number: "4/102",
    rarity: "holo",
    value: 275.00,
    addedAt: Date.now() - 1000 * 60 * 60 * 2
  },
  {
    id: "pk-002",
    game: "pokemon",
    name: "Pikachu",
    set: "Jungle",
    setCode: "JU",
    number: "60/64",
    rarity: "common",
    value: 4.20,
    addedAt: Date.now() - 1000 * 60 * 25
  },
  {
    id: "mtg-001",
    game: "mtg",
    name: "Black Lotus",
    set: "Alpha",
    setCode: "LEA",
    number: "233",
    rarity: "secret",
    value: 125000.00,
    addedAt: Date.now() - 1000 * 60 * 60 * 30
  },
  {
    id: "pk-003",
    game: "pokemon",
    name: "Gengar",
    set: "Fossil",
    setCode: "FO",
    number: "5/62",
    rarity: "holo",
    value: 95.50,
    addedAt: Date.now() - 1000 * 60 * 60 * 8
  },
  {
    id: "mtg-002",
    game: "mtg",
    name: "Sol Ring",
    set: "Commander",
    setCode: "CMD",
    number: "259",
    rarity: "rare",
    value: 3.50,
    addedAt: Date.now() - 1000 * 60 * 60 * 10
  },
  {
    id: "pk-004",
    game: "pokemon",
    name: "Mewtwo",
    set: "Base Set",
    setCode: "BS",
    number: "10/102",
    rarity: "rare",
    value: 22.10,
    addedAt: Date.now() - 1000 * 60 * 60 * 20
  },
  {
    id: "mtg-003",
    game: "mtg",
    name: "Lightning Bolt",
    set: "Revised Edition",
    setCode: "3ED",
    number: "163",
    rarity: "common",
    value: 2.35,
    addedAt: Date.now() - 1000 * 60 * 60 * 14
  },
  {
    id: "pk-005",
    game: "pokemon",
    name: "Rayquaza",
    set: "Emerald",
    setCode: "EM",
    number: "13/106",
    rarity: "holo",
    value: 38.00,
    addedAt: Date.now() - 1000 * 60 * 60 * 22
  },
  {
    id: "mtg-004",
    game: "mtg",
    name: "Counterspell",
    set: "Ice Age",
    setCode: "ICE",
    number: "64",
    rarity: "common",
    value: 1.10,
    addedAt: Date.now() - 1000 * 60 * 60 * 4
  },
  {
    id: "pk-006",
    game: "pokemon",
    name: "Greninja",
    set: "XY",
    setCode: "XY",
    number: "41/146",
    rarity: "rare",
    value: 6.80,
    addedAt: Date.now() - 1000 * 60 * 60 * 6
  }
];
