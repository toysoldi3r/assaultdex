// Battle-history repository (Phase 9). Stores a provisional replay plus its
// post-battle summary; supports deleting individual battles or the whole
// history (spec: users can delete their battle history and analytics).

import { prisma } from "../db";
import type { BattleAnalysis } from "@/domain/analysis/postBattle";
import type { BattleSummary } from "@/domain/analysis/dashboard";
import type { Replay } from "@/domain/replay/types";

export function summaryFromAnalysis(a: BattleAnalysis): BattleSummary {
  return {
    result: a.result,
    decisionQuality: a.decisionQuality,
    missedKos: a.missedKos,
    turningPoints: a.turningPoints,
    turns: a.turns.length,
    koCalibration: a.koCalibration,
  };
}

export interface SaveBattleInput {
  label?: string;
  replay: Replay;
  analysis: BattleAnalysis;
  source: "imported" | "generated";
}

export async function saveBattle(input: SaveBattleInput): Promise<string> {
  const summary = summaryFromAnalysis(input.analysis);
  const rec = await prisma.battleRecord.create({
    data: {
      label: input.label ?? "",
      result: input.analysis.result,
      turns: input.analysis.turns.length,
      replay: JSON.stringify(input.replay),
      summary: JSON.stringify(summary),
      source: input.source,
    },
  });
  return rec.id;
}

export interface BattleListItem {
  id: string;
  label: string;
  result: string;
  turns: number;
  source: string;
  createdAt: Date;
  summary: BattleSummary;
}

export async function listBattles(): Promise<BattleListItem[]> {
  const rows = await prisma.battleRecord.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    result: r.result,
    turns: r.turns,
    source: r.source,
    createdAt: r.createdAt,
    summary: JSON.parse(r.summary) as BattleSummary,
  }));
}

export async function getBattleReplay(
  id: string,
): Promise<{ label: string; replay: Replay } | null> {
  const r = await prisma.battleRecord.findUnique({ where: { id } });
  if (!r) return null;
  return { label: r.label, replay: JSON.parse(r.replay) as Replay };
}

export async function deleteBattle(id: string): Promise<void> {
  await prisma.battleRecord.delete({ where: { id } });
}

export async function deleteAllBattles(): Promise<void> {
  await prisma.battleRecord.deleteMany({});
}
