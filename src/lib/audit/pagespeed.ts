import type { PageSpeedResult } from "./types";

const API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export async function getPageSpeedResult(url: string, strategy: "mobile" | "desktop" = "mobile"): Promise<PageSpeedResult> {
  const apiKey = process.env.PAGESPEED_API_KEY || process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey) {
    return {
      status: "skipped",
      strategy,
      notes: "PAGESPEED_API_KEY is not set, so Google PageSpeed Insights was not run.",
    };
  }

  try {
    const requestUrl = new URL(API_URL);
    requestUrl.searchParams.set("url", url);
    requestUrl.searchParams.set("strategy", strategy);
    requestUrl.searchParams.set("key", apiKey);
    for (const category of ["performance", "accessibility", "best-practices", "seo"]) {
      requestUrl.searchParams.append("category", category);
    }

    const response = await fetch(requestUrl, { signal: AbortSignal.timeout(45000) });
    const data = await response.json();
    if (!response.ok) {
      return {
        status: "error",
        strategy,
        notes: data?.error?.message || "Google PageSpeed Insights request failed.",
      };
    }

    const categories = data?.lighthouseResult?.categories || {};
    const audits = data?.lighthouseResult?.audits || {};

    return {
      status: "ok",
      strategy,
      performanceScore: score(categories.performance?.score),
      accessibilityScore: score(categories.accessibility?.score),
      seoScore: score(categories.seo?.score),
      bestPracticesScore: score(categories["best-practices"]?.score),
      firstContentfulPaint: audits["first-contentful-paint"]?.displayValue,
      largestContentfulPaint: audits["largest-contentful-paint"]?.displayValue,
      totalBlockingTime: audits["total-blocking-time"]?.displayValue,
      cumulativeLayoutShift: audits["cumulative-layout-shift"]?.displayValue,
      speedIndex: audits["speed-index"]?.displayValue,
    };
  } catch (error) {
    return {
      status: "error",
      strategy,
      notes: error instanceof Error ? error.message : "Google PageSpeed Insights request failed.",
    };
  }
}

function score(value: unknown) {
  return typeof value === "number" ? Math.round(value * 100) : undefined;
}
