"use client";

// Full-width team-analysis strip below the builder. A one-line summary sits in
// the header. The open body is three columns: defensive weaknesses · speed
// tiers (with coverage gaps beneath) · immunities & resistances. A field-control
// row (hazards · removal · speed/priority control · weather) follows.

import { PokeIcon } from "@/components/PokeIcon";
import { TypeBadge } from "@/components/ui";
import type { TeamAnalysis } from "@/domain/team/analysis";
import type { PokemonType } from "@/domain/types/pokemon";

const WEATHER_LABEL: Record<string, string> = { sun: "Sun", rain: "Rain", sand: "Sandstorm", snow: "Snow" };

// Compact multiplier label (e.g. ×0, ×0.25, ×0.5, ×2, ×4).
const multLabel = (m: number) => `×${m}`;

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
  const resistances = analysis.resistances.filter((r) => r.members.length > 0);
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
          {weaknesses.length === 0 && <p className="text-xs text-t3">No weaknesses.</p>}
          <ul className="space-y-1 text-xs">
            {weaknesses.slice(0, 12).map((w) => (
              <li key={w.type} className="flex items-center gap-2">
                <TypeBadge type={w.type as PokemonType} />
                <span className={w.shared ? "font-semibold text-neg" : "text-t2"}>
                  ×{w.members.length}{w.shared ? " shared" : ""}
                </span>
                {w.major && (
                  <span className="rounded px-1 text-[10px] font-semibold text-neg" style={{ background: "rgba(214,120,120,0.16)" }} title="At least one member takes 4× damage">
                    4× major
                  </span>
                )}
                <span className="ml-auto flex flex-wrap gap-0.5">
                  {w.detail.map((d, mi) => (
                    <span key={`${d.name}-${mi}`} title={`${d.name} ${multLabel(d.mult)}`}
                      className={d.mult >= 4 ? "rounded ring-1 ring-neg" : undefined}>
                      <PokeIcon species={d.name} />
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Speed tiers (compact) + coverage gaps beneath */}
        <div className="flex flex-col gap-3 border-line px-3.5 py-3 md:border-r">
          <div>
            <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-t3">Speed tiers</h3>
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
          <div className="border-t border-soft pt-2">
            <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-t3">Coverage gaps</h3>
            {analysis.offensiveGaps.length === 0 ? (
              <p className="text-xs text-pos">Hits every type super-effectively.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-t2">No super-effective answer to:</span>
                {analysis.offensiveGaps.map((t) => <TypeBadge key={t} type={t} />)}
              </div>
            )}
          </div>
        </div>

        {/* Immunities & resistances */}
        <div className="px-3.5 py-3">
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-t3">Immunities &amp; resistances</h3>
          {resistances.length === 0 && <p className="text-xs text-t3">No resistances.</p>}
          <ul className="space-y-1 text-xs">
            {resistances.slice(0, 12).map((r) => {
              const immune = r.members.some((m) => m.mult === 0);
              return (
                <li key={r.type} className="flex items-center gap-2">
                  <TypeBadge type={r.type as PokemonType} />
                  {immune && (
                    <span className="rounded px-1 text-[10px] font-semibold text-pos" style={{ background: "rgba(111,196,143,0.16)" }} title="At least one member is immune">
                      0× immune
                    </span>
                  )}
                  {/* Fixed-width cells (icon + right-aligned multiplier) so ×0.5
                      and ×0.25 line up in straight columns across rows. */}
                  <span className="flex flex-1 flex-wrap items-center gap-1">
                    {r.members.map((m, mi) => (
                      <span key={`${m.name}-${mi}`} className="flex w-[72px] items-center gap-0.5" title={`${m.name} ${multLabel(m.mult)}`}>
                        <span className={m.mult === 0 ? "rounded ring-1 ring-pos" : undefined}>
                          <PokeIcon species={m.name} />
                        </span>
                        <span className={`w-[30px] text-right tabular-nums ${m.mult === 0 ? "font-semibold text-pos" : "text-t3"}`}>{multLabel(m.mult)}</span>
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Field control */}
      <div className="grid border-t border-line md:grid-cols-4">
        <FieldCol title="Entry hazards" tone="neg" items={fc.hazards} />
        <FieldCol title="Hazard removal" tone="acc" items={fc.hazardRemoval} border />
        {/* Speed & priority control */}
        <div className="border-line px-3.5 py-3 md:border-l">
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-t3">Speed &amp; priority control</h3>
          {analysis.speedControl.missing ? (
            <p className="text-xs text-t3">None.</p>
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
        {/* Weather */}
        <div className="border-line px-3.5 py-3 md:border-l">
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-t3">Weather</h3>
          {analysis.weatherControl.missing ? (
            <p className="text-xs text-t3">None.</p>
          ) : (
            <ul className="space-y-0.5 text-xs text-t2">
              {analysis.weatherControl.setters.map((w, i) => (
                <li key={i} className="flex items-center gap-1.5"><PokeIcon species={w.member} /><span className="font-medium">{WEATHER_LABEL[w.weather] ?? w.weather}</span><span className="text-t3">via {w.source}</span></li>
              ))}
            </ul>
          )}
        </div>
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
