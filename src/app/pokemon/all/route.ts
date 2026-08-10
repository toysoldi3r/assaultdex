import { listDexEntries } from "@/data/pokedexSource";

// Full-dex entries as a static, cached JSON payload. The Pokédex page ships only
// the Champions roster up front; this is fetched once, on demand, the first time
// a visitor switches to "Full dex" - keeping the initial load small.
export const dynamic = "force-static";

export function GET() {
  return Response.json(listDexEntries());
}
