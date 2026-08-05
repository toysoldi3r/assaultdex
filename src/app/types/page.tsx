import { TypeMatchup } from "@/components/database/TypeMatchup";

export const metadata = { title: "Type chart — AssaultDex" };

export default function TypesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Type effectiveness</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Pick an attacking move type to read its effectiveness against every
          defending type combination, or use the full single-type chart below.
        </p>
      </div>
      <TypeMatchup />
    </div>
  );
}
