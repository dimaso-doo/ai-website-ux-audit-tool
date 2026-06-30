import type { PageType } from "./types";

export function classifyPage(url: string, title = ""): PageType {
  const value = `${url} ${title}`.toLowerCase();
  const path = new URL(url).pathname.toLowerCase();

  if (path === "/" || path === "") return "Homepage";
  if (/\b(pricing|plans|packages)\b/.test(value)) return "Pricing";
  if (/\b(contact|book|demo|consultation|get-in-touch)\b/.test(value)) return "Contact";
  if (/\b(about|company|team|studio)\b/.test(value)) return "About";
  if (/\b(case-stud|success-stor|results)\b/.test(value)) return "Case Study";
  if (/\b(portfolio|work|projects)\b/.test(value)) return "Portfolio";
  if (/\b(blog|insights|articles|news)\b/.test(value)) return "Blog";
  if (/\b(product|products|platform|solution)\b/.test(value)) return "Product";
  if (/\b(service|services|what-we-do|capabilities)\b/.test(value)) return "Service";
  return "Other";
}

export function isRecommendedPage(type: PageType, url: string, title = "") {
  if (type !== "Blog" && type !== "Other") return true;
  const value = `${url} ${title}`.toLowerCase();
  return /\b(testimonials|reviews|clients|landing|lp|demo|consultation)\b/.test(value);
}
