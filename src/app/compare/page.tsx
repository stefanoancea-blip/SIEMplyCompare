"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import type { CompareResult } from "@/lib/compare";
import type { Platform } from "@/types/platform";

interface GeneratedDocument {
  overview: string;
  technical: string;
  commercial: string;
}

export default function ComparePage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [idA, setIdA] = useState<string>("");
  const [idB, setIdB] = useState<string>("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platforms")
      .then((res) => res.json())
      .then((data) => setPlatforms(Array.isArray(data) ? data : []))
      .catch(() => setPlatforms([]));
  }, []);

  useEffect(() => {
    if (!idA || !idB || idA === idB) {
      setResult(null);
      setError(idA && idB && idA === idB ? "Choose two different platforms." : null);
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    fetch(`/api/compare?ids=${encodeURIComponent(idA)},${encodeURIComponent(idB)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Platform not found." : "Failed to load comparison.");
        return res.json();
      })
      .then((data: CompareResult) => setResult(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [idA, idB]);

  useEffect(() => {
    setGeneratedDoc(null);
    setDocumentError(null);
    setExportError(null);
  }, [idA, idB]);

  function handleGenerateDocument() {
    if (!result) return;
    setDocumentError(null);
    setExportError(null);
    setDocumentLoading(true);
    fetch("/api/compare/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platformAId: result.platformA.id,
        platformBId: result.platformB.id,
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || "Generation failed")));
        return res.json();
      })
      .then((data: GeneratedDocument) => setGeneratedDoc(data))
      .catch((err) => setDocumentError(err.message))
      .finally(() => setDocumentLoading(false));
  }

  function handleExportWord() {
    if (!result || !generatedDoc) return;
    setExportError(null);
    fetch("/api/compare/export-docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overview: generatedDoc.overview,
        technical: generatedDoc.technical,
        commercial: generatedDoc.commercial,
        platformAName: result.platformA.name,
        platformBName: result.platformB.name,
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || "Export failed")));
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = "comparison.docx";
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => setExportError(err.message));
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function paragraphsToHtml(text: string): string {
    return text
      .split("\n\n")
      .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
      .join("");
  }

  function handleSaveAsPdf() {
    if (!result || !generatedDoc) return;
    const title = `Comparison: ${result.platformA.name} vs ${result.platformB.name}`;
    const html = `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title></head><body style="font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem;"><h1>${escapeHtml(title)}</h1><h2>1. High-Level Overview</h2><div>${paragraphsToHtml(generatedDoc.overview)}</div><h2>2. Technical Comparison</h2><div>${paragraphsToHtml(generatedDoc.technical)}</div><h2>3. Commercial Comparison</h2><div>${paragraphsToHtml(generatedDoc.commercial)}</div></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.print();
    };
  }

  return (
    <main className="page-content">
      <h1>Compare</h1>
      <p className="mt-2 text-content-muted">
        Select two platforms to compare side by side.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-content-foreground">Platform A</span>
          <select
            value={idA}
            onChange={(e) => setIdA(e.target.value)}
            className="rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select platform…</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === idB}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-content-foreground">Platform B</span>
          <select
            value={idB}
            onChange={(e) => setIdB(e.target.value)}
            className="rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select platform…</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === idA}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <p className="mt-6 text-content-muted">Loading comparison…</p>
      )}

      {result && !loading && (
        <section className="mt-8" aria-labelledby="comparison-heading">
          <h2 id="comparison-heading" className="sr-only">
            Comparison results
          </h2>

          <div className="mb-6 flex flex-wrap gap-6 rounded-lg border border-gray-200 bg-content-bg-muted p-4 shadow-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-content-foreground">{result.platformA.name}</span>
              <span className="text-lg font-semibold text-content-foreground">
                Overall: {result.overallScoreA}/5
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-content-foreground">{result.platformB.name}</span>
              <span className="text-lg font-semibold text-content-foreground">
                Overall: {result.overallScoreB}/5
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-content-bg shadow-sm">
            <table className="min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-content-bg-muted">
                  <th className="sticky left-0 z-10 min-w-[140px] border-r border-gray-200 bg-content-bg-muted px-4 py-3 font-semibold text-content-foreground">
                    Category
                  </th>
                  <th className="min-w-[180px] px-4 py-3 font-semibold text-content-foreground">
                    {result.platformA.name}
                  </th>
                  <th className="min-w-[180px] px-4 py-3 font-semibold text-content-foreground">
                    {result.platformB.name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.categoryRows.map((row) => (
                  <tr key={row.categoryId} className="border-b border-gray-100">
                    <td className="sticky left-0 z-10 border-r border-gray-200 bg-content-bg px-4 py-3 font-medium text-content-foreground">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-content-muted">
                      <span className="font-medium text-content-foreground">{row.platformA.score}/5</span>
                      {row.platformA.note && (
                        <p className="mt-1 text-sm text-content-muted">{row.platformA.note}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-content-muted">
                      <span className="font-medium text-content-foreground">{row.platformB.score}/5</span>
                      {row.platformB.note && (
                        <p className="mt-1 text-sm text-content-muted">{row.platformB.note}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-semibold text-content-foreground">Comparison document</h3>
            <p className="mt-1 text-sm text-content-muted">
              Generate a brief comparison report and export as Word or PDF.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="primary"
                disabled={documentLoading}
                onClick={handleGenerateDocument}
              >
                {documentLoading ? "Generating…" : "Generate comparison document"}
              </Button>
            </div>
            {documentError && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {documentError}
              </p>
            )}
            {exportError && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {exportError}
              </p>
            )}
            {generatedDoc && !documentLoading && (
              <>
                <div className="mt-6 space-y-6 rounded-lg border border-gray-200 bg-content-bg p-4 shadow-sm">
                  <section>
                    <h4 className="text-base font-semibold text-content-foreground">
                      1. High-Level Overview
                    </h4>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-content-muted">
                      {generatedDoc.overview}
                    </div>
                  </section>
                  <section>
                    <h4 className="text-base font-semibold text-content-foreground">
                      2. Technical Comparison
                    </h4>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-content-muted">
                      {generatedDoc.technical}
                    </div>
                  </section>
                  <section>
                    <h4 className="text-base font-semibold text-content-foreground">
                      3. Commercial Comparison
                    </h4>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-content-muted">
                      {generatedDoc.commercial}
                    </div>
                  </section>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" variant="secondary" onClick={handleExportWord}>
                    Export as Word
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleSaveAsPdf}>
                    Save as PDF
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

    </main>
  );
}
