import { notFound } from "next/navigation";
import { LessonShell } from "@/components/guide/LessonShell";
import { LESSON_BODIES } from "@/components/guide/lessons";
import { GUIDE_LESSONS, getGuideLesson } from "@/data/guideLessons";

export function generateStaticParams() {
  return GUIDE_LESSONS.map((l) => ({ lesson: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson } = await params;
  const l = getGuideLesson(lesson);
  return l ? { title: `${l.title} (Guide)`, description: l.blurb } : { title: "Guide" };
}

export default async function GuideLessonPage({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson } = await params;
  const Body = LESSON_BODIES[lesson];
  if (!getGuideLesson(lesson) || !Body) notFound();
  return (
    <LessonShell lessonId={lesson}>
      <Body />
    </LessonShell>
  );
}
