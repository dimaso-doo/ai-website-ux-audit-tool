# AI Website UX Audit Tool

Internal Dimaso MVP for auditing websites from HTML text and structure. It discovers pages, lets the user select pages to scan, extracts content/SEO/conversion signals, sends structured scan data to OpenAI, displays a plain text report, and stores Dimaso feedback in SQLite so future reports can adapt.

This is not a public SaaS. There is no login, billing, dashboard, screenshots, PDF export, Chrome extension, or visual UI analysis.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Node.js API routes
- OpenAI Responses API
- Google PageSpeed Insights API, optional
- Playwright browser checks using local Chrome
- Small PDF report download
- SQLite via Node built-in `node:sqlite`

## Setup

```bash
pnpm install --ignore-scripts
cp .env.example .env.local
```

Set `OPENAI_API_KEY` in `.env.local`.

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

- `OPENAI_API_KEY`: required for generating audit reports.
- `OPENAI_MODEL`: optional. Defaults to `gpt-5.4-mini`.
- `PAGESPEED_API_KEY`: optional Google PageSpeed Insights API key.
- `DATABASE_URL`: optional local SQLite path. Defaults to `data/audit-feedback.sqlite`.

## Main Flow

1. Enter a domain or website URL.
2. Discover pages from `sitemap.xml`, sitemap references in `robots.txt`, homepage links, and internal links.
3. Select discovered pages to analyze.
4. Run the audit.
5. Review the plain text report.
6. Leave rating, tags, and feedback.

## Crawl Limits

- Max discovered pages: 200
- Max analyzed pages per audit: 25
- Max crawl depth: 2
- Timeout per page: 6-12 seconds depending on request type
- Same-domain crawling only

The crawler skips obvious non-page URLs, tracking parameters, feeds, PDFs, images, login/cart/account pages, privacy/terms/cookie pages, archives, search pages, and paginated URLs.

## Database

Schema lives in [schema.sql](./schema.sql). The app creates the table automatically when feedback is saved or style memory is read.

Local SQLite files are ignored by git.

## Limitations

This MVP analyzes HTML text and structure only. It does not use screenshots and must not claim to evaluate visual design, spacing, colors, layout quality, or visual hierarchy. Those require screenshot-based review or human review.

When configured, the audit also includes Google PageSpeed Insights lab data. Browser checks use Playwright and local Chrome to verify basic CTA behavior, mobile viewport overflow, form structure, and keyboard focus signals. These are still not screenshot-based visual design reviews.

## Scripts

```bash
pnpm lint
pnpm build
pnpm dev
```

## TODO

- Add screenshot-based visual UX review.
- Add PDF export.
- Add report sharing links.
- Add proposal generator.
- Add authentication.
- Add team accounts.
- Add billing.
- Add public landing page.
- Add client-facing branded reports.
