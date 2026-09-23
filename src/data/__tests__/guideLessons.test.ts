import { describe, expect, it } from "vitest";
import { GUIDE_LESSONS, TOTAL_GUIDE_LESSONS, resolveGuideLessonId } from "@/data/guideLessons";
import { guideHrefForTerm } from "@/data/guideGlossary";

describe("guide lessons", () => {
  it("has 15 lessons with unique ids and sequential indexes", () => {
    expect(TOTAL_GUIDE_LESSONS).toBe(15);
    expect(new Set(GUIDE_LESSONS.map((l) => l.id)).size).toBe(15);
    GUIDE_LESSONS.forEach((l, i) => expect(l.index).toBe(i));
  });

  it("maps legacy ?lesson= ids to current lessons", () => {
    expect(resolveGuideLessonId("moves-damage")).toBe("damage");
    expect(resolveGuideLessonId("info-win-conditions")).toBe("win-conditions");
    expect(resolveGuideLessonId("cores-modes-archetypes")).toBe("cores-archetypes");
    expect(resolveGuideLessonId("getting-started")).toBe("start-here");
    expect(resolveGuideLessonId("switching")).toBe("switching");
    expect(resolveGuideLessonId("nope")).toBeNull();
  });

  it("glossary deep links point at existing lesson pages", () => {
    for (const slug of ["ev", "stab", "priority", "pivot", "ohko", "wincon", "spread-move", "team-roles"]) {
      const href = guideHrefForTerm(slug);
      const id = href.replace("/guide/", "");
      expect(GUIDE_LESSONS.some((l) => l.id === id), `${slug} -> ${href}`).toBe(true);
    }
  });
});
