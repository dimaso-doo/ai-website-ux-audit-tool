import type { BrowserCheckResult } from "./types";

const CTA_SELECTOR =
  "a, button, input[type='submit'], input[type='button'], [role='button']";
const CTA_TEXT_PATTERN = /contact|book|call|demo|get|start|buy|quote|estimate|schedule|consult|submit|send|sign up|pricing/i;

export async function runBrowserChecks(url: string): Promise<BrowserCheckResult> {
  let browser;
  const viewport = { width: 390, height: 844 };

  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const page = await browser.newPage({ viewport });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);

    const title = await page.title();
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    const forms = await page.$$eval("form", (elements) =>
      elements.slice(0, 10).map((form) => ({
        action: form.getAttribute("action") || "",
        method: form.getAttribute("method") || "get",
        fieldCount: form.querySelectorAll("input, textarea, select").length,
        requiredCount: form.querySelectorAll("[required], [aria-required='true']").length,
        emailFields: form.querySelectorAll("input[type='email']").length,
        telFields: form.querySelectorAll("input[type='tel']").length,
        hasSubmit: Boolean(form.querySelector("button[type='submit'], input[type='submit'], button:not([type])")),
      })),
    );

    const focusableCount = await page.$$eval(
      "a[href], button, input, textarea, select, [tabindex]:not([tabindex='-1'])",
      (elements) => elements.length,
    );
    await page.keyboard.press("Tab");
    const focusedElementAfterTab = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element) return "";
      const label = element.getAttribute("aria-label") || element.textContent || element.getAttribute("name") || element.tagName;
      return label.replace(/\s+/g, " ").trim().slice(0, 120);
    });

    const ctas = await page.$$eval(CTA_SELECTOR, (elements, patternSource) => {
      const pattern = new RegExp(patternSource, "i");
      return elements
        .map((element, index) => ({
          index,
          text: (element.textContent || element.getAttribute("value") || element.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim(),
          href: element instanceof HTMLAnchorElement ? element.href : undefined,
        }))
        .filter((item) => pattern.test(item.text) || (item.href ? pattern.test(item.href) : false))
        .slice(0, 3);
    }, CTA_TEXT_PATTERN.source);

    const ctaClickResults: NonNullable<BrowserCheckResult["ctaClickResults"]> = [];
    for (const cta of ctas) {
      if (cta.href?.startsWith("mailto:") || cta.href?.startsWith("tel:")) {
        ctaClickResults.push({ text: cta.text, href: cta.href, result: "mailto_or_tel" as const });
        continue;
      }

      try {
        const beforeUrl = page.url();
        const beforeBodyLength = await page.locator("body").evaluate((body) => body.innerHTML.length);
        const locator = page.locator(CTA_SELECTOR).nth(cta.index);
        await locator.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        const afterUrl = page.url();
        const afterBodyLength = await page.locator("body").evaluate((body) => body.innerHTML.length);
        const result: NonNullable<BrowserCheckResult["ctaClickResults"]>[number]["result"] =
          afterUrl !== beforeUrl
            ? "navigates"
            : Math.abs(afterBodyLength - beforeBodyLength) > 100
              ? "opens_modal_or_changes_dom"
              : "no_obvious_change";
        ctaClickResults.push({ text: cta.text, href: cta.href, result });
        if (afterUrl !== beforeUrl) {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 12000 }).catch(() => undefined);
        }
      } catch {
        ctaClickResults.push({ text: cta.text, href: cta.href, result: "error" as const });
      }
    }

    return {
      status: "ok",
      viewport,
      pageLoaded: true,
      finalUrl: page.url(),
      title,
      horizontalOverflow,
      clickableCtaCount: ctas.length,
      ctaClickResults,
      forms,
      focusableCount,
      focusedElementAfterTab,
    };
  } catch (error) {
    return {
      status: "error",
      viewport,
      notes: error instanceof Error ? error.message : "Browser checks could not run.",
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
