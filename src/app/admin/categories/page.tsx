"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/Button";
import type { Category, Platform } from "@/types/platform";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ id: "", label: "", description: "", promptGuidance: "" });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addedCategory, setAddedCategory] = useState<Category | null>(null);
  const [populateLoading, setPopulateLoading] = useState(false);
  const [populateResult, setPopulateResult] = useState<string | null>(null);
  const [populatePromptGuidance, setPopulatePromptGuidance] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState({ label: "", description: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editPopulateResult, setEditPopulateResult] = useState<string | null>(null);
  const [reScoringCategory, setReScoringCategory] = useState<Category | null>(null);
  const [reScorePromptGuidance, setReScorePromptGuidance] = useState("");

  const fetchCategories = useCallback(() => {
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCategories();
  }, [fetchCategories]);

  function handleRemove(cat: Category) {
    if (!confirm(`Remove category "${cat.label}"? This will remove it from all platforms.`)) {
      return;
    }
    setError(null);
    setRemovingId(cat.id);
    fetch(`/api/admin/categories/${encodeURIComponent(cat.id)}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || "Failed to remove category")));
      })
      .then(() => fetchCategories())
      .catch((err) => setError(err.message))
      .finally(() => setRemovingId(null));
  }

  function handleAddFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setAddForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAddSuccess(null);
    setAddedCategory(null);
    setPopulateResult(null);
    const id = addForm.id.trim().toLowerCase().replace(/\s+/g, "-");
    const label = addForm.label.trim();
    if (!id || !label) {
      setError("Id and label are required.");
      return;
    }
    setAddSubmitting(true);
    fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        label,
        description: addForm.description.trim() || undefined,
        promptGuidance: addForm.promptGuidance?.trim() || undefined,
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || "Failed to add category")));
        return res.json();
      })
      .then((newCat: Category) => {
        setAddSuccess(`Category "${newCat.label}" added.`);
        setAddedCategory(newCat);
        setPopulatePromptGuidance(newCat.promptGuidance ?? "");
        setAddForm({ id: "", label: "", description: "", promptGuidance: "" });
        fetchCategories();
      })
      .catch((err) => setError(err.message))
      .finally(() => setAddSubmitting(false));
  }

  const SUGGEST_CATEGORY_TIMEOUT_MS = 90_000;

  function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() =>
      clearTimeout(timeoutId)
    );
  }

  const categoryToPopulate = addedCategory ?? reScoringCategory;

  function handlePopulateWithAI() {
    if (!categoryToPopulate) return;
    const guidance = addedCategory ? populatePromptGuidance : reScorePromptGuidance;
    setError(null);
    setPopulateResult(null);
    setPopulateLoading(true);
    fetch("/api/platforms")
      .then((res) => (res.ok ? res.json() : []))
      .then((platforms: Platform[]) => {
        if (platforms.length === 0) {
          setPopulateResult("No platforms to populate.");
          return;
        }
        let done = 0;
        let failed = 0;
        const run = (index: number): Promise<void> => {
          if (index >= platforms.length) return Promise.resolve();
          const platform = platforms[index];
          return fetchWithTimeout(
            "/api/admin/ai/suggest-category",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                platformId: platform.id,
                categoryId: categoryToPopulate.id,
                categoryLabel: categoryToPopulate.label,
                categoryDescription: categoryToPopulate.description,
                ...(guidance.trim() && { promptGuidance: guidance.trim() }),
              }),
            },
            SUGGEST_CATEGORY_TIMEOUT_MS
          )
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Suggest failed"))))
            .then((data: { score: number; note: string }) =>
              fetch(`/api/admin/platforms/${encodeURIComponent(platform.id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  categories: { [categoryToPopulate.id]: { score: data.score, note: data.note } },
                }),
              })
            )
            .then((res) => {
              if (!res.ok) return Promise.reject(new Error("PATCH failed"));
              done++;
            })
            .catch((err) => {
              failed++;
              if (failed === 1 && err?.name === "AbortError") {
                setError("Request timed out. Check your OpenAI API key in Admin settings and try again.");
              }
            })
            .then(() => run(index + 1));
        };
        return run(0)
          .then(() => {
            if (failed === 0) setPopulateResult(`Populated ${done} platform(s) with AI.`);
            else setPopulateResult(`Done: ${done} updated, ${failed} failed.`);
          })
          .then(() => {
            if (reScoringCategory && reScorePromptGuidance.trim()) {
              return fetch(`/api/admin/categories/${encodeURIComponent(reScoringCategory.id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ promptGuidance: reScorePromptGuidance.trim() }),
              }).then((res) => {
                if (res.ok) fetchCategories();
              });
            }
            if (addedCategory && populatePromptGuidance.trim()) {
              return fetch(`/api/admin/categories/${encodeURIComponent(addedCategory.id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ promptGuidance: populatePromptGuidance.trim() }),
              }).then((res) => {
                if (res.ok) fetchCategories();
              });
            }
          });
      })
      .catch((err) => setError(err?.message ?? "Populate failed"))
      .finally(() => {
        setPopulateLoading(false);
        if (addedCategory) {
          setAddedCategory(null);
          setPopulatePromptGuidance("");
        }
      });
  }

  function dismissAddFlow() {
    setAddedCategory(null);
    setAddSuccess(null);
    setPopulateResult(null);
    setPopulatePromptGuidance("");
    setAddForm((prev) => ({ ...prev, promptGuidance: "" }));
  }

  function dismissReScoreFlow() {
    setReScoringCategory(null);
    setReScorePromptGuidance("");
    setPopulateResult(null);
  }

  function handleEditFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  }

  function runPopulateForCategory(category: Category, guidance: string) {
    setError(null);
    setPopulateLoading(true);
    fetch("/api/platforms")
      .then((res) => (res.ok ? res.json() : []))
      .then((platforms: Platform[]) => {
        if (platforms.length === 0) return;
        let done = 0;
        let failed = 0;
        const run = (index: number): Promise<void> => {
          if (index >= platforms.length) return Promise.resolve();
          const platform = platforms[index];
          return fetchWithTimeout(
            "/api/admin/ai/suggest-category",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                platformId: platform.id,
                categoryId: category.id,
                categoryLabel: category.label,
                categoryDescription: category.description,
                ...(guidance.trim() && { promptGuidance: guidance.trim() }),
              }),
            },
            SUGGEST_CATEGORY_TIMEOUT_MS
          )
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Suggest failed"))))
            .then((data: { score: number; note: string }) =>
              fetch(`/api/admin/platforms/${encodeURIComponent(platform.id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  categories: { [category.id]: { score: data.score, note: data.note } },
                }),
              })
            )
            .then((res) => {
              if (!res.ok) return Promise.reject(new Error("PATCH failed"));
              done++;
            })
            .catch((err) => {
              failed++;
              if (failed === 1 && err?.name === "AbortError") {
                setError("Request timed out. Check your OpenAI API key in Admin settings and try again.");
              }
            })
            .then(() => run(index + 1));
        };
        return run(0).then(() => {
          if (failed === 0) setEditPopulateResult(`Re-populated ${done} platform(s) for this category.`);
          else setEditPopulateResult(`Done: ${done} updated, ${failed} failed.`);
        });
      })
      .catch((err) => setError(err?.message ?? "Re-populate failed"))
      .finally(() => setPopulateLoading(false));
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCategory) return;
    setError(null);
    setEditPopulateResult(null);
    const label = editForm.label.trim();
    if (!label) {
      setError("Label is required.");
      return;
    }
    setEditSubmitting(true);
    fetch(`/api/admin/categories/${encodeURIComponent(editingCategory.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        description: editForm.description.trim() || undefined,
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || "Failed to update category")));
        return res.json();
      })
      .then(() => {
        fetchCategories();
        setEditingCategory(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setEditSubmitting(false));
  }

  function handleEditCancel() {
    setEditingCategory(null);
    setEditPopulateResult(null);
    setError(null);
  }

  return (
    <main className="page-content">
      <h1>Category scores</h1>
      <p className="mt-2 text-content-muted">
        Manage the comparison categories. All platforms use the same set of categories.
      </p>

      {error && (
        <p className="mt-4 text-red-600" role="alert">
          {error}
        </p>
      )}
      {editPopulateResult && (
        <p className="mt-4 text-green-600" role="status">
          {editPopulateResult}
        </p>
      )}

      <section className="mt-8" aria-labelledby="categories-list-heading">
        <h2 id="categories-list-heading">Categories</h2>
        {loading ? (
          <p className="mt-2 text-content-muted">Loading…</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {categories.length === 0 ? (
              <li className="rounded-lg border border-gray-200 bg-content-bg-muted px-4 py-3 text-content-muted shadow-sm">
                No categories yet.
              </li>
            ) : (
              categories.map((cat) => (
                <li
                  key={cat.id}
                  className="rounded-lg border border-gray-200 bg-content-bg px-4 py-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-content-foreground">{cat.label}</span>
                      <span className="ml-2 text-sm text-content-muted">({cat.id})</span>
                      {cat.description && (
                        <p className="mt-1 text-sm text-content-muted">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={
                          removingId === cat.id ||
                          editingCategory?.id === cat.id ||
                          reScoringCategory?.id === cat.id ||
                          (populateLoading && categoryToPopulate?.id === cat.id)
                        }
                        onClick={() => {
                          setError(null);
                          setEditPopulateResult(null);
                          setEditingCategory(null);
                          setReScoringCategory(cat);
                          setReScorePromptGuidance(cat.promptGuidance ?? "");
                          setPopulateResult(null);
                        }}
                      >
                        Re-score with AI
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={removingId === cat.id || editingCategory?.id === cat.id}
                        onClick={() => {
                          setError(null);
                          setAddSuccess(null);
                          setPopulateResult(null);
                          setEditPopulateResult(null);
                          setReScoringCategory(null);
                          setEditingCategory(cat);
                          setEditForm({
                            label: cat.label,
                            description: cat.description ?? "",
                          });
                        }}
                      >
                        Edit category
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={removingId === cat.id}
                        onClick={() => handleRemove(cat)}
                      >
                        {removingId === cat.id ? "Removing…" : "Remove"}
                      </Button>
                    </div>
                  </div>
                  {editingCategory?.id === cat.id && (
                    <form
                      onSubmit={handleEditSubmit}
                      className="mt-4 border-t border-gray-200 pt-4 space-y-4"
                      aria-label="Edit category"
                    >
                      <label className="block">
                        <span className="text-sm font-medium text-content-foreground">Id</span>
                        <input
                          type="text"
                          value={editingCategory.id}
                          readOnly
                          className="mt-1 block w-full rounded border border-gray-300 bg-content-bg-muted px-3 py-2 text-content-muted cursor-not-allowed"
                          aria-readonly="true"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-content-foreground">Label *</span>
                        <input
                          type="text"
                          name="label"
                          value={editForm.label}
                          onChange={handleEditFormChange}
                          required
                          placeholder="e.g. Cloud security"
                          className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-content-foreground">Description</span>
                        <textarea
                          name="description"
                          value={editForm.description}
                          onChange={handleEditFormChange}
                          rows={2}
                          placeholder="Optional short description"
                          className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={editSubmitting} variant="primary">
                          {editSubmitting ? "Saving…" : "Save"}
                        </Button>
                        <Button type="button" variant="secondary" disabled={editSubmitting} onClick={handleEditCancel}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                  {reScoringCategory?.id === cat.id && (
                    <div className="mt-4 border-t border-gray-200 pt-4" aria-label="Re-score with AI">
                      <p className="text-sm font-medium text-content-foreground">
                        Re-score this category with AI for all platforms?
                      </p>
                      <p className="mt-1 text-sm text-content-muted">
                        This will suggest a score and note for &quot;{cat.label}&quot; on each platform.
                      </p>
                      <label className="mt-3 block">
                        <span className="text-sm font-medium text-content-foreground">Prompt guidance (optional)</span>
                        <textarea
                          value={reScorePromptGuidance}
                          onChange={(e) => setReScorePromptGuidance(e.target.value)}
                          rows={2}
                          placeholder="e.g. Prefer platforms with strong cloud-native deployment or focus on SMB."
                          disabled={populateLoading}
                          className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                        />
                      </label>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant="primary"
                          disabled={populateLoading}
                          onClick={handlePopulateWithAI}
                        >
                          {populateLoading ? "Populating…" : "Yes, populate with AI"}
                        </Button>
                        <Button type="button" variant="secondary" disabled={populateLoading} onClick={dismissReScoreFlow}>
                          No, done
                        </Button>
                      </div>
                      {populateResult && categoryToPopulate?.id === cat.id && (
                        <p className="mt-3 text-sm text-content-foreground" role="status">
                          {populateResult}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="add-category-heading">
        <h2 id="add-category-heading">Add category</h2>
        {addSuccess && (
          <p className="mt-2 text-green-600" role="status">
            {addSuccess}
          </p>
        )}
        {addedCategory && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-content-bg-muted p-4 shadow-sm">
            <p className="text-sm font-medium text-content-foreground">
              Populate this category with AI for existing platforms?
            </p>
            <p className="mt-1 text-sm text-content-muted">
              This will suggest a score and note for &quot;{addedCategory.label}&quot; on each platform.
            </p>
            <label className="mt-3 block">
              <span className="text-sm font-medium text-content-foreground">Prompt guidance (optional)</span>
              <textarea
                value={populatePromptGuidance}
                onChange={(e) => setPopulatePromptGuidance(e.target.value)}
                rows={2}
                placeholder="e.g. Prefer platforms with strong cloud-native deployment or focus on SMB."
                disabled={populateLoading}
                className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="primary"
                disabled={populateLoading}
                onClick={handlePopulateWithAI}
              >
                {populateLoading ? "Populating…" : "Yes, populate with AI"}
              </Button>
              <Button type="button" variant="secondary" disabled={populateLoading} onClick={dismissAddFlow}>
                No, done
              </Button>
            </div>
            {populateResult && (
              <p className="mt-3 text-sm text-content-foreground" role="status">
                {populateResult}
              </p>
            )}
          </div>
        )}
        <form onSubmit={handleAddSubmit} className="mt-4 max-w-xl space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-content-foreground">Id (slug) *</span>
            <input
              type="text"
              name="id"
              value={addForm.id}
              onChange={handleAddFormChange}
              required
              placeholder="e.g. cloud-security"
              className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-content-muted">Lowercase, hyphens, no spaces.</p>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-content-foreground">Label *</span>
            <input
              type="text"
              name="label"
              value={addForm.label}
              onChange={handleAddFormChange}
              required
              placeholder="e.g. Cloud security"
              className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-content-foreground">Description</span>
            <textarea
              name="description"
              value={addForm.description}
              onChange={handleAddFormChange}
              rows={2}
              placeholder="Optional short description"
              className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-content-foreground">Prompt guidance (optional)</span>
            <textarea
              name="promptGuidance"
              value={addForm.promptGuidance}
              onChange={handleAddFormChange}
              rows={2}
              placeholder="e.g. Prefer platforms with strong cloud-native deployment or focus on SMB."
              className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <Button type="submit" disabled={addSubmitting} variant="primary">
            {addSubmitting ? "Adding…" : "Add category"}
          </Button>
        </form>
      </section>
    </main>
  );
}
