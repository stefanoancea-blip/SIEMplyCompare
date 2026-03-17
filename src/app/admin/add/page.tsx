"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import type { Category, Platform } from "@/types/platform";

const SUGGEST_CATEGORY_TIMEOUT_MS = 90_000;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}

export default function AdminAddPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [categoryPopulateStatus, setCategoryPopulateStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    websiteUrl: "",
    deploymentModel: "",
    pricingModel: "",
    targetCustomerSize: "",
    tags: "",
    strengths: "",
    weaknesses: "",
    differentiators: "",
  });

  const deploymentOptions = ["cloud", "on-prem", "hybrid"];
  const pricingOptions = ["subscription", "usage-based", "other"];
  const customerSizeOptions = ["smb", "midmarket", "enterprise"];

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuggestError(null);
  }

  function handleSuggestContent(e: React.MouseEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    setSuggestError(null);
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
        const contentType = res.headers.get("content-type");
        const isJson = contentType?.includes("application/json");
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
        strengths?: string[];
        weaknesses?: string[];
        differentiators?: string[];
      }) => {
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
        }));
      })
      .catch((err: Error) => setSuggestError(err.message))
      .finally(() => setSuggestLoading(false));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      websiteUrl: form.websiteUrl.trim(),
      deploymentModel: form.deploymentModel.trim() || undefined,
      pricingModel: form.pricingModel.trim() || undefined,
      targetCustomerSize: form.targetCustomerSize.trim() || undefined,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      strengths: form.strengths.split(/\r?\n/).map((t) => t.trim()).filter(Boolean),
      weaknesses: form.weaknesses.split(/\r?\n/).map((t) => t.trim()).filter(Boolean),
      differentiators: form.differentiators.split(/\r?\n/).map((t) => t.trim()).filter(Boolean),
    };
    if (!payload.name) {
      setError("Name is required.");
      setSubmitting(false);
      return;
    }
    fetch("/api/admin/platforms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || "Failed to add platform")));
        return res.json();
      })
      .then((newPlatform: Platform) => {
        setSuccess(`Platform "${newPlatform.name}" was added.`);
        setForm({
          name: "",
          description: "",
          websiteUrl: "",
          deploymentModel: "",
          pricingModel: "",
          targetCustomerSize: "",
          tags: "",
          strengths: "",
          weaknesses: "",
          differentiators: "",
        });
        setTimeout(() => setSuccess(null), 5000);
        populateNewPlatformCategories(newPlatform);
      })
      .catch((err) => setError(err.message))
      .finally(() => setSubmitting(false));
  }

  function populateNewPlatformCategories(platform: Platform) {
    setCategoryPopulateStatus("Populating category scores with AI…");
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((categories: Category[]) => {
        if (categories.length === 0) {
          setCategoryPopulateStatus(null);
          return;
        }
        const categoriesOut: Record<string, { score: number; note: string }> = {};
        let index = 0;
        const run = (): Promise<void> => {
          if (index >= categories.length) {
            setCategoryPopulateStatus("Category scores populated with AI.");
            setTimeout(() => setCategoryPopulateStatus(null), 5000);
            return fetch(`/api/admin/platforms/${encodeURIComponent(platform.id)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ categories: categoriesOut }),
            }).then((res) => {
              if (!res.ok) setError("Failed to update platform category scores.");
            });
          }
          const cat = categories[index++];
          return fetchWithTimeout(
            "/api/admin/ai/suggest-category",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                platformId: platform.id,
                categoryId: cat.id,
                categoryLabel: cat.label,
                categoryDescription: cat.description,
                ...(cat.promptGuidance?.trim() && { promptGuidance: cat.promptGuidance.trim() }),
              }),
            },
            SUGGEST_CATEGORY_TIMEOUT_MS
          )
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Suggest failed"))))
            .then((data: { score: number; note: string }) => {
              categoriesOut[cat.id] = { score: data.score, note: data.note };
            })
            .catch(() => {
              categoriesOut[cat.id] = { score: 0, note: "" };
            })
            .then(run);
        };
        return run();
      })
      .catch((err) => {
        setCategoryPopulateStatus(null);
        setError(err?.message ?? "Failed to populate category scores.");
      });
  }

  return (
    <main className="page-content">
      <h1>Add platform</h1>
      <p className="mt-2 text-content-muted">
        Create a new platform entry for the comparison.
      </p>

      <section className="mt-8" aria-labelledby="add-platform-heading">
        <h2 id="add-platform-heading">New platform</h2>
        {success && (
          <p className="mt-2 text-green-600" role="status">
            {success}{" "}
            <Link href="/platforms" className="underline">
              View platform list
            </Link>
          </p>
        )}
        {categoryPopulateStatus && (
          <p className="mt-2 text-content-muted" role="status">
            {categoryPopulateStatus}
          </p>
        )}
        {error && (
          <p className="mt-2 text-red-600" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-4 max-w-xl space-y-4">
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
              <option value="">Select…</option>
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
              <option value="">Select…</option>
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
              <option value="">Select…</option>
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
          <p className="text-sm text-content-muted">AI-generated; please verify before saving.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleSuggestContent}
              disabled={suggestLoading || !form.name.trim()}
              variant="secondary"
            >
              {suggestLoading ? "Suggesting…" : "Suggest content with AI"}
            </Button>
            {suggestError && (
              <p className="text-red-600" role="alert">
                {suggestError}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} variant="primary">
              {submitting ? "Adding…" : "Add platform"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
