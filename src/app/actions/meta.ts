"use server";

// On-demand metagame refresh. Fetches the MunchStats Champions team-rankings
// (the same private-repo source the scheduled CI job uses), aggregates it, and
// rewrites the committed snapshot. Runs on the machine hosting the app; in the
// local dev launcher the homepage picks up the new file on the next load.

import { writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { revalidatePath } from "next/cache";
import { CHAMPIONS_FORMAT, aggregateRankings } from "@/data/usageStats";

const RAW_BASE =
  "https://raw.githubusercontent.com/PizzaTimeJoshua/munchstats/replay-data/stats/replays/";

export async function refreshMetagameAction(): Promise<void> {
  const url = `${RAW_BASE}team-rankings-${CHAMPIONS_FORMAT}.json.gz`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text = gunzipSync(buf).toString("utf8");
  const rows = JSON.parse(text) as { team: string[]; wins?: number; total_battles?: number }[];

  const data = aggregateRankings(rows);
  const out = resolve(process.cwd(), `src/data/fixtures/usage/${CHAMPIONS_FORMAT}.json`);
  await writeFile(out, JSON.stringify(data), "utf8");
  revalidatePath("/");
}
