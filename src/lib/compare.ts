import type { Category, CategoryScore, Platform } from "@/types/platform";

export interface CategoryRow {
  categoryId: string;
  label: string;
  platformA: { score: number; note?: string };
  platformB: { score: number; note?: string };
}

export interface CompareResult {
  platformA: Platform;
  platformB: Platform;
  categoryRows: CategoryRow[];
  overallScoreA: number;
  overallScoreB: number;
}

const MIN_SCORE = 0;
const MAX_SCORE = 5;

/**
 * Compare two platforms: build category rows (label + score/note per platform)
 * and compute overall score per platform (equal weights, 1–5 scale).
 */
export function comparePlatforms(
  platformA: Platform,
  platformB: Platform,
  categories: Category[]
): CompareResult {
  const categoryRows: CategoryRow[] = [];
  const scoresA: number[] = [];
  const scoresB: number[] = [];

  for (const cat of categories) {
    const a = platformA.categories[cat.id] as CategoryScore | undefined;
    const b = platformB.categories[cat.id] as CategoryScore | undefined;
    const scoreA = a != null ? clampScore(a.score) : 0;
    const scoreB = b != null ? clampScore(b.score) : 0;
    categoryRows.push({
      categoryId: cat.id,
      label: cat.label,
      platformA: { score: scoreA, note: a?.note },
      platformB: { score: scoreB, note: b?.note },
    });
    scoresA.push(scoreA);
    scoresB.push(scoreB);
  }

  const overallScoreA = average(scoresA);
  const overallScoreB = average(scoresB);

  return {
    platformA,
    platformB,
    categoryRows,
    overallScoreA: roundScore(overallScoreA),
    overallScoreB: roundScore(overallScoreB),
  };
}

function clampScore(s: number): number {
  if (typeof s !== "number" || Number.isNaN(s)) return 0;
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, s));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

function roundScore(s: number): number {
  return Math.round(s * 10) / 10;
}
