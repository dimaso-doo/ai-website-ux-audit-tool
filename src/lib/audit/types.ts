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
