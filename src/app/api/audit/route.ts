import { NextResponse } from "next/server";
import { applyCrossPageChecks } from "@/lib/audit/checks";
import { extractPage } from "@/lib/audit/extractor";
import { generateAuditReport } from "@/lib/audit/openai";
import { buildAuditPrompt } from "@/lib/audit/prompt";
import { normalizeInputUrl } from "@/lib/audit/url";
import { getDimasoStyleMemory, saveAuditFeedback } from "@/lib/storage/feedback";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { websiteUrl, pages } = await request.json();
    const selectedPages = Array.isArray(pages) ? pages.slice(0, 25) : [];
    if (!selectedPages.length) {
      return NextResponse.json({ error: "Select at least one page to analyze." }, { status: 400 });
    }

    const root = normalizeInputUrl(String(websiteUrl || selectedPages[0]));
    const extracted = [];

    for (const pageUrl of selectedPages) {
      try {
        const page = await extractPage(String(pageUrl), root);
        if (page) extracted.push(page);
      } catch {
        continue;
      }
    }

    if (!extracted.length) {
      return NextResponse.json({ error: "No selected pages could be extracted." }, { status: 400 });
    }

    const pagesWithChecks = applyCrossPageChecks(extracted);
    const styleMemory = getDimasoStyleMemory();
    const report = await generateAuditReport(
      buildAuditPrompt({
        websiteUrl: root.toString(),
        pages: pagesWithChecks,
        styleMemory,
      }),
    );

    saveAuditFeedback({
      websiteUrl: root.toString(),
      selectedPages,
      report,
      scanData: pagesWithChecks,
      tags: [],
      comments: "",
      rating: null,
    });

    return NextResponse.json({ report, scanData: pagesWithChecks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not run audit." },
      { status: 500 },
    );
  }
}
