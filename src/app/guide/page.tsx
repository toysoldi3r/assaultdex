import { Suspense } from "react";
import { GuideApp } from "@/components/guide/GuideApp";

export const metadata = {
  title: "Guide",
  description: "A beginner's course: how to use AssaultDex, then competitive Pokémon battle fundamentals through to team building.",
};

export default function GuidePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Loading Guide…</div>}>
      <GuideApp />
    </Suspense>
  );
}
