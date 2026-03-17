import { NextResponse } from "next/server";
import { getPlatforms } from "@/lib/platforms";

export async function GET() {
  try {
    const platforms = await getPlatforms();
    return NextResponse.json(platforms);
  } catch (error) {
    console.error("Failed to load platforms:", error);
    return NextResponse.json(
      { error: "Failed to load platforms" },
      { status: 500 }
    );
  }
}
