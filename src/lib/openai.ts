import { readFile } from "fs/promises";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), "data", ".settings.json");

/**
 * Resolves the OpenAI API key: Admin-configured key in data/.settings.json first,
 * then OPENAI_API_KEY environment variable.
 */
export async function getOpenAIKey(): Promise<string> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8");
    const settings = JSON.parse(raw) as { openaiApiKey?: string };
    const key = typeof settings.openaiApiKey === "string" ? settings.openaiApiKey.trim() : "";
    if (key) return key;
  } catch {
    // file missing or invalid
  }
  const envKey = process.env.OPENAI_API_KEY;
  return typeof envKey === "string" ? envKey.trim() : "";
}

/** OpenAI chat model used for all AI features (suggest-category, suggest-platform, compare generate). */
export const OPENAI_CHAT_MODEL = "gpt-4.1";
