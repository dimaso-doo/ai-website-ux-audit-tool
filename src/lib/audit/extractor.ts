import * as cheerio from "cheerio";
import { classifyPage } from "./classifier";
import { fetchWithTimeout } from "./fetch";
import type { ExtractedPage, PageCheck } from "./types";
import { canonicalUrlKey, isSameDomain, normalizeCandidateUrl } from "./url";

const VAGUE_LINK_TEXT = new Set(["click here", "learn more", "read more", "more"]);

export async function extractPage(url: string, root: URL): Promise<ExtractedPage | null> {
  const response = await fetchWithTimeout(url, 12000);
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("text/html")) {
    return null;
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();

  const canonicalHref = $("link[rel='canonical']").attr("href") || null;
  const canonical = canonicalHref ? normalizeCandidateUrl(canonicalHref, new URL(url))?.toString() || null : null;
  const title = cleanText($("title").first().text());
  const metaDescription = cleanText($("meta[name='description']").attr("content") || "");
  const h1 = $("h1").map((_, el) => cleanText($(el).text())).get().filter(Boolean);
  const h2h3 = $("h2, h3").map((_, el) => cleanText($(el).text())).get().filter(Boolean).slice(0, 40);
  const bodyText = cleanText($("body").text()).slice(0, 16000);
  const navLinks = collectAreaLinks($, "nav a, header a");
  const footerLinks = collectAreaLinks($, "footer a");
  const ctaTexts = $("button, input[type='submit'], a")
    .map((_, el) => cleanText($(el).text() || $(el).attr("value") || $(el).attr("aria-label") || ""))
    .get()
    .filter((text) => /contact|book|call|demo|get|start|buy|quote|estimate|schedule|consult|submit|send|sign up/i.test(text))
    .slice(0, 50);
  const formFields = $("input, textarea, select")
    .map((_, el) => cleanText($(el).attr("name") || $(el).attr("placeholder") || $(el).attr("aria-label") || $(el).attr("type") || ""))
    .get()
    .filter(Boolean)
    .slice(0, 80);

  const internalLinks = new Set<string>();
  const externalLinks = new Set<string>();
  const emptyLinks: string[] = [];
  const vagueLinks: string[] = [];
  const missingAlt = $("img").filter((_, el) => !($(el).attr("alt") || "").trim()).length;

  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = cleanText($(el).text());
    if (!text && !$(el).attr("aria-label")) emptyLinks.push(href || "(missing href)");
    if (VAGUE_LINK_TEXT.has(text.toLowerCase())) vagueLinks.push(text);

    const normalized = normalizeCandidateUrl(href, new URL(url));
    if (!normalized) return;
    if (isSameDomain(normalized, root)) internalLinks.add(normalized.toString());
    else externalLinks.add(normalized.toString());
  });

  const checks = buildChecks({
    url,
    title,
    metaDescription,
    h1,
    h2h3,
    wordCount: countWords(bodyText),
    ctaTexts,
    formFields,
    canonical,
    emptyLinks,
    vagueLinks,
    missingAlt,
  });

  return {
    url,
    statusCode: response.status,
    canonicalUrl: canonical,
    title,
    metaDescription,
    h1,
    h2h3,
    bodyText,
    navigationLinks: navLinks,
    footerLinks,
    ctaTexts,
    formFields,
    internalLinks: [...internalLinks].slice(0, 120),
    externalLinks: [...externalLinks].slice(0, 120),
    wordCount: countWords(bodyText),
    signals: detectSignals(bodyText, externalLinks),
    checks,
  };
}

export function summarizeDuplicateChecks(pages: ExtractedPage[]) {
  const checks: Record<string, PageCheck[]> = {};
  addDuplicateCheck(pages, "title", (page) => page.title, checks);
  addDuplicateCheck(pages, "H1", (page) => page.h1[0] || "", checks);
  return checks;
}

function collectAreaLinks($: cheerio.CheerioAPI, selector: string) {
  return $(selector)
    .map((_, el) => cleanText($(el).text() || $(el).attr("aria-label") || ""))
    .get()
    .filter(Boolean)
    .slice(0, 80);
}

