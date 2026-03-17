import { getPlatforms } from "@/lib/platforms";
import PlatformCard from "@/components/PlatformCard";

export const dynamic = "force-dynamic";

export default async function PlatformsPage() {
  const platforms = await getPlatforms();

  return (
    <main className="page-content">
      <h1>Platforms</h1>
      <p className="mt-2 text-content-muted">
        Browse and compare cybersecurity platforms.
      </p>
      <section
        className="mt-8 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Platform list"
      >
        {platforms.map((platform) => (
          <PlatformCard key={platform.id} platform={platform} />
        ))}
      </section>
    </main>
  );
}
