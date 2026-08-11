import type { PokemonType } from "@/domain/types/pokemon";

// Current-generation game type colours.
export const TYPE_HEX: Record<PokemonType, string> = {
  normal: "#9FA19F", fire: "#E8503A", water: "#2980EF", electric: "#F7C325", grass: "#43A93C",
  ice: "#3DCEF3", fighting: "#FF8000", poison: "#9141CB", ground: "#A9702F", flying: "#81B9EF",
  psychic: "#EF4179", bug: "#9CAA22", rock: "#B7AF7E", ghost: "#7B4E8C", dragon: "#5060E1",
  dark: "#6B5453", steel: "#60A1B8", fairy: "#EF70EF",
};

export function TypeBadge({ type }: { type: PokemonType }) {
  return (
    <span
      className="inline-block rounded-full text-[9px] font-bold uppercase leading-3"
      style={{
        padding: "2px 8px",
        letterSpacing: "0.09em",
        backgroundColor: TYPE_HEX[type],
        color: "#ffffff",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
      }}
    >
      {type}
    </span>
  );
}

export function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-slate-800 bg-slate-900/40 p-4 ${className}`}
    >
      {title ? (
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function ProvisionalTag() {
  return (
    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
      provisional
    </span>
  );
}
