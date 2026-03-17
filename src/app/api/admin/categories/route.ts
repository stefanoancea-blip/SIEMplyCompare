import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import type { Category, Platform } from "@/types/platform";

const CATEGORIES_PATH = path.join(process.cwd(), "data", "categories.json");
const PLATFORMS_PATH = path.join(process.cwd(), "data", "platforms.json");

/** Slug-friendly: lowercase, hyphens, no spaces. */
function isValidCategoryId(id: string): boolean {
  return /^[a-z0-9-]+$/.test(id) && id.length > 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim().toLowerCase().replace(/\s+/g, "-") : "";
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : undefined;
    const promptGuidance =
      typeof body.promptGuidance === "string" ? (body.promptGuidance.trim() || undefined) : undefined;

    if (!id || !isValidCategoryId(id)) {
      return NextResponse.json(
        { error: "Category id is required and must be slug-friendly (lowercase, hyphens, no spaces)." },
        { status: 400 }
      );
    }
    if (!label) {
      return NextResponse.json(
        { error: "Label is required." },
        { status: 400 }
      );
    }

    const categoriesRaw = await readFile(CATEGORIES_PATH, "utf-8");
    const categories = JSON.parse(categoriesRaw) as Category[];
    if (categories.some((c) => c.id === id)) {
      return NextResponse.json(
        { error: "A category with this id already exists." },
        { status: 409 }
      );
    }

    const newCategory: Category = {
      id,
      label,
      ...(description ? { description } : {}),
      ...(promptGuidance ? { promptGuidance } : {}),
    };
    categories.push(newCategory);
    await writeFile(CATEGORIES_PATH, JSON.stringify(categories, null, 2), "utf-8");

    const platformsRaw = await readFile(PLATFORMS_PATH, "utf-8");
    const platforms = JSON.parse(platformsRaw) as Platform[];
    for (const platform of platforms) {
      if (!platform.categories) platform.categories = {};
      platform.categories[id] = { score: 0, note: "" };
    }
    await writeFile(PLATFORMS_PATH, JSON.stringify(platforms, null, 2), "utf-8");

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/categories failed:", error);
    return NextResponse.json(
      { error: "Failed to add category" },
      { status: 500 }
    );
  }
}
