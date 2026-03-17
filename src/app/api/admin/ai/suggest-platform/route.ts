import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getOpenAIKey, OPENAI_CHAT_MODEL } from "@/lib/openai";

const CATEGORIES_PATH = path.join(process.cwd(), "data", "categories.json");

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return match ? match[1].trim() : trimmed;
}

function clampScore(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(1, Math.min(5, Math.round(n)));
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Add it in Admin settings." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }
    const websiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : undefined;

    const categoriesRaw = await readFile(CATEGORIES_PATH, "utf-8");
    const categories = JSON.parse(categoriesRaw) as { id: string; label: string }[];
    const categoryIds = categories.map((c) => c.id);

    const categorySchema = Object.fromEntries(
      categoryIds.map((id) => [id, { score: "number 1-5", note: "string" }])
    );

    const systemPrompt = `You are a cybersecurity analyst. Output only valid JSON, no markdown or explanation.
Given a security platform name (and optional URL), produce a comparison entry with this exact structure. Use the category ids provided; score must be 1-5.`;

    const userPrompt = `Platform name: ${name}${websiteUrl ? `\nWebsite: ${websiteUrl}` : ""}

Return a JSON object with these exact keys:
- name (string)
- description (string, 1-2 sentences)
- websiteUrl (string, use "${websiteUrl || ""}" if provided else empty string)
- tags (array of strings, e.g. ["XDR", "SIEM", "Cloud"])
- deploymentModel (string: "cloud" | "on-prem" | "hybrid")
- pricingModel (string: "subscription" | "usage-based" | "other")
- targetCustomerSize (string: "smb" | "midmarket" | "enterprise")
- categories (object with keys ${JSON.stringify(categoryIds)}, each value { "score": 1-5, "note": "short string" })
- strengths (array of 2-4 strings)
- weaknesses (array of 2-4 strings)
- differentiators (array of 2-4 strings)

Output only the JSON object.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = (await response.json()) as { error?: { message?: string } };
      const message = err?.error?.message || response.statusText;
      return NextResponse.json(
        { error: `OpenAI API error: ${message}` },
        { status: 502 }
      );
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No content in OpenAI response" },
        { status: 502 }
      );
    }

    const rawJson = stripJsonFence(content);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawJson) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "OpenAI returned invalid JSON" },
        { status: 502 }
      );
    }

    const tags = Array.isArray(parsed.tags)
      ? (parsed.tags as unknown[]).filter((t): t is string => typeof t === "string")
      : [];
    const strengths = Array.isArray(parsed.strengths)
      ? (parsed.strengths as unknown[]).filter((s): s is string => typeof s === "string")
      : [];
    const weaknesses = Array.isArray(parsed.weaknesses)
      ? (parsed.weaknesses as unknown[]).filter((w): w is string => typeof w === "string")
      : [];
    const differentiators = Array.isArray(parsed.differentiators)
      ? (parsed.differentiators as unknown[]).filter((d): d is string => typeof d === "string")
      : [];

    const categoriesIn = parsed.categories && typeof parsed.categories === "object" ? (parsed.categories as Record<string, { score?: unknown; note?: string }>) : {};
    const categoriesOut: Record<string, { score: number; note: string }> = {};
    for (const id of categoryIds) {
      const c = categoriesIn[id];
      const score = c && typeof c.score === "number" ? clampScore(c.score) : 0;
      const note = c && typeof c.note === "string" ? c.note.trim() : "";
      categoriesOut[id] = { score, note };
    }

    const suggested = {
      name: typeof parsed.name === "string" ? parsed.name.trim() : name,
      description: typeof parsed.description === "string" ? parsed.description.trim() : "",
      websiteUrl: typeof parsed.websiteUrl === "string" ? parsed.websiteUrl.trim() : "",
      tags,
      deploymentModel: typeof parsed.deploymentModel === "string" ? parsed.deploymentModel : "cloud",
      pricingModel: typeof parsed.pricingModel === "string" ? parsed.pricingModel : "subscription",
      targetCustomerSize: typeof parsed.targetCustomerSize === "string" ? parsed.targetCustomerSize : "midmarket",
      categories: categoriesOut,
      strengths,
      weaknesses,
      differentiators,
    };

    return NextResponse.json(suggested);
  } catch (error) {
    console.error("POST /api/admin/ai/suggest-platform failed:", error);
    return NextResponse.json(
      { error: "Failed to suggest platform content" },
      { status: 500 }
    );
  }
}
