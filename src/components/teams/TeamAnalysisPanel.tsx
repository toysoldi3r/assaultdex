"use client";

// Full-width team-analysis strip below the builder. A one-line summary sits in
// the header; the open body is three columns (weaknesses · speed tiers · control
// and coverage). Field control (hazards / removal / protection / boosts) follows.

import { PokeIcon } from "@/components/PokeIcon";
import { TypeBadge } from "@/components/ui";
import type { TeamAnalysis } from "@/domain/team/analysis";
import type { PokemonType } from "@/domain/types/pokemon";

const WEATHER_LABEL: Record<string, string> = { sun: "Sun", rain: "Rain", sand: "Sandstorm", snow: "Snow" };

function summarize(a: TeamAnalysis): string {
  const parts: string[] = [];
  const shared = a.weaknesses.filter((w) => w.shared);
  if (shared.length) parts.push(`${shared.length} shared weakness${shared.length === 1 ? "" : "es"} (${shared.map((w) => w.type).join(", ")})`);
  else parts.push("no shared weaknesses");
  parts.push(a.offensiveGaps.length ? `${a.offensiveGaps.length} coverage gap${a.offensiveGaps.length === 1 ? "" : "s"}` : "full coverage");
  parts.push(a.weatherControl.missing ? "no weather control" : "weather control set");
  return parts.join(" · ");
}

export function TeamAnalysisPanel({ analysis }: { analysis: TeamAnalysis }) {
  const maxSpeed = Math.max(1, ...analysis.speedTiers.map((s) => s.speed));
  const weaknesses = analysis.weaknesses.filter((w) => w.members.length > 0);
  const fc = analysis.fieldControl;

  return (
    <details open className="rounded-lg border border-line bg-panel">
      <summary className="flex cursor-pointer items-center gap-2 px-3.5 py-3">
        <span className="text-[12px] font-[600] text-t1">Team analysis</span>
        <span className="text-[11px] text-t3">{summarize(analysis)}</span>
      </summary>

      <div className="grid border-t border-line md:grid-cols-3">
        {/* Defensive weaknesses */}
        <div className="border-line px-3.5 py-3 md:border-r">
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-t3">Defensive weaknesses</h3>
          {weaknesses.length === 0 && <p className="text-xs text-t3">No shared weaknesses.</p>}
          <ul className="space-y-1 text-xs">
            {weaknesses.slice(0, 12).map((w) => (
              <li key={w.type} className="flex items-center gap-2">
                <TypeBadge type={w.type as PokemonType} />
                <span className={w.shared ? "font-semibold text-neg" : "text-t2"}>
                  ×{w.members.length}{w.shared ? " shared" : ""}
                </span>
                <span className="ml-auto flex flex-wrap gap-0.5">
                  {w.members.map((m, mi) => <span key={`${m}-${mi}`} title={m}><PokeIcon species={m} /></span>)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Speed tiers */}
        <div className="border-line px-3.5 py-3 md:border-r">
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-t3">Speed tiers (Lv 50)</h3>
          <ul className="space-y-1">
            {analysis.speedTiers.map((s, si) => (
              <li key={`${s.name}-${si}`} className="flex items-center gap-2 text-xs">
                <span className="flex w-24 items-center gap-1 truncate">
                  <PokeIcon species={s.name} /><span className="truncate">{s.name}</span>
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded" style={{ background: "var(--raise)" }}>
                  <span className="block h-full rounded" style={{ width: `${(s.speed / maxSpeed) * 100}%`, background: "var(--acc)" }} />
                </span>
                <span className="w-8 text-right tabular-nums text-t2">{s.speed}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Control + coverage */}
        <div className="space-y-3 px-3.5 py-3">
          <div>
            <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-t3">Speed &amp; priority control</h3>
            {analysis.speedControl.missing ? (
              <p className="text-xs text-t3">None detected.</p>
            ) : (
              <ul className="space-y-0.5 text-xs text-t2">
                {analysis.speedControl.controlMoves.map((c, i) => (
                  <li key={`c${i}`} className="flex items-center gap-1.5"><PokeIcon species={c.member} /><span className="text-acc">{c.move}</span></li>
                ))}
                {analysis.speedControl.priorityMoves.map((p, i) => (
                  <li key={`p${i}`} className="flex items-center gap-1.5"><PokeIcon species={p.member} /><span className="text-acc">{p.move}</span><span className="text-t3">(priority)</span></li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-t3">Weather</h3>
            {analysis.weatherControl.missing ? (
              <p className="text-xs text-t3">None detected.</p>
            ) : (
              <ul className="space-y-0.5 text-xs text-t2">
                {analysis.weatherControl.setters.map((w, i) => (
                  <li key={i} className="flex items-center gap-1.5"><PokeIcon species={w.member} /><span className="font-medium">{WEATHER_LABEL[w.weather] ?? w.weather}</span><span className="text-t3">via {w.source}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-t3">Coverage gaps</h3>
            {analysis.offensiveGaps.length === 0 ? (
              <p className="text-xs text-pos">Hits every type super-effectively.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-t2">No answer to:</span>
                {analysis.offensiveGaps.map((t) => <TypeBadge key={t} type={t} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Field control */}
      <div className="grid border-t border-line md:grid-cols-4">
        <FieldCol title="Entry hazards" tone="neg" items={fc.hazards} />
        <FieldCol title="Hazard removal" tone="acc" items={fc.hazardRemoval} border />
        <FieldCol title="Protection" tone="pos" items={fc.protection} border />
        <FieldCol title="Boosting moves" tone="warn" items={fc.boosts} border />
      </div>
    </details>
  );
}

function FieldCol({
  title, tone, items, border,
}: {
  title: string;
  tone: "neg" | "acc" | "pos" | "warn";
  items: { member: string; move: string }[];
  border?: boolean;
}) {
  const cls = tone === "neg" ? "text-neg" : tone === "acc" ? "text-acc" : tone === "pos" ? "text-pos" : "text-warn";
  return (
    <div className={`px-3.5 py-3 ${border ? "border-line md:border-l" : ""}`}>
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-t3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-t3">None.</p>
      ) : (
        <ul className="space-y-0.5 text-xs text-t2">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-1.5"><PokeIcon species={it.member} /><span className={cls}>{it.move}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
