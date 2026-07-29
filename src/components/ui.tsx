import type { PokemonType } from "@/domain/types/pokemon";

const TYPE_COLORS: Record<PokemonType, string> = {
  normal: "bg-stone-500",
  fire: "bg-orange-600",
  water: "bg-blue-600",
  electric: "bg-yellow-500 text-black",
  grass: "bg-green-600",
  ice: "bg-cyan-400 text-black",
  fighting: "bg-red-700",
  poison: "bg-fuchsia-700",
  ground: "bg-amber-700",
  flying: "bg-sky-400 text-black",
  psychic: "bg-pink-600",
  bug: "bg-lime-600 text-black",
  rock: "bg-yellow-800",
  ghost: "bg-indigo-700",
  dragon: "bg-violet-700",
  dark: "bg-neutral-800",
  steel: "bg-slate-500",
  fairy: "bg-pink-400 text-black",
};

export function TypeBadge({ type }: { type: PokemonType }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white ${TYPE_COLORS[type]}`}
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
