import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import type { Category, Platform } from "@/types/platform";

const CATEGORIES_PATH = path.join(process.cwd(), "data", "categories.json");
const PLATFORMS_PATH = path.join(process.cwd(), "data", "platforms.json");

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { error: "Category id is required." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const label = typeof body.label === "string" ? body.label.trim() : undefined;
    const description =
      typeof body.description === "string" ? (body.description.trim() || undefined) : undefined;
    const promptGuidance =
      typeof body.promptGuidance === "string" ? (body.promptGuidance.trim() || undefined) : undefined;

    const categoriesRaw = await readFile(CATEGORIES_PATH, "utf-8");
    const categories = JSON.parse(categoriesRaw) as Category[];
    const category = categories.find((c) => c.id === id);
    if (!category) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 }
      );
    }

    if (label !== undefined) category.label = label;
    if (description !== undefined) category.description = description;
    if (promptGuidance !== undefined) category.promptGuidance = promptGuidance;

    await writeFile(CATEGORIES_PATH, JSON.stringify(categories, null, 2), "utf-8");

    return NextResponse.json(category, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/admin/categories/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { error: "Category id is required." },
        { status: 400 }
      );
    }

    const categoriesRaw = await readFile(CATEGORIES_PATH, "utf-8");
    const categories = JSON.parse(categoriesRaw) as Category[];
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 }
      );
    }

    categories.splice(index, 1);
    await writeFile(CATEGORIES_PATH, JSON.stringify(categories, null, 2), "utf-8");

    const platformsRaw = await readFile(PLATFORMS_PATH, "utf-8");
    const platforms = JSON.parse(platformsRaw) as Platform[];
    for (const platform of platforms) {
      if (platform.categories && platform.categories[id] !== undefined) {
        delete platform.categories[id];
      }
    }
    await writeFile(PLATFORMS_PATH, JSON.stringify(platforms, null, 2), "utf-8");

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/admin/categories/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to remove category" },
      { status: 500 }
    );
  }
}
