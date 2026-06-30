import * as cheerio from "cheerio";
import { classifyPage, isRecommendedPage } from "./classifier";
import { extractPage } from "./extractor";
import { fetchWithTimeout } from "./fetch";
import { discoverRobotSitemaps } from "./robots";
import { discoverSitemapUrls } from "./sitemap";
import type { DiscoveredPage } from "./types";
import { canonicalUrlKey, isSameDomain, normalizeCandidateUrl, normalizeInputUrl, shouldSkipUrl } from "./url";

const MAX_DISCOVERED = 200;
const MAX_DEPTH = 2;

export async function discoverPages(input: string) {
  const root = normalizeInputUrl(input);
  const homepage = new URL("/", root);
  const robotSitemaps = await discoverRobotSitemaps(root);
  const sitemapUrls = await discoverSitemapUrls(root, robotSitemaps, MAX_DISCOVERED);
  const crawledUrls = await crawlInternalLinks(homepage, root, MAX_DISCOVERED);
  const urlMap = new Map<string, string>();

  for (const url of [homepage.toString(), ...sitemapUrls, ...crawledUrls]) {
    const parsed = normalizeCandidateUrl(url, root);
    if (!parsed || !isSameDomain(parsed, root) || shouldSkipUrl(parsed)) continue;
    urlMap.set(canonicalUrlKey(parsed), parsed.toString());
  }

  const pages = await enrichPages([...urlMap.values()].slice(0, MAX_DISCOVERED), root);
  const sorted = sortPages(pages);
  const preselected = buildInitialSelection(sorted);

  return {
    normalizedUrl: root.toString(),
    count: sorted.length,
    limit: MAX_DISCOVERED,
    maxAnalyzePages: 25,
    pages: sorted,
    preselected,
  };
}

async function crawlInternalLinks(start: URL, root: URL, maxUrls: number) {
  const found = new Map<string, string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: start.toString(), depth: 0 }];
  const visited = new Set<string>();

  while (queue.length && found.size < maxUrls) {
    const current = queue.shift();
    if (!current || visited.has(current.url) || current.depth > MAX_DEPTH) continue;
    visited.add(current.url);

    try {
      const response = await fetchWithTimeout(current.url, 9000);
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("text/html")) continue;
      const html = await response.text();
      const $ = cheerio.load(html);

      $("a[href]").each((_, element) => {
        const href = $(element).attr("href") || "";
        const normalized = normalizeCandidateUrl(href, new URL(current.url));
        if (!normalized || !isSameDomain(normalized, root) || shouldSkipUrl(normalized)) return;
        const key = canonicalUrlKey(normalized);
        if (!found.has(key)) found.set(key, normalized.toString());
        if (!visited.has(normalized.toString()) && current.depth + 1 <= MAX_DEPTH && queue.length < maxUrls) {
          queue.push({ url: normalized.toString(), depth: current.depth + 1 });
        }
      });
    } catch {
      continue;
    }
  }

  return [...found.values()];
}

async function enrichPages(urls: string[], root: URL): Promise<DiscoveredPage[]> {
  const pages: DiscoveredPage[] = [];

  for (const url of urls) {
    if (pages.length >= MAX_DISCOVERED) break;
    let title = "";
    try {
      const page = await extractPage(url, root);
      title = page?.title || "";
    } catch {
      title = "";
    }

    const pageType = classifyPage(url, title);
    pages.push({
      url,
      title,
      pageType,
      recommended: isRecommendedPage(pageType, url, title),
      source: "sitemap/internal crawl",
    });
  }

  return pages;
}

function sortPages(pages: DiscoveredPage[]) {
  const order = ["Homepage", "Service", "Product", "Pricing", "Case Study", "Portfolio", "About", "Contact", "Other", "Blog"];
  return [...pages].sort((a, b) => {
    const typeDiff = order.indexOf(a.pageType) - order.indexOf(b.pageType);
    if (typeDiff !== 0) return typeDiff;
    return a.url.length - b.url.length;
  });
}

function buildInitialSelection(pages: DiscoveredPage[]) {
  if (pages.length <= 10) return pages.map((page) => page.url);
  return pages.filter((page) => page.recommended).slice(0, 25).map((page) => page.url);
}
