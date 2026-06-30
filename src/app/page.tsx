"use client";

import { useMemo, useState } from "react";
import type { DiscoveredPage, ExtractedPage } from "@/lib/audit/types";

const FEEDBACK_TAGS = [
  "useful",
  "too generic",
  "wrong",
  "needs more concrete fixes",
  "better tone needed",
  "focus more on conversion",
  "focus more on SEO",
  "good report style",
];

type DiscoveryResult = {
  normalizedUrl: string;
  count: number;
  limit: number;
  maxAnalyzePages: number;
  pages: DiscoveredPage[];
  preselected: string[];
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("Waiting for URL");
  const [error, setError] = useState("");
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [report, setReport] = useState("");
  const [scanData, setScanData] = useState<ExtractedPage[] | null>(null);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedPages), [selectedPages]);
  const recommendedPages = discovery?.pages.filter((page) => page.recommended).map((page) => page.url) || [];

  async function discover() {
    setBusy(true);
    setError("");
    setReport("");
    setScanData(null);
    setStatus("Validating URL");

    try {
      setStatus("Discovering sitemap");
      setStatus("Crawling internal links");
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Discovery failed.");
      setDiscovery(data);
      setSelectedPages(data.preselected);
      setStatus(`Counting pages: ${data.count} discovered. Waiting for page selection`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Discovery failed.");
      setStatus("Ready");
    } finally {
      setBusy(false);
    }
  }

  async function runAudit() {
    if (!discovery) return;
    setBusy(true);
    setError("");
    setReport("");
    setScanData(null);
    setStatus("Extracting selected pages");

    try {
      setStatus("Running AI analysis");
      setStatus("Generating report");
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          websiteUrl: discovery.normalizedUrl,
          pages: selectedPages.slice(0, discovery.maxAnalyzePages),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Audit failed.");
      setReport(data.report);
      setScanData(data.scanData);
      setStatus("Saving audit");
      setStatus("Ready for feedback");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Audit failed.");
      setStatus("Ready");
    } finally {
      setBusy(false);
    }
  }

  async function saveFeedback() {
    if (!discovery || !report) return;
    setBusy(true);
    setError("");
    setStatus("Saving audit feedback");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          websiteUrl: discovery.normalizedUrl,
          selectedPages,
          report,
          scanData,
          rating: rating ? Number(rating) : null,
          tags,
          comments: feedback,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save feedback.");
      setFeedback("");
      setRating("");
      setTags([]);
      setStatus("Ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save feedback.");
      setStatus("Ready for feedback");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (!discovery || !report) return;
    setBusy(true);
    setError("");
    setStatus("Generating PDF");

    try {
      const response = await fetch("/api/report-pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          websiteUrl: discovery.normalizedUrl,
          report,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Could not generate PDF.");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "dimaso-ai-ux-audit.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      setStatus("Ready for feedback");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate PDF.");
      setStatus("Ready for feedback");
    } finally {
      setBusy(false);
    }
  }

  function togglePage(pageUrl: string) {
    setSelectedPages((current) => {
      if (current.includes(pageUrl)) return current.filter((item) => item !== pageUrl);
      if (discovery && current.length >= discovery.maxAnalyzePages) return current;
      return [...current, pageUrl];
    });
  }

  function toggleTag(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="border-b border-slate-200 pb-4">
          <p className="text-sm font-medium text-slate-500">Dimaso internal tool</p>
          <h1 className="mt-1 text-3xl font-semibold">AI Website UX Audit Tool</h1>
        </header>

        <section className="grid gap-3 rounded border border-slate-200 bg-white p-4">
          <label className="text-sm font-medium" htmlFor="url">
            Website URL or domain
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="example.com"
              className="min-h-11 flex-1 rounded border border-slate-300 px-3 text-base outline-none focus:border-slate-900"
            />
            <button
              onClick={discover}
              disabled={busy}
              className="min-h-11 rounded bg-slate-950 px-4 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Discover pages
            </button>
          </div>
          <div className="text-sm text-slate-600">Status: {status}</div>
          {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
        </section>

        {discovery ? (
          <section className="grid gap-4 rounded border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Discovered pages</h2>
                <p className="text-sm text-slate-600">
                  {discovery.count} pages found. Analyze up to {discovery.maxAnalyzePages} pages in one audit.
                </p>
                {discovery.count >= 51 ? (
                  <p className="mt-1 text-sm text-amber-700">Large site detected. Recommended pages are preselected to reduce resource use.</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => setSelectedPages(recommendedPages.slice(0, discovery.maxAnalyzePages))}>
                  Select recommended pages
                </button>
                <button className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => setSelectedPages(discovery.pages.slice(0, discovery.maxAnalyzePages).map((page) => page.url))}>
                  Select all
                </button>
                <button className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => setSelectedPages([])}>
                  Clear selection
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="w-12 p-2">Use</th>
                    <th className="p-2">URL</th>
                    <th className="p-2">Title</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Recommended</th>
                  </tr>
                </thead>
                <tbody>
                  {discovery.pages.map((page) => (
                    <tr key={page.url} className="border-t border-slate-200">
                      <td className="p-2 align-top">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(page.url)}
                          onChange={() => togglePage(page.url)}
                          aria-label={`Select ${page.url}`}
                        />
                      </td>
                      <td className="max-w-[360px] break-words p-2 align-top font-mono text-xs">{page.url}</td>
                      <td className="p-2 align-top">{page.title || "No title found"}</td>
                      <td className="p-2 align-top">{page.pageType}</td>
                      <td className="p-2 align-top">{page.recommended ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">{selectedPages.length} selected</p>
              <button
                onClick={runAudit}
                disabled={busy || selectedPages.length === 0}
                className="min-h-11 rounded bg-slate-950 px-4 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Analyze selected pages
              </button>
            </div>
          </section>
        ) : null}

        {report ? (
          <section className="grid gap-4 rounded border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold">AI audit report</h2>
              <button
                onClick={downloadPdf}
                disabled={busy}
                className="min-h-10 rounded border border-slate-300 px-3 text-sm font-medium disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                Download PDF
              </button>
            </div>
            <pre className="max-h-[720px] overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6">
              {report}
            </pre>

            <div className="grid gap-3 border-t border-slate-200 pt-4">
              <label className="text-sm font-medium" htmlFor="feedback">
                Feedback
              </label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                rows={5}
                className="rounded border border-slate-300 p-3 outline-none focus:border-slate-900"
                placeholder="What should future reports do better?"
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="grid gap-1 text-sm">
                  Rating
                  <select value={rating} onChange={(event) => setRating(event.target.value)} className="min-h-10 rounded border border-slate-300 px-2">
                    <option value="">No rating</option>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-1 flex-wrap gap-2">
                  {FEEDBACK_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`rounded border px-3 py-2 text-sm ${
                        tags.includes(tag) ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={saveFeedback}
                disabled={busy}
                className="min-h-11 w-full rounded bg-slate-950 px-4 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-fit"
              >
                Save feedback
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
