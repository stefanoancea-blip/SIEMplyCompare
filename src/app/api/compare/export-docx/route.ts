import { NextRequest, NextResponse } from "next/server";
import { Document, Paragraph, Packer, HeadingLevel } from "docx";

function sectionToParagraphs(text: string): Paragraph[] {
  return text
    .split("\n\n")
    .map((block) => block.trim())
    .filter(Boolean)
    .map((p) => new Paragraph({ text: p }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const overview = typeof body.overview === "string" ? body.overview : "";
    const technical = typeof body.technical === "string" ? body.technical : "";
    const commercial = typeof body.commercial === "string" ? body.commercial : "";
    const platformAName = typeof body.platformAName === "string" ? body.platformAName.trim() : "";
    const platformBName = typeof body.platformBName === "string" ? body.platformBName.trim() : "";

    const children: Paragraph[] = [];

    if (platformAName && platformBName) {
      children.push(
        new Paragraph({
          text: `Comparison: ${platformAName} vs ${platformBName}`,
          heading: HeadingLevel.TITLE,
        })
      );
      children.push(new Paragraph({ text: "" }));
    }

    children.push(
      new Paragraph({
        text: "1. High-Level Overview",
        heading: HeadingLevel.HEADING_2,
      })
    );
    children.push(...sectionToParagraphs(overview));
    children.push(new Paragraph({ text: "" }));

    children.push(
      new Paragraph({
        text: "2. Technical Comparison",
        heading: HeadingLevel.HEADING_2,
      })
    );
    children.push(...sectionToParagraphs(technical));
    children.push(new Paragraph({ text: "" }));

    children.push(
      new Paragraph({
        text: "3. Commercial Comparison",
        heading: HeadingLevel.HEADING_2,
      })
    );
    children.push(...sectionToParagraphs(commercial));

    const doc = new Document({
      sections: [
        {
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="comparison.docx"',
      },
    });
  } catch (error) {
    console.error("POST /api/compare/export-docx failed:", error);
    return NextResponse.json(
      { error: "Failed to export document" },
      { status: 500 }
    );
  }
}
