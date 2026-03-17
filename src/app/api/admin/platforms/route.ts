import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { getCategories } from "@/lib/platforms";
import type { CategoryScore, Platform } from "@/types/platform";

const PLATFORMS_PATH = path.join(process.cwd(), "data", "platforms.json");

function slugFromName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return base || "platform";
}

function ensureUniqueId(baseId: string, existingIds: Set<string>): string {
  let id = baseId;
  let n = 1;
  while (existingIds.has(id)) {
    id = `${baseId}-${++n}`;
  }
  return id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const websiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : "";
    const deploymentModel = typeof body.deploymentModel === "string" ? body.deploymentModel.trim() : "cloud";
    const pricingModel = typeof body.pricingModel === "string" ? body.pricingModel.trim() : "subscription";
    const targetCustomerSize = typeof body.targetCustomerSize === "string" ? body.targetCustomerSize.trim() : "midmarket";
    let tags: string[] = [];
    if (Array.isArray(body.tags)) {
      tags = body.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean);
    } else if (typeof body.tags === "string") {
      tags = body.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
    }

    const parseStringList = (val: unknown): string[] => {
      if (Array.isArray(val)) return val.filter((x: unknown) => typeof x === "string").map((x: string) => x.trim()).filter(Boolean);
      if (typeof val === "string") return val.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
      return [];
    };
    const strengths = parseStringList(body.strengths);
    const weaknesses = parseStringList(body.weaknesses);
    const differentiators = parseStringList(body.differentiators);

    const categories = await getCategories();
    const categoryScores: Record<string, CategoryScore> = {};
    for (const cat of categories) {
      categoryScores[cat.id] = { score: 0, note: "" };
    }

    const data = await readFile(PLATFORMS_PATH, "utf-8");
    const platforms = JSON.parse(data) as Platform[];
    const existingIds = new Set(platforms.map((p) => p.id));
    const baseId = slugFromName(name);
    const id = ensureUniqueId(baseId, existingIds);

    const now = new Date().toISOString().slice(0, 10);
    const newPlatform: Platform = {
      id,
      name,
      description,
      websiteUrl,
      tags,
      deploymentModel,
      pricingModel,
      targetCustomerSize,
      categories: categoryScores,
      strengths,
      weaknesses,
      differentiators,
      updatedAt: now,
    };

    platforms.push(newPlatform);
    await writeFile(PLATFORMS_PATH, JSON.stringify(platforms, null, 2), "utf-8");

    return NextResponse.json(newPlatform, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/platforms failed:", error);
    return NextResponse.json(
      { error: "Failed to add platform" },
      { status: 500 }
    );
  }
}
