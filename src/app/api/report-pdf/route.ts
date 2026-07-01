import { NextResponse } from "next/server";
import { createReportPdf } from "@/lib/report/pdf";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { websiteUrl, report, title, footerLabel } = await request.json();
    if (!report || typeof report !== "string") {
      return NextResponse.json({ error: "Report text is required." }, { status: 400 });
    }

    const pdf = await createReportPdf({
      websiteUrl: String(websiteUrl || ""),
      report,
      title: typeof title === "string" && title.trim() ? title.trim() : undefined,
      footerLabel: typeof footerLabel === "string" && footerLabel.trim() ? footerLabel.trim() : undefined,
    });

    const body = new Uint8Array(pdf);

    return new NextResponse(body, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="dimaso-ai-ux-audit.pdf"`,
        "content-length": String(pdf.length),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate PDF." },
      { status: 500 },
    );
  }
}
