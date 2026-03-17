"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Platform } from "@/types/platform";

export default function AdminPlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/platforms")
      .then((res) => res.json())
      .then((data) => setPlatforms(Array.isArray(data) ? data : []))
      .catch(() => setPlatforms([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="page-content">
      <h1>Platforms</h1>
      <p className="mt-2 text-content-muted">
        Manage and edit platform entries.
      </p>

      <section className="mt-8" aria-labelledby="platforms-list-heading">
        <h2 id="platforms-list-heading">Platforms</h2>
        {loading ? (
          <p className="mt-2 text-content-muted">Loading…</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {platforms.length === 0 ? (
              <li className="rounded-lg border border-gray-200 bg-content-bg-muted px-4 py-3 text-content-muted shadow-sm">
                No platforms yet.
              </li>
            ) : (
              platforms.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-content-bg px-4 py-3 shadow-sm"
                >
                  <span className="font-medium text-content-foreground">{p.name}</span>
                  <Link
                    href={`/admin/platforms/${p.id}`}
                    className="text-primary hover:underline"
                  >
                    Edit
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}
      </section>
    </main>
  );
}
