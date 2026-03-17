import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { mkdir } from "fs/promises";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), "data", ".settings.json");

export async function GET() {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8");
    const settings = JSON.parse(raw) as { openaiApiKey?: string };
    const key = typeof settings.openaiApiKey === "string" ? settings.openaiApiKey.trim() : "";
    return NextResponse.json({ apiKeyConfigured: key.length > 0 });
  } catch {
    return NextResponse.json({ apiKeyConfigured: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }
    if (!apiKey.startsWith("sk-")) {
      return NextResponse.json(
        { error: "API key should start with sk-" },
        { status: 400 }
      );
    }

    const dataDir = path.dirname(SETTINGS_PATH);
    await mkdir(dataDir, { recursive: true });

    let existing: Record<string, unknown> = {};
    try {
      const raw = await readFile(SETTINGS_PATH, "utf-8");
      existing = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // file missing or invalid, use empty object
    }

    const settings = { ...existing, openaiApiKey: apiKey };
    await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/settings failed:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
