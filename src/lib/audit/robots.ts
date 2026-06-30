import { fetchWithTimeout } from "./fetch";

export async function discoverRobotSitemaps(root: URL) {
  const robotsUrl = new URL("/robots.txt", root).toString();

  try {
    const response = await fetchWithTimeout(robotsUrl, 6000);
    if (!response.ok) return [];
    const text = await response.text();
    return text
      .split(/\r?\n/)
      .map((line) => line.match(/^sitemap:\s*(.+)$/i)?.[1]?.trim())
      .filter((value): value is string => Boolean(value));
  } catch {
    return [];
  }
}
