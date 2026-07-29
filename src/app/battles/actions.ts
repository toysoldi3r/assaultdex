"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseReplay } from "@/data/replay";
import { analyzeReplay } from "@/domain/analysis/postBattle";
import type { Difficulty } from "@/domain/sim/policy";
import { generateSampleReplay } from "@/server/battleGenerate";
import {
  deleteAllBattles,
  deleteBattle,
  saveBattle,
} from "@/server/repositories/battleRepo";

export async function generateBattleAction(formData: FormData): Promise<void> {
  const u1 = String(formData.get("u1") ?? "");
  const u2 = String(formData.get("u2") ?? "");
  const o1 = String(formData.get("o1") ?? "");
  const o2 = String(formData.get("o2") ?? "");
  const difficulty = (String(formData.get("difficulty") ?? "standard") as Difficulty);
  if (!u1 || !u2 || !o1 || !o2) redirect("/battles?err=missing");

  const replay = await generateSampleReplay({
    userTeam: [u1, u2],
    opponentTeam: [o1, o2],
    difficulty,
    seed: Math.floor(Math.random() * 0x7fffffff),
  });
  if (!replay) redirect("/battles?err=build");

  const analysis = analyzeReplay(replay!, "aggressive");
  const id = await saveBattle({
    label: `${u1} + ${u2} vs ${o1} + ${o2}`,
    replay: replay!,
    analysis,
    source: "generated",
  });
  revalidatePath("/battles");
  redirect(`/battles/${id}`);
}

export async function importBattleAction(formData: FormData): Promise<void> {
  const label = String(formData.get("label") ?? "").trim() || "Imported battle";
  const text = String(formData.get("json") ?? "");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    redirect("/battles?err=json");
  }
  const parsed = parseReplay(raw);
  if (!parsed.ok || !parsed.replay) {
    redirect("/battles?err=shape");
  }
  const analysis = analyzeReplay(parsed.replay!, "balanced");
  const id = await saveBattle({
    label,
    replay: parsed.replay!,
    analysis,
    source: "imported",
  });
  revalidatePath("/battles");
  redirect(`/battles/${id}`);
}

export async function deleteBattleAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await deleteBattle(id);
  revalidatePath("/battles");
  redirect("/battles");
}

export async function deleteAllBattlesAction(): Promise<void> {
  await deleteAllBattles();
  revalidatePath("/battles");
}
