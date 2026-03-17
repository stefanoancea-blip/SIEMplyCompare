import { NextRequest, NextResponse } from "next/server";
import { getPlatformById, getCategories } from "@/lib/platforms";
import { getOpenAIKey, OPENAI_CHAT_MODEL } from "@/lib/openai";
import type { Category, Platform } from "@/types/platform";

function formatPlatformForPrompt(platform: Platform, categories: Category[]): string {
  const lines: string[] = [];
  lines.push(`Description: ${platform.description || "(none)"}`);
  lines.push(`Tags: ${(platform.tags && platform.tags.length) ? platform.tags.join(", ") : "(none)"}`);
  lines.push(
    `Deployment: ${platform.deploymentModel || "(none)"} | Pricing: ${platform.pricingModel || "(none)"} | Target: ${platform.targetCustomerSize || "(none)"}`
  );
  const categoryParts: string[] = [];
  for (const cat of categories) {
    const score = platform.categories[cat.id];
    const s = score != null ? score.score : 0;
    const note = score?.note ?? "";
    categoryParts.push(`  ${cat.label}: ${s}/5${note ? ` - ${note}` : ""}`);
  }
  lines.push("Category scores and notes:");
  lines.push(categoryParts.length ? categoryParts.join("\n") : "  (none)");
  lines.push(`Strengths: ${(platform.strengths?.length) ? platform.strengths.join("; ") : "(none)"}`);
  lines.push(`Weaknesses: ${(platform.weaknesses?.length) ? platform.weaknesses.join("; ") : "(none)"}`);
  lines.push(
    `Differentiators: ${(platform.differentiators?.length) ? platform.differentiators.join("; ") : "(none)"}`
  );
  lines.push(`Notes: ${platform.notes ?? "(none)"}`);
  return lines.join("\n");
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return match ? match[1].trim() : trimmed;
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
    const platformAId = typeof body.platformAId === "string" ? body.platformAId.trim() : "";
    const platformBId = typeof body.platformBId === "string" ? body.platformBId.trim() : "";

    if (!platformAId || !platformBId) {
      return NextResponse.json(
        { error: "platformAId and platformBId are required" },
        { status: 400 }
      );
    }
    if (platformAId === platformBId) {
      return NextResponse.json(
        { error: "platformAId and platformBId must be different" },
        { status: 400 }
      );
    }

    const [platformA, platformB, categories] = await Promise.all([
      getPlatformById(platformAId),
      getPlatformById(platformBId),
      getCategories(),
    ]);

    if (!platformA) {
      return NextResponse.json(
        { error: `Platform not found: ${platformAId}` },
        { status: 404 }
      );
    }
    if (!platformB) {
      return NextResponse.json(
        { error: `Platform not found: ${platformBId}` },
        { status: 404 }
      );
    }

    const systemPrompt =
      'You are a cybersecurity analyst writing a brief comparison document for two security platforms. Use only the information provided; do not invent facts. Write in clear, professional prose. Output only valid JSON with exactly three keys: "overview", "technical", "commercial". No markdown, no code fences. Each value is a string of one or more paragraphs for that section.';

    const platformAText = formatPlatformForPrompt(platformA, categories);
    const platformBText = formatPlatformForPrompt(platformB, categories);

    const userPrompt = `Generate a brief comparison document for these two platforms. Use only the data below.

Platform A: ${platformA.name}
${platformAText}

Platform B: ${platformB.name}
${platformBText}

Output JSON with:
- "overview": High-level overview of both platforms (positioning, summary, 1–3 paragraphs).
- "technical": Technical comparison (capabilities, category-by-category comparison using the scores and notes; 2–4 paragraphs).
- "commercial": Commercial comparison (pricing model, deployment, target customer size, commercial strengths/weaknesses; 1–2 paragraphs).`;

    const openAiTimeoutMs = 90_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), openAiTimeoutMs);

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
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
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const message = fetchErr instanceof Error ? fetchErr.name : "Request failed";
      return NextResponse.json(
        { error: `OpenAI request failed (${message}). Check API key and network.` },
        { status: 502 }
      );
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = (await response.json()) as { error?: { message?: string } };
      const message = err?.error?.message || response.statusText;
      return NextResponse.json(
        { error: `OpenAI API error: ${message}` },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Empty or invalid response from OpenAI" },
        { status: 502 }
      );
    }

    const raw = stripJsonFence(content);
    let parsed: { overview?: string; technical?: string; commercial?: string };
    try {
      parsed = JSON.parse(raw) as { overview?: string; technical?: string; commercial?: string };
    } catch {
      return NextResponse.json(
        { error: "OpenAI response was not valid JSON" },
        { status: 502 }
      );
    }

    const overview = typeof parsed.overview === "string" ? parsed.overview : "";
    const technical = typeof parsed.technical === "string" ? parsed.technical : "";
    const commercial = typeof parsed.commercial === "string" ? parsed.commercial : "";

    return NextResponse.json({ overview, technical, commercial });
  } catch (error) {
    console.error("POST /api/compare/generate failed:", error);
    return NextResponse.json(
      { error: "Failed to generate comparison document" },
      { status: 500 }
    );
  }
}
