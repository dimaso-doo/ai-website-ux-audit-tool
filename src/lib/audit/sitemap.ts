import * as cheerio from "cheerio";
import { fetchWithTimeout } from "./fetch";
import { canonicalUrlKey, isSameDomain, normalizeCandidateUrl, shouldSkipUrl } from "./url";

export async function discoverSitemapUrls(root: URL, explicitSitemaps: string[], maxUrls = 200) {
  const sitemapUrls = Array.from(new Set([new URL("/sitemap.xml", root).toString(), ...explicitSitemaps]));
  const found = new Map<string, string>();
  const queue = [...sitemapUrls];
  const visited = new Set<string>();

  while (queue.length && found.size < maxUrls) {
    const sitemapUrl = queue.shift();
    if (!sitemapUrl || visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);

    try {
      const response = await fetchWithTimeout(sitemapUrl, 8000);
      if (!response.ok) continue;
      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });

      $("sitemap > loc").each((_, element) => {
        const loc = $(element).text().trim();
        if (loc && queue.length < 40) queue.push(loc);
      });

      $("url > loc").each((_, element) => {
        const normalized = normalizeCandidateUrl($(element).text().trim(), root);
        if (!normalized || !isSameDomain(normalized, root) || shouldSkipUrl(normalized)) return;
        found.set(canonicalUrlKey(normalized), normalized.toString());
      });
    } catch {
      continue;
    }
  }

  return [...found.values()].slice(0, maxUrls);
}
