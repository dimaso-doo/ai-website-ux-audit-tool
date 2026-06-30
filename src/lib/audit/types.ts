export type PageType =
  | "Homepage"
  | "Service"
  | "About"
  | "Contact"
  | "Pricing"
  | "Case Study"
  | "Portfolio"
  | "Blog"
  | "Product"
  | "Other";

export type DiscoveredPage = {
  url: string;
  title: string;
  pageType: PageType;
  recommended: boolean;
  source: string;
};

export type ExtractedPage = {
  url: string;
  statusCode: number;
  canonicalUrl: string | null;
  title: string;
  metaDescription: string;
  h1: string[];
  h2h3: string[];
  bodyText: string;
  navigationLinks: string[];
  footerLinks: string[];
  ctaTexts: string[];
  formFields: string[];
  internalLinks: string[];
  externalLinks: string[];
  wordCount: number;
  signals: {
    hasTestimonials: boolean;
    hasCaseStudies: boolean;
    hasClientLogosOrNames: boolean;
    contactOptions: string[];
    socialLinks: string[];
    hasPricingMentions: boolean;
    hasServiceOrProductMentions: boolean;
  };
  checks: PageCheck[];
  performance?: PageSpeedResult;
  browserChecks?: BrowserCheckResult;
};

export type PageCheck = {
  type: "seo" | "accessibility" | "content" | "conversion";
  severity: "high" | "medium" | "low";
  message: string;
  evidence?: string;
};

export type FeedbackInput = {
  websiteUrl: string;
  selectedPages: string[];
  report: string;
  scanData?: unknown;
  rating?: number | null;
  tags: string[];
  comments: string;
};

export type PageSpeedResult = {
  status: "ok" | "skipped" | "error";
  strategy: "mobile" | "desktop";
  performanceScore?: number;
  accessibilityScore?: number;
  seoScore?: number;
  bestPracticesScore?: number;
  firstContentfulPaint?: string;
  largestContentfulPaint?: string;
  totalBlockingTime?: string;
  cumulativeLayoutShift?: string;
  speedIndex?: string;
  notes?: string;
};

export type BrowserCheckResult = {
  status: "ok" | "skipped" | "error";
  viewport: {
    width: number;
    height: number;
  };
  pageLoaded?: boolean;
  finalUrl?: string;
  title?: string;
  horizontalOverflow?: boolean;
  clickableCtaCount?: number;
  ctaClickResults?: Array<{
    text: string;
    href?: string;
    result: "navigates" | "opens_modal_or_changes_dom" | "no_obvious_change" | "mailto_or_tel" | "error";
  }>;
  forms?: Array<{
    action: string;
    method: string;
    fieldCount: number;
    requiredCount: number;
    emailFields: number;
    telFields: number;
    hasSubmit: boolean;
  }>;
  focusableCount?: number;
  focusedElementAfterTab?: string;
  notes?: string;
};
