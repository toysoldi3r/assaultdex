import { describe, expect, it } from "vitest";
import { listDbItems, getDbItem } from "../dexDatabase";

// The authoritative list of items legal in Pokémon Champions. Any drift between
// this list and the `competitive` flag in dexDatabase means the "Champions"
// item view no longer matches the format's item legality.
const CHAMPIONS_LEGAL_ITEMS = [
  "Abomasite", "Absolite", "Aerodactylite", "Aggronite", "Alakazite",
  "Altarianite", "Ampharosite", "Aspear Berry", "Audinite", "Babiri Berry",
  "Banettite", "Barbaracite", "Beedrillite", "Big Root", "Black Belt",
  "Black Glasses", "Blastoisinite", "Blazikenite", "Bright Powder", "Cameruptite",
  "Chandelurite", "Charcoal", "Charizardite X", "Charizardite Y", "Charti Berry",
  "Cheri Berry", "Chesnaughtite", "Chesto Berry", "Chilan Berry", "Chimechite",
  "Choice Scarf", "Chople Berry", "Clefablite", "Coba Berry", "Colbur Berry",
  "Crabominite", "Damp Rock", "Delphoxite", "Dragalgite", "Dragon Fang",
  "Dragoninite", "Drampanite", "Eelektrossite", "Emboarite", "Excadrite",
  "Expert Belt", "Fairy Feather", "Falinksite", "Feraligite", "Floettite",
  "Focus Band", "Focus Sash", "Froslassite", "Galladite", "Garchompite",
  "Gardevoirite", "Gengarite", "Glalitite", "Glimmoranite", "Golurkite",
  "Greninjite", "Gyaradosite", "Haban Berry", "Hard Stone", "Hawluchanite",
  "Heat Rock", "Heracronite", "Houndoominite", "Icy Rock", "Iron Ball",
  "Kangaskhanite", "Kasib Berry", "Kebia Berry", "King's Rock", "Leftovers",
  "Leppa Berry", "Life Orb", "Light Ball", "Light Clay", "Lopunnite",
  "Lucarionite", "Lum Berry", "Magnet", "Malamarite", "Manectite",
  "Mawilite", "Medichamite", "Meganiumite", "Mental Herb", "Meowsticite",
  "Metagrossite", "Metal Coat", "Metronome", "Miracle Seed", "Muscle Band",
  "Mystic Water", "Never-Melt Ice", "Occa Berry", "Oran Berry", "Passho Berry",
  "Payapa Berry", "Pecha Berry", "Persim Berry", "Pidgeotite", "Pinsirite",
  "Poison Barb", "Pyroarite", "Quick Claw", "Raichunite X", "Raichunite Y",
  "Rawst Berry", "Rindo Berry", "Roseli Berry", "Sablenite", "Sceptilite",
  "Scizorite", "Scolipite", "Scope Lens", "Scovillainite", "Scraftinite",
  "Sharp Beak", "Sharpedonite", "Shed Shell", "Shell Bell", "Shuca Berry",
  "Silk Scarf", "Silver Powder", "Sitrus Berry", "Skarmorite", "Slowbronite",
  "Smooth Rock", "Soft Sand", "Spell Tag", "Staraptite", "Starminite",
  "Steelixite", "Swampertite", "Tanga Berry", "Twisted Spoon", "Tyranitarite",
  "Venusaurite", "Victreebelite", "Wacan Berry", "White Herb", "Wide Lens",
  "Wise Glasses", "Yache Berry", "Zoom Lens",
];

describe("Champions legal items", () => {
  const items = listDbItems();
  const competitive = new Set(items.filter((i) => i.competitive).map((i) => i.name));

  it("has exactly the authoritative count", () => {
    expect(competitive.size).toBe(CHAMPIONS_LEGAL_ITEMS.length);
  });

  it("flags every legal item competitive and nothing else", () => {
    const expected = new Set(CHAMPIONS_LEGAL_ITEMS);
    const missing = CHAMPIONS_LEGAL_ITEMS.filter((n) => !competitive.has(n));
    const extra = [...competitive].filter((n) => !expected.has(n));
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });

  it("surfaces every legal item in the full list, including Champions-only megas", () => {
    const listed = new Set(items.map((i) => i.name));
    // Champions-specific megas @pkmn/dex marks nonstandard: "Future".
    for (const name of ["Greninjite", "Meganiumite", "Raichunite X", "Skarmorite"]) {
      expect(listed.has(name)).toBe(true);
      expect(getDbItem(name)?.competitive).toBe(true);
    }
  });
});
