import { redirect } from "next/navigation";
import { GuideLanding } from "@/components/guide/GuideLanding";
import { guideLessonHref, resolveGuideLessonId } from "@/data/guideLessons";

export const metadata = {
  title: "Guide",
  description: "A beginner's course: how to use AssaultDex, then competitive Pokémon battle fundamentals through to team building.",
};

export default async function GuidePage({ searchParams }: { searchParams: Promise<{ lesson?: string | string[] }> }) {
  // The old single-page Guide linked lessons as /guide?lesson=<id>; send those
  // links to the matching lesson page.
  const { lesson } = await searchParams;
  const id = typeof lesson === "string" ? resolveGuideLessonId(lesson) : null;
  if (id) redirect(guideLessonHref(id));
  return <GuideLanding />;
}
