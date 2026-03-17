import { NextRequest, NextResponse } from "next/server";
import { getPlatforms } from "@/lib/platforms";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const platforms = await getPlatforms();
    const platform = platforms.find((p) => p.id === id);
    if (!platform) {
      return NextResponse.json(
        { error: "Platform not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(platform);
  } catch (error) {
    console.error("Failed to load platform:", error);
    return NextResponse.json(
      { error: "Failed to load platform" },
      { status: 500 }
    );
  }
}
