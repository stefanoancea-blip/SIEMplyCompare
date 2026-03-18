"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import type { Platform } from "@/types/platform";

export default function AdminPlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPlatforms = useCallback(() => {
    return fetch("/api/platforms")
      .then((res) => res.json())
      .then((data) => setPlatforms(Array.isArray(data) ? data : []))
      .catch(() => setPlatforms([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPlatforms().finally(() => setLoading(false));
  }, [fetchPlatforms]);

  function handleDelete(p: Platform) {
    if (!confirm(`Remove platform "${p.name}"? This cannot be undone.`)) {
      return;
    }
    setError(null);
    setDeletingId(p.id);
    fetch(`/api/admin/platforms/${encodeURIComponent(p.id)}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => Promise.reject(new Error(d.error || "Failed to delete platform")));
        }
      })
      .then(() => fetchPlatforms())
      .catch((err) => setError(err.message))
      .finally(() => setDeletingId(null));
  }

  return (
    <main className="page-content">
      <h1>Platforms</h1>
      <p className="mt-2 text-content-muted">
        Manage and edit platform entries.
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

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
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-content-bg px-4 py-3 shadow-sm"
                >
                  <span className="font-medium text-content-foreground">{p.name}</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/admin/platforms/${p.id}`}
                      className="text-primary hover:underline"
                    >
                      Edit
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={deletingId === p.id}
                      onClick={() => handleDelete(p)}
                    >
                      {deletingId === p.id ? "Deleting…" : "Delete"}
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </section>
    </main>
  );
}
