const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
];

const SKIPPED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".pdf",
  ".zip",
  ".xml",
  ".json",
  ".rss",
  ".atom",
  ".mp4",
  ".mov",
  ".mp3",
  ".css",
  ".js",
];

export function normalizeInputUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter a website URL or domain.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  parsed.pathname = normalizePath(parsed.pathname);
  stripTrackingParams(parsed);
  return parsed;
}

export function normalizeCandidateUrl(href: string, base: URL): URL | null {
  try {
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      return null;
    }

    const url = new URL(href, base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = normalizePath(url.pathname);
    stripTrackingParams(url);
    return url;
  } catch {
    return null;
  }
}

export function isSameDomain(url: URL, root: URL) {
  return url.hostname === root.hostname;
}

export function shouldSkipUrl(url: URL) {
  const path = url.pathname.toLowerCase();
  const full = `${path}?${url.searchParams.toString()}`.toLowerCase();

  if (SKIPPED_EXTENSIONS.some((ext) => path.endsWith(ext))) return true;
  if (/[?&](s|q|search)=/.test(full)) return true;
  if (/\/(tag|tags|category|author|feed|login|register|cart|checkout|account)\b/.test(path)) return true;
  if (/\/(privacy|terms|cookie|cookies|legal|wp-json)\b/.test(path)) return true;
  if (/\/page\/\d+\/?$/.test(path) || /[?&](page|paged)=\d+/.test(full)) return true;
  return false;
}

export function canonicalUrlKey(url: URL) {
  const clone = new URL(url.toString());
  if (clone.pathname !== "/" && clone.pathname.endsWith("/")) {
    clone.pathname = clone.pathname.slice(0, -1);
  }
  return clone.toString();
}

function normalizePath(pathname: string) {
  const decoded = pathname || "/";
  return decoded.replace(/\/{2,}/g, "/");
}

function stripTrackingParams(url: URL) {
  for (const param of TRACKING_PARAMS) {
    url.searchParams.delete(param);
  }
}
