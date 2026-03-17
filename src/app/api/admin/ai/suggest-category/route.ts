import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import type { Platform } from "@/types/platform";
import { getOpenAIKey, OPENAI_CHAT_MODEL } from "@/lib/openai";

const PLATFORMS_PATH = path.join(process.cwd(), "data", "platforms.json");

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
    const platformId = typeof body.platformId === "string" ? body.platformId.trim() : "";
    const categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
    const categoryLabel = typeof body.categoryLabel === "string" ? body.categoryLabel.trim() : "";
    const categoryDescription = typeof body.categoryDescription === "string" ? body.categoryDescription.trim() : undefined;
    const promptGuidance = typeof body.promptGuidance === "string" ? body.promptGuidance.trim() : undefined;

    if (!platformId) {
      return NextResponse.json(
        { error: "platformId is required" },
        { status: 400 }
      );
    }
    if (!categoryId || !categoryLabel) {
      return NextResponse.json(
        { error: "categoryId and categoryLabel are required" },
        { status: 400 }
      );
    }

    const platformsRaw = await readFile(PLATFORMS_PATH, "utf-8");
    const platforms = JSON.parse(platformsRaw) as Platform[];
    const platform = platforms.find((p) => p.id === platformId);
    if (!platform) {
      return NextResponse.json(
        { error: "Platform not found." },
        { status: 404 }
      );
    }

    const categoryContext = categoryDescription
      ? `${categoryLabel}: ${categoryDescription}`
      : categoryLabel;

    const systemPrompt = `You are a cybersecurity analyst. Score meaning: 5 = exceptional/best-in-class, 4 = strong, 3 = adequate/average, 2 = weak or partial, 1 = poor or minimal. Use the full 1–5 scale; most platforms should score 2–4. Reserve 5 for truly exceptional and 1 for clearly lacking. Base your score and note only on the platform information provided in the user message; do not rely on general knowledge. Output only valid JSON with "score" (number 1–5) and "note" (short string). No markdown or explanation.`;

    const platformContextParts: string[] = [];
    if (platform.description) platformContextParts.push(platform.description);
    if (platform.notes) platformContextParts.push(platform.notes);
    if (platform.strengths?.length) platformContextParts.push("Strengths: " + platform.strengths.join("; "));
    if (platform.weaknesses?.length) platformContextParts.push("Weaknesses: " + platform.weaknesses.join("; "));
    const platformContextBlock =
      platformContextParts.length > 0
        ? `\n\nPlatform information (use only this when scoring):\n${platformContextParts.join("\n\n")}\n`
        : "";

    let userPrompt = `Security platform: ${platform.name}${platformContextBlock}

Category to score: ${categoryContext}
`;
    if (promptGuidance) {
      userPrompt += `

Apply the following criteria strictly when assigning the score; they override the generic scale.

${promptGuidance}

Map the platform to the criteria above, then output the corresponding score and note.
`;
    }
    userPrompt += `

Assign a score from 1 to 5 using this scale: 5=exceptional, 4=strong, 3=adequate, 2=weak, 1=poor. Use the full range; do not cluster at 4–5. Return a JSON object with: score (number 1–5) and note (short string, one line). Output only the JSON object.`;

    const temperature = promptGuidance ? 0.2 : 0.3;
    const openAiTimeoutMs = 60_000;
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
          temperature,
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

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No content in OpenAI response" },
        { status: 502 }
      );
    }

    const rawJson = stripJsonFence(content);
    let parsed: { score?: unknown; note?: string };
    try {
      parsed = JSON.parse(rawJson) as { score?: unknown; note?: string };
    } catch {
      return NextResponse.json(
        { error: "OpenAI returned invalid JSON" },
        { status: 502 }
      );
    }

    const score = typeof parsed.score === "number" ? clampScore(parsed.score) : 0;
    const note = typeof parsed.note === "string" ? parsed.note.trim() : "";

    return NextResponse.json({ score, note });
  } catch (error) {
    console.error("POST /api/admin/ai/suggest-category failed:", error);
    return NextResponse.json(
      { error: "Failed to suggest category score" },
      { status: 500 }
    );
  }
}