function buildChecks(input: {
  url: string;
  title: string;
  metaDescription: string;
  h1: string[];
  h2h3: string[];
  wordCount: number;
  ctaTexts: string[];
  formFields: string[];
  canonical: string | null;
  emptyLinks: string[];
  vagueLinks: string[];
  missingAlt: number;
}) {
  const checks: PageCheck[] = [];
  if (!input.title) checks.push({ type: "seo", severity: "high", message: "Missing page title" });
  if (!input.metaDescription) checks.push({ type: "seo", severity: "medium", message: "Missing meta description" });
  if (!input.h1.length) checks.push({ type: "seo", severity: "high", message: "Missing H1" });
  if (input.h1.length > 1) checks.push({ type: "seo", severity: "medium", message: "Multiple H1s", evidence: input.h1.join(" | ") });
  if (input.wordCount < 250) checks.push({ type: "content", severity: "medium", message: "Thin visible text content", evidence: `${input.wordCount} words` });
  if (!input.ctaTexts.length && classifyPage(input.url) !== "Blog") checks.push({ type: "conversion", severity: "high", message: "No clear CTA text detected" });
  if (input.formFields.length > 8) checks.push({ type: "conversion", severity: "medium", message: "Long form detected", evidence: `${input.formFields.length} fields` });
  if (input.canonical && canonicalUrlKey(new URL(input.canonical)) !== canonicalUrlKey(new URL(input.url))) {
    checks.push({ type: "seo", severity: "low", message: "Canonical points to a different URL", evidence: input.canonical });
  }
  if (input.emptyLinks.length) checks.push({ type: "accessibility", severity: "medium", message: "Empty links detected", evidence: input.emptyLinks.slice(0, 5).join(", ") });
  if (input.vagueLinks.length) checks.push({ type: "accessibility", severity: "low", message: "Vague link text detected", evidence: [...new Set(input.vagueLinks)].join(", ") });
  if (input.missingAlt) checks.push({ type: "accessibility", severity: "low", message: "Images missing alt attributes", evidence: `${input.missingAlt} images` });
  return checks;
}

function detectSignals(bodyText: string, externalLinks: Set<string>) {
  const lower = bodyText.toLowerCase();
  const socialLinks = [...externalLinks].filter((link) => /linkedin|facebook|instagram|x\.com|twitter|youtube|tiktok/.test(link));
  const contactOptions = [
    /[\w.-]+@[\w.-]+\.\w+/.test(bodyText) ? "email" : "",
    /\+?\d[\d\s().-]{7,}\d/.test(bodyText) ? "phone" : "",
    /\b(contact form|send message|submit|form)\b/i.test(bodyText) ? "form" : "",
    /\b(calendly|calendar|schedule a call|book a call)\b/i.test(bodyText) ? "calendar" : "",
  ].filter(Boolean);

  return {
    hasTestimonials: /\b(testimonial|review|rated|stars|what clients say)\b/.test(lower),
    hasCaseStudies: /\b(case stud|portfolio|our work|results|before and after)\b/.test(lower),
    hasClientLogosOrNames: /\b(clients|trusted by|brands|partners|logos)\b/.test(lower),
    contactOptions,
    socialLinks,
    hasPricingMentions: /\b(pricing|price|plans|packages|from \$|per month|monthly)\b/.test(lower),
    hasServiceOrProductMentions: /\b(service|services|product|products|solution|solutions)\b/.test(lower),
  };
}

function addDuplicateCheck(
  pages: ExtractedPage[],
  label: string,
  getter: (page: ExtractedPage) => string,
  checks: Record<string, PageCheck[]>,
) {
  const buckets = new Map<string, ExtractedPage[]>();
  for (const page of pages) {
    const value = getter(page).trim().toLowerCase();
    if (!value) continue;
    buckets.set(value, [...(buckets.get(value) || []), page]);
  }

  for (const group of buckets.values()) {
    if (group.length < 2) continue;
    for (const page of group) {
      checks[page.url] = checks[page.url] || [];
      checks[page.url].push({
        type: "seo",
        severity: "medium",
        message: `Duplicate ${label}`,
        evidence: group.map((item) => item.url).join(", "),
      });
    }
  }
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function countWords(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}
