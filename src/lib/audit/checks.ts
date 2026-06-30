import { summarizeDuplicateChecks } from "./extractor";
import type { ExtractedPage } from "./types";

export function applyCrossPageChecks(pages: ExtractedPage[]) {
  const duplicates = summarizeDuplicateChecks(pages);
  return pages.map((page) => ({
    ...page,
    checks: [...page.checks, ...(duplicates[page.url] || [])],
  }));
}
