import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlatformById, getCategories } from "@/lib/platforms";
import type { CategoryScore } from "@/types/platform";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatLabel(value: string): string {
  return value
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function ScoreStars({ score }: { score: number }) {
  const clamped = Math.min(5, Math.max(0, Math.round(score)));
  return (
    <span className="inline-flex gap-0.5 text-amber-500" aria-label={`${clamped} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= clamped ? "text-amber-500" : "text-gray-300"}>
          {i <= clamped ? "★" : "☆"}
        </span>
      ))}
      <span className="ml-2 text-sm font-medium text-gray-600">
        {clamped}/5
      </span>
    </span>
  );
}

export default async function PlatformDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [platform, categories] = await Promise.all([
    getPlatformById(id),
    getCategories(),
  ]);

  if (!platform) {
    notFound();
  }

  return (
    <main className="page-content">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/platforms"
          className="mb-6 inline-block text-sm text-content-muted hover:text-content-foreground hover:underline"
        >
          ← Back to platforms
        </Link>

        <header className="border-b border-gray-200 pb-6">
          <h1>{platform.name}</h1>
          {platform.websiteUrl && (
            <a
              href={platform.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-primary hover:underline"
            >
              Visit website →
            </a>
          )}
          <p className="mt-4 text-content-muted">{platform.description}</p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Deployment
              </dt>
              <dd className="text-gray-900">{formatLabel(platform.deploymentModel)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Pricing
              </dt>
              <dd className="text-gray-900">{formatLabel(platform.pricingModel)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Target customer
              </dt>
              <dd className="text-gray-900">{formatLabel(platform.targetCustomerSize)}</dd>
            </div>
          </dl>
        </header>

        <section className="mt-8" aria-labelledby="category-scores-heading">
          <h2 id="category-scores-heading">Category scores</h2>
          <ul className="mt-4 space-y-4">
            {categories.map((cat) => {
              const value = platform.categories[cat.id] as CategoryScore | undefined;
              if (!value) return null;
              return (
                <li
                  key={cat.id}
                  className="rounded-lg border border-gray-200 bg-content-bg-muted p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium text-content-foreground">{cat.label}</h3>
                    <ScoreStars score={value.score} />
                  </div>
                  {value.note && (
                    <p className="mt-2 text-sm text-content-muted">{value.note}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-8 grid gap-6 sm:grid-cols-3" aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="sr-only">
            Strengths, weaknesses, and differentiators
          </h2>
          <div className="rounded-lg border border-gray-200 bg-content-bg-muted p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase text-content-muted">
              Strengths
            </h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-content-foreground">
              {platform.strengths.length > 0 ? (
                platform.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))
              ) : (
                <li className="text-content-muted">—</li>
              )}
            </ul>
          </div>
          <div className="rounded-lg border border-gray-200 bg-content-bg-muted p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase text-content-muted">
              Weaknesses
            </h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-content-foreground">
              {platform.weaknesses.length > 0 ? (
                platform.weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))
              ) : (
                <li className="text-content-muted">—</li>
              )}
            </ul>
          </div>
          <div className="rounded-lg border border-gray-200 bg-content-bg-muted p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase text-content-muted">
              Differentiators
            </h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-content-foreground">
              {platform.differentiators.length > 0 ? (
                platform.differentiators.map((d, i) => (
                  <li key={i}>{d}</li>
                ))
              ) : (
                <li className="text-content-muted">—</li>
              )}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
