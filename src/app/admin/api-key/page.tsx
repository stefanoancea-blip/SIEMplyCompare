"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";

export default function AdminApiKeyPage() {
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keySaveSuccess, setKeySaveSuccess] = useState<string | null>(null);
  const [keySaveError, setKeySaveError] = useState<string | null>(null);
  const [keySaving, setKeySaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => setApiKeyConfigured(data.apiKeyConfigured === true))
      .catch(() => setApiKeyConfigured(false));
  }, []);

  function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    setKeySaveError(null);
    setKeySaveSuccess(null);
    setKeySaving(true);
    fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: apiKeyInput }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || "Failed to save key")));
        return res.json();
      })
      .then(() => {
        setKeySaveSuccess("Key saved. You can use Suggest content with AI.");
        setApiKeyInput("");
        setApiKeyConfigured(true);
        setTimeout(() => setKeySaveSuccess(null), 5000);
      })
      .catch((err) => setKeySaveError(err.message))
      .finally(() => setKeySaving(false));
  }

  return (
    <main className="page-content">
      <h1>API Key</h1>
      <p className="mt-2 text-content-muted">
        Configure your OpenAI API key for the &quot;Suggest content with AI&quot; feature.
      </p>

      <section className="mt-8 rounded-lg border border-gray-200 bg-content-bg-muted p-4 shadow-sm" aria-labelledby="ai-settings-heading">
        <h2 id="ai-settings-heading">
          AI suggestion (OpenAI)
        </h2>
        <p className="mt-2 text-sm text-content-muted">
          Enter your OpenAI API key to use &quot;Suggest content with AI&quot;. It is stored only on this server and never sent back to the browser.
        </p>
        {apiKeyConfigured ? (
          <p className="mt-3 text-green-600">API key is set.</p>
        ) : null}
        <form onSubmit={handleSaveKey} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[200px]">
            <span className="sr-only">OpenAI API key</span>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-..."
              className="block w-full rounded border border-gray-300 bg-content-bg px-3 py-2 text-content-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <Button type="submit" disabled={keySaving} variant="primary">
            {keySaving ? "Saving…" : "Save key"}
          </Button>
        </form>
        {keySaveSuccess && (
          <p className="mt-3 text-green-600" role="status">
            {keySaveSuccess}
          </p>
        )}
        {keySaveError && (
          <p className="mt-3 text-red-600" role="alert">
            {keySaveError}
          </p>
        )}
      </section>
    </main>
  );
}
