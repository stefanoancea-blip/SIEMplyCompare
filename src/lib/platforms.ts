import { readFile } from "fs/promises";
import path from "path";
import type { Category, Platform } from "@/types/platform";

export async function getPlatforms(): Promise<Platform[]> {
  const filePath = path.join(process.cwd(), "data", "platforms.json");
  const data = await readFile(filePath, "utf-8");
  return JSON.parse(data) as Platform[];
}

export async function getPlatformById(id: string): Promise<Platform | null> {
  const platforms = await getPlatforms();
  return platforms.find((p) => p.id === id) ?? null;
}

export async function getCategories(): Promise<Category[]> {
  const filePath = path.join(process.cwd(), "data", "categories.json");
  const data = await readFile(filePath, "utf-8");
  return JSON.parse(data) as Category[];
}
