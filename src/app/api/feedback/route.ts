import { NextResponse } from "next/server";
import { saveAuditFeedback } from "@/lib/storage/feedback";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    saveAuditFeedback({
      websiteUrl: String(body.websiteUrl || ""),
      selectedPages: Array.isArray(body.selectedPages) ? body.selectedPages : [],
      report: String(body.report || ""),
      scanData: body.scanData,
      rating: body.rating ? Number(body.rating) : null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      comments: String(body.comments || ""),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save feedback." },
      { status: 500 },
    );
  }
}
