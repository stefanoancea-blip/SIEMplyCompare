import Link from "next/link";
import type { Platform } from "@/types/platform";

interface PlatformCardProps {
  platform: Platform;
}

/** Shorten description to a reasonable length for cards. */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}

/** Shared card surface: light background, subtle border, theme colors. */
const cardSurface =
  "rounded-lg border border-gray-200 bg-content-bg shadow-sm transition hover:border-gray-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2";

export default function PlatformCard({ platform }: PlatformCardProps) {
  const shortDescription = truncate(platform.description, 160);

  return (
    <Link
      href={`/platforms/${platform.id}`}
      className={`block p-5 ${cardSurface}`}
    >
      <h2 className="text-lg font-semibold text-content-foreground">{platform.name}</h2>
      <p className="mt-2 line-clamp-3 text-sm text-content-muted">
        {shortDescription}
      </p>
      {platform.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Tags">
          {platform.tags.map((tag) => (
            <li
              key={tag}
              className="rounded bg-content-bg-muted px-2 py-0.5 text-xs font-medium text-content-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
