import type { ExtractedPage } from "./types";

export function buildAuditPrompt(params: {
  websiteUrl: string;
  pages: ExtractedPage[];
  styleMemory: string;
}) {
  const pageData = params.pages.map((page) => ({
    url: page.url,
    statusCode: page.statusCode,
    canonicalUrl: page.canonicalUrl,
    title: page.title,
    metaDescription: page.metaDescription,
    h1: page.h1,
    h2h3: page.h2h3,
    navigationLinks: page.navigationLinks,
    footerLinks: page.footerLinks,
    ctaTexts: page.ctaTexts,
    formFields: page.formFields,
    wordCount: page.wordCount,
    signals: page.signals,
    checks: page.checks,
    performance: page.performance,
    browserChecks: page.browserChecks,
    bodyTextSample: page.bodyText.slice(0, 6000),
  }));

  return `You are creating an internal Dimaso AI Website UX Audit report.

Website: ${params.websiteUrl}

Dimaso audit style memory from previous feedback:
${params.styleMemory || "No saved feedback yet. Use the default Dimaso audit style."}

Default Dimaso audit style rules:
- Be practical, not theoretical.
- Focus on lead generation and conversion.
- Always suggest what to fix first.
- Avoid vague UX language.
- Prefer concrete implementation suggestions.
- Write as an expert web agency.
- Mention confidence level.
- Mention when visual review needs screenshots or human review.

Important limitations:
- This MVP uses HTML text and structure, Google PageSpeed Insights when configured, and browser-based DOM/interaction checks when available.
- Do not judge visual design, spacing, colors, layout quality, or visual hierarchy.
- If a visual claim would require screenshots or human review, say so.
- Clearly label whether a finding is verified from HTML, PageSpeed data, browser test data, or an assumption.
- If PageSpeed or browser checks are skipped/error for a page, say that specific layer was not verified for that page.

Report format:
1. Overall UX / conversion score
2. Executive summary
3. Pages analyzed
4. Top 10 issues
5. What to fix first
6. Page-by-page observations
7. Navigation analysis
8. CTA analysis
9. Copy clarity analysis
10. Trust signal analysis
11. Contact / lead-generation analysis
12. SEO and content structure concerns
13. Accessibility concerns
14. Conversion blockers
15. Recommended fixes
16. Questions for human review
17. Limitations of this audit

Every issue must include:
- Problem
- Evidence from scanned content
- Why it matters
- Suggested fix
- Priority: High / Medium / Low
- Effort: Low / Medium / High
- Confidence: High / Medium / Low

Rules:
- Avoid generic advice.
- Base every claim on extracted page data.
- Clearly separate verified findings from assumptions.
- Be practical, direct, and agency-quality.
- Focus on lead generation and conversion.
- Suggest concrete implementation tasks.
- Write in English by default.
- Do not end with upsell-style offers such as "If you want, I can...".
- End with the limitations section only.

Extracted scan data:
${JSON.stringify(pageData, null, 2)}`;
}
