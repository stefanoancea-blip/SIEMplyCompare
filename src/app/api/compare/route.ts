import { NextRequest, NextResponse } from "next/server";
import { getPlatformById, getCategories } from "@/lib/platforms";
import { comparePlatforms } from "@/lib/compare";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const idsParam = searchParams.get("ids");

  if (!idsParam || typeof idsParam !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid query parameter: ids" },
      { status: 400 }
    );
  }

  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length < 2) {
    return NextResponse.json(
      { error: "At least two platform ids are required (e.g. ids=id1,id2)" },
      { status: 400 }
    );
  }

  const [platformA, platformB] = await Promise.all([
    getPlatformById(ids[0]),
    getPlatformById(ids[1]),
  ]);

  if (!platformA) {
    return NextResponse.json(
      { error: `Platform not found: ${ids[0]}` },
      { status: 404 }
    );
  }

  if (!platformB) {
    return NextResponse.json(
      { error: `Platform not found: ${ids[1]}` },
      { status: 404 }
    );
  }

  try {
    const categories = await getCategories();
    const result = comparePlatforms(platformA, platformB, categories);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Compare failed:", error);
    return NextResponse.json(
      { error: "Failed to compare platforms" },
      { status: 500 }
    );
  }
}
