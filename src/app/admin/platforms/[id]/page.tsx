"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Button from "@/components/Button";
import type { Category } from "@/types/platform";
import type { Platform } from "@/types/platform";

type CategoryScoreForm = { score: number; note: string };

const SUGGEST_CATEGORY_TIMEOUT_MS = 90_000;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}

export default function AdminEditPlatformPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestSuccess, setSuggestSuccess] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    websiteUrl: "",
    deploymentModel: "cloud",
    pricingModel: "subscription",
    targetCustomerSize: "midmarket",
    tags: "",
    strengths: "",
    weaknesses: "",
    differentiators: "",
    categories: {} as Record<string, CategoryScoreForm>,
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`/api/platforms/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([plat, cats]) => {
        setPlatform(plat);
        const catList = Array.isArray(cats) ? cats : [];
        setCategories(catList);
        if (plat) {
          const catForm: Record<string, CategoryScoreForm> = {};
          for (const cat of catList) {
            const v = plat.categories?.[cat.id];
            const score = v && typeof (v as { score?: number }).score === "number" ? (v as { score: number }).score : 0;
            const note = v && typeof (v as { note?: string }).note === "string" ? (v as { note: string }).note : "";
            catForm[cat.id] = { score, note };
          }
          setForm({
            name: plat.name || "",
            description: plat.description || "",
            websiteUrl: plat.websiteUrl || "",
            deploymentModel: plat.deploymentModel || "cloud",
            pricingModel: plat.pricingModel || "subscription",
            targetCustomerSize: plat.targetCustomerSize || "midmarket",
            tags: Array.isArray(plat.tags) ? plat.tags.join(", ") : "",
            strengths: Array.isArray(plat.strengths) ? plat.strengths.join("\n") : "",
            weaknesses: Array.isArray(plat.weaknesses) ? plat.weaknesses.join("\n") : "",
            differentiators: Array.isArray(plat.differentiators) ? plat.differentiators.join("\n") : "",
            categories: catForm,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const deploymentOptions = ["cloud", "on-prem", "hybrid"];
  const pricingOptions = ["subscription", "usage-based", "other"];
  const customerSizeOptions = ["smb", "midmarket", "enterprise"];

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors([]);
    setSuggestError(null);
    setSuggestSuccess(null);
  }

  function handleCategoryChange(categoryId: string, field: "score" | "note", value: number | string) {
    setForm((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [categoryId]: {
          ...prev.categories[categoryId],
          [field]: value,
        },
      },
    }));
    setErrors([]);
    setSuggestError(null);
    setSuggestSuccess(null);
  }

  function handleSuggestContent(e: React.MouseEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    setSuggestError(null);
    setSuggestSuccess(null);
    setSuggestLoading(true);
    fetch("/api/admin/ai/suggest-platform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        websiteUrl: form.websiteUrl.trim() || undefined,
      }),
    })
      .then((res) => {
        const isJson = res.headers.get("content-type")?.includes("application/json");
        if (!res.ok) {
          return isJson
            ? res.json().then((d: { error?: string }) => Promise.reject(new Error(d.error || "Suggest failed")))
            : res.text().then((t) => Promise.reject(new Error(t || "Suggest failed")));
        }
        return isJson ? res.json() : Promise.reject(new Error("Invalid response"));
      })
      .then((data: {
        name?: string;
        description?: string;
        websiteUrl?: string;
        tags?: string[];
        deploymentModel?: string;
        pricingModel?: string;
        targetCustomerSize?: string;
        categories?: Record<string, { score: number; note: string }>;
        strengths?: string[];
        weaknesses?: string[];
        differentiators?: string[];
      }) => {
        const categoriesMerge: Record<string, CategoryScoreForm> = { ...form.categories };
        if (data.categories && typeof data.categories === "object") {
          for (const [catId, val] of Object.entries(data.categories)) {
            if (val && typeof val.score === "number" && typeof val.note === "string") {
              categoriesMerge[catId] = { score: val.score, note: val.note };
            }
          }
        }
        setForm((prev) => ({
          ...prev,
          name: typeof data.name === "string" ? data.name : prev.name,
          description: typeof data.description === "string" ? data.description : prev.description,
          websiteUrl: typeof data.websiteUrl === "string" ? data.websiteUrl : prev.websiteUrl,
          deploymentModel: typeof data.deploymentModel === "string" ? data.deploymentModel : prev.deploymentModel,
          pricingModel: typeof data.pricingModel === "string" ? data.pricingModel : prev.pricingModel,
          targetCustomerSize: typeof data.targetCustomerSize === "string" ? data.targetCustomerSize : prev.targetCustomerSize,
          tags: Array.isArray(data.tags) ? data.tags.join(", ") : prev.tags,
          strengths: Array.isArray(data.strengths) ? data.strengths.join("\n") : prev.strengths,
          weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses.join("\n") : prev.weaknesses,
          differentiators: Array.isArray(data.differentiators) ? data.differentiators.join("\n") : prev.differentiators,
          categories: categoriesMerge,
        }));
        if (categories.length === 0) return Promise.resolve();
        let promise: Promise<void> = Promise.resolve();
        for (const cat of categories) {
          promise = promise.then(() =>
            fetchWithTimeout(
              "/api/admin/ai/suggest-category",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  platformId: id,
                  categoryId: cat.id,
                  categoryLabel: cat.label,
                  categoryDescription: cat.description ?? undefined,
                  promptGuidance:
                    cat.promptGuidance && cat.promptGuidance.trim()
                      ? cat.promptGuidance.trim()
                      : undefined,
                }),
              },
              SUGGEST_CATEGORY_TIMEOUT_MS
            )
              .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Suggest failed"))))
              .then((suggestData: { score: number; note: string }) => {
                setForm((prev) => ({
                  ...prev,
                  categories: {
                    ...prev.categories,
                    [cat.id]: { score: suggestData.score, note: suggestData.note },
                  },
                }));
              })
              .catch(() => {
                setForm((prev) => ({
                  ...prev,
                  categories: {
                    ...prev.categories,
                    [cat.id]: { score: 0, note: "" },
                  },
                }));
              })
          );
        }
        return promise;
      })
      .then(() => {
        setSuggestSuccess("Form updated with AI suggestion; review and save.");
        setTimeout(() => setSuggestSuccess(null), 8000);
      })
      .catch((err: Error) => setSuggestError(err.message))
      .finally(() => setSuggestLoading(false));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSuccess(null);
    const name = form.name.trim();
    if (!name) {
      setErrors(["Name is required."]);
      return;
    }
    const errs: string[] = [];
    for (const [catId, val] of Object.entries(form.categories)) {
      const score = typeof val.score === "number" ? val.score : Number(val.score);
      if (!Number.isNaN(score) && score !== 0 && (score < 1 || score > 5)) {
        const label = categories.find((c) => c.id === catId)?.label || catId;
        errs.push(`${label}: score must be between 1 and 5.`);
      }
    }
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    const categoriesPayload: Record<string, { score: number; note: string }> = {};
    for (const [k, v] of Object.entries(form.categories)) {
      const score = typeof v.score === "number" ? v.score : Number(v.score);
      if (!Number.isNaN(score)) categoriesPayload[k] = { score, note: String(v.note || "").trim() };
    }
    const payload = {
      name,
      description: form.description.trim(),
      websiteUrl: form.websiteUrl.trim(),
      deploymentModel: form.deploymentModel,
      pricingModel: form.pricingModel,
      targetCustomerSize: form.targetCustomerSize,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      strengths: form.strengths.split(/\r?\n/).map((t) => t.trim()).filter(Boolean),
      weaknesses: form.weaknesses.split(/\r?\n/).map((t) => t.trim()).filter(Boolean),
      differentiators: form.differentiators.split(/\r?\n/).map((t) => t.trim()).filter(Boolean),
      categories: categoriesPayload,
    };
    fetch(`/api/admin/platforms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || "Failed to update")));
        return res.json();
      })
      .then((updated: Platform) => {
        setPlatform(updated);
        setSuccess("Platform updated successfully.");
        setTimeout(() => setSuccess(null), 5000);
      })
      .catch((err) => setErrors([err.message]))
      .finally(() => setSubmitting(false));
  }

  if (!id) {
    return (
      <main className="page-content">
        <Link href="/admin/platforms" className="text-primary hover:underline">← Back to platforms</Link>
        <p className="mt-4 text-content-muted">Missing platform id.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page-content">
        <Link href="/admin/platforms" className="text-primary hover:underline">← Back to platforms</Link>
        <p className="mt-4 text-content-muted">Loading…</p>
      </main>
    );
  }

  if (!platform) {
    return (
      <main className="page-content">
        <Link href="/admin/platforms" className="text-primary hover:underline">← Back to platforms</Link>
        <p className="mt-4 text-red-600">Platform not found.</p>
      </main>
    );
  }

  return (
    <main className="page-content">
      <Link href="/admin/platforms" className="text-primary hover:underline">
        ← Back to platforms
      </Link>
      <h1 className="mt-6">Edit platform</h1>
      <p className="mt-1 text-content-muted">ID: {id}</p>

      {success && (
        <p className="mt-4 text-green-600" role="status">
          {success}
        </p>
      )}
      {errors.length > 0 && (
        <ul className="mt-4 list-inside list-disc text-red-600" role="alert">
          {errors.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}
      {suggestSuccess && (
        <p className="mt-4 text-green-600" role="status">
          {suggestSuccess}
        </p>
      )}
      {suggestError && (
        <p className="mt-4 text-red-600" role="alert">
          {suggestError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-content-foreground">Name *</span>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-content-foreground">Description</span>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-content-foreground">Website URL</span>
          <input
            type="url"
            name="websiteUrl"
            value={form.websiteUrl}
            onChange={handleChange}
            className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-content-foreground">Deployment model</span>
          <select
            name="deploymentModel"
            value={form.deploymentModel}
            onChange={handleChange}
            className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {deploymentOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "on-prem" ? "On-premises" : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-content-foreground">Pricing model</span>
          <select
            name="pricingModel"
            value={form.pricingModel}
            onChange={handleChange}
            className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {pricingOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-content-foreground">Target customer size</span>
          <select
            name="targetCustomerSize"
            value={form.targetCustomerSize}
            onChange={handleChange}
            className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {customerSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-content-foreground">Tags (comma-separated)</span>
          <input
            type="text"
            name="tags"
            value={form.tags}
            onChange={handleChange}
            placeholder="e.g. XDR, SIEM, Cloud"
            className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-content-foreground">Strengths (one per line)</span>
          <textarea
            name="strengths"
            value={form.strengths}
            onChange={handleChange}
            rows={4}
            placeholder="One strength per line"
            className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-content-foreground">Weaknesses (one per line)</span>
          <textarea
            name="weaknesses"
            value={form.weaknesses}
            onChange={handleChange}
            rows={4}
            placeholder="One weakness per line"
            className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-content-foreground">Differentiators (one per line)</span>
          <textarea
            name="differentiators"
            value={form.differentiators}
            onChange={handleChange}
            rows={4}
            placeholder="One differentiator per line"
            className="mt-1 block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>

        <div className="border-t border-gray-200 pt-6">
          <h2>Category scores (1–5)</h2>
          <p className="mt-1 text-sm text-content-muted">Score must be between 1 and 5 if set.</p>
          <div className="mt-4 space-y-4">
            {categories.map((cat) => {
              const val = form.categories[cat.id] || { score: 0, note: "" };
              return (
                <div key={cat.id} className="rounded-lg border border-gray-200 bg-content-bg-muted p-3 shadow-sm">
                  <label className="block font-medium text-content-foreground">{cat.label}</label>
                  <div className="mt-2 flex flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                      <span className="text-sm text-content-muted">Score</span>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        step={1}
                        value={val.score || ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? "" : Number(e.target.value);
                          handleCategoryChange(cat.id, "score", v as number);
                        }}
                        className="w-16 rounded border border-gray-300 bg-content-bg px-2 py-1 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </label>
                    <label className="flex-1 min-w-[200px]">
                      <span className="sr-only">Note</span>
                      <input
                        type="text"
                        value={val.note || ""}
                        onChange={(e) => handleCategoryChange(cat.id, "note", e.target.value)}
                        placeholder="Optional note"
                        className="w-full rounded border border-gray-300 bg-content-bg px-2 py-1 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-4">
          <Button type="submit" disabled={submitting} variant="primary">
            {submitting ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            onClick={handleSuggestContent}
            disabled={suggestLoading || !form.name.trim()}
            variant="secondary"
          >
            {suggestLoading ? "Suggesting…" : "Suggest content with AI"}
          </Button>
          <Button href={`/platforms/${id}`} variant="secondary">
            View platform
          </Button>
        </div>
      </form>
    </main>
  );
}
