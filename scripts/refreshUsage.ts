// Refresh the committed competitive-usage snapshot. Runs OUT OF BAND (locally or
// in CI via .github/workflows/refresh-usage.yml), never at request time, so the
// deployed app makes no external calls and the aggregated data stays inside this
// private repo. Fetches the source team-ranking file, aggregates it to the
// compact per-Pokémon shape, and writes the snapshot only if it changed.
//
// Source is our own MunchStats repo's replay-data branch (GitHub → GitHub); no
// third-party host is contacted. Override with USAGE_DATA_URL if the branch moves.

import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { aggregateRankings, CHAMPIONS_FORMAT } from "../src/data/usageStats";

const RAW_BASE =
  process.env.USAGE_DATA_URL ||
  "https://raw.githubusercontent.com/PizzaTimeJoshua/munchstats/replay-data/stats/replays/";

const OUT = `src/data/fixtures/usage/${CHAMPIONS_FORMAT}.json`;

/** Fetch a source file. It is published gzipped (.json.gz); some snapshots are
 *  plain .json, so try the gzip variant first and fall back. */
async function fetchRows(base: string): Promise<{ team: string[] }[]> {
  for (const gz of [true, false]) {
    const url = `${RAW_BASE}${base}.json${gz ? ".gz" : ""}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    const text = gz ? gunzipSync(buf).toString("utf8") : buf.toString("utf8");
    return JSON.parse(text) as { team: string[] }[];
  }
  throw new Error(`source not found for ${base} (.json.gz / .json)`);
}

async function main() {
  const rows = await fetchRows(`team-rankings-${CHAMPIONS_FORMAT}`);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("empty source");

  const next = JSON.stringify(aggregateRankings(rows));

  let prev = "";
  try {
    prev = JSON.stringify(JSON.parse(readFileSync(OUT, "utf8")));
  } catch {
    /* no existing snapshot */
  }

  if (next === prev) {
    console.log(`usage snapshot unchanged (${rows.length} teams)`);
    return;
  }
  writeFileSync(OUT, next + "\n");
  console.log(`usage snapshot updated (${rows.length} teams) -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
