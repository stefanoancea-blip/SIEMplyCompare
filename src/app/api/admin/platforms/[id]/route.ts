import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import type { CategoryScore, Platform } from "@/types/platform";

const PLATFORMS_PATH = path.join(process.cwd(), "data", "platforms.json");

const MIN_SCORE = 1;
const MAX_SCORE = 5;

function isValidScore(n: unknown): boolean {
  return typeof n === "number" && !Number.isNaN(n) && n >= MIN_SCORE && n <= MAX_SCORE;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    if (name !== undefined && !name) {
      return NextResponse.json(
        { error: "Name is required and cannot be empty" },
        { status: 400 }
      );
    }

    const categories = body.categories;
    if (categories !== undefined && categories !== null) {
      if (typeof categories !== "object" || Array.isArray(categories)) {
        return NextResponse.json(
          { error: "categories must be an object of category id to { score, note }" },
          { status: 400 }
        );
      }
      for (const [catId, val] of Object.entries(categories)) {
        const v = val as { score?: unknown; note?: unknown };
        if (v.score !== undefined && v.score !== null && !isValidScore(v.score)) {
          return NextResponse.json(
            { error: `Category "${catId}" score must be between ${MIN_SCORE} and ${MAX_SCORE}` },
            { status: 400 }
          );
        }
      }
    }

    const data = await readFile(PLATFORMS_PATH, "utf-8");
    const platforms = JSON.parse(data) as Platform[];
    const index = platforms.findIndex((p) => p.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: "Platform not found" },
        { status: 404 }
      );
    }

    const current = platforms[index] as Platform;

    if (name !== undefined) current.name = name;
    if (body.description !== undefined) current.description = typeof body.description === "string" ? body.description.trim() : "";
    if (body.websiteUrl !== undefined) current.websiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : "";
    if (body.deploymentModel !== undefined) current.deploymentModel = typeof body.deploymentModel === "string" ? body.deploymentModel.trim() : current.deploymentModel;
    if (body.pricingModel !== undefined) current.pricingModel = typeof body.pricingModel === "string" ? body.pricingModel.trim() : current.pricingModel;
    if (body.targetCustomerSize !== undefined) current.targetCustomerSize = typeof body.targetCustomerSize === "string" ? body.targetCustomerSize.trim() : current.targetCustomerSize;

    if (body.tags !== undefined) {
      if (Array.isArray(body.tags)) {
        current.tags = body.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean);
      } else if (typeof body.tags === "string") {
        current.tags = body.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
      }
    }

    const parseStringList = (val: unknown): string[] => {
      if (Array.isArray(val)) return val.filter((x: unknown) => typeof x === "string").map((x: string) => x.trim()).filter(Boolean);
      if (typeof val === "string") return val.split(/\r?\n|,/).map((s: string) => s.trim()).filter(Boolean);
      return [];
    };
    if (body.strengths !== undefined) current.strengths = parseStringList(body.strengths);
    if (body.weaknesses !== undefined) current.weaknesses = parseStringList(body.weaknesses);
    if (body.differentiators !== undefined) current.differentiators = parseStringList(body.differentiators);

    if (categories !== undefined && typeof categories === "object") {
      for (const [catId, val] of Object.entries(categories)) {
        const v = val as { score?: number; note?: string };
        if (!current.categories[catId]) current.categories[catId] = { score: 0, note: "" };
        const entry = current.categories[catId] as CategoryScore;
        if (v.score !== undefined && v.score !== null) entry.score = Number(v.score);
        if (v.note !== undefined) entry.note = typeof v.note === "string" ? v.note.trim() : "";
      }
    }

    current.updatedAt = new Date().toISOString().slice(0, 10);

    platforms[index] = current;
    await writeFile(PLATFORMS_PATH, JSON.stringify(platforms, null, 2), "utf-8");

    return NextResponse.json(current);
  } catch (error) {
    console.error("PATCH /api/admin/platforms/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to update platform" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = await readFile(PLATFORMS_PATH, "utf-8");
    const platforms = JSON.parse(data) as Platform[];
    const index = platforms.findIndex((p) => p.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: "Platform not found" },
        { status: 404 }
      );
    }
    platforms.splice(index, 1);
    await writeFile(PLATFORMS_PATH, JSON.stringify(platforms, null, 2), "utf-8");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/admin/platforms/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete platform" },
      { status: 500 }
    );
  }
}
