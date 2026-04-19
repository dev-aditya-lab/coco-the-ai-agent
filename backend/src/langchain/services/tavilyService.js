/**
 * Tavily Service
 * Handles web research/search requests for the agent.
 */

import { tavily } from "@tavily/core";
import { env } from "../../config/env.js";

let tavilyClient = null;
const ALLOWED_TOPICS = new Set(["general", "news", "finance"]);
const ALLOWED_SEARCH_DEPTHS = new Set(["basic", "advanced"]);

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeTopic(value) {
  const topic = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ALLOWED_TOPICS.has(topic) ? topic : "general";
}

function normalizeSearchDepth(value) {
  const depth = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ALLOWED_SEARCH_DEPTHS.has(depth) ? depth : "basic";
}

export function getTavilyClient() {
  if (!tavilyClient) {
    if (!env.tavilyApiKey) {
      throw new Error("TAVILY_API_KEY is not set in environment variables");
    }

    tavilyClient = tavily({ apiKey: env.tavilyApiKey });
  }

  return tavilyClient;
}

export async function searchWeb(query, options = {}) {
  const client = getTavilyClient();
  const searchDepth = normalizeSearchDepth(options.searchDepth);
  const maxResults = Number.isFinite(Number(options.maxResults)) ? Number(options.maxResults) : 5;

  const response = await client.search(query, {
    searchDepth,
    maxResults: Math.min(Math.max(maxResults, 1), 10),
    topic: normalizeTopic(options.topic),
    includeAnswer: options.includeAnswer ?? true,
    includeRawContent: options.includeRawContent ?? false,
    includeFavicon: options.includeFavicon ?? true,
    includeDomains: normalizeList(options.includeDomains),
    excludeDomains: normalizeList(options.excludeDomains),
    exactMatch: options.exactMatch ?? false,
    autoParameters: options.autoParameters ?? true,
    country: options.country,
    timeRange: options.timeRange,
    startDate: options.startDate,
    endDate: options.endDate,
    days: options.days,
    includeImages: options.includeImages ?? false,
    includeImageDescriptions: options.includeImageDescriptions ?? false,
  });

  return response;
}

export function summarizeResearchResults(searchResponse, options = {}) {
  const query = searchResponse?.query || options.query || "";
  const answer = typeof searchResponse?.answer === "string" ? searchResponse.answer.trim() : "";
  const results = Array.isArray(searchResponse?.results) ? searchResponse.results : [];
  const topResults = results.slice(0, options.maxResults || 5);
  const style = options.style === "bilingual" ? "bilingual" : "english";

  const heading = style === "bilingual"
    ? "Yeh raha latest web research:"
    : "Here is the latest web research:";

  const answerHeading = style === "bilingual" ? "Short answer" : "Short answer";
  const sourcesHeading = style === "bilingual" ? "Sources" : "Sources";
  const noSourcesText = style === "bilingual" ? "Koi sources nahi mile." : "No sources found.";

  const lines = [heading];

  if (query) {
    lines.push(style === "bilingual" ? `Query: ${query}` : `Query: ${query}`);
  }

  if (answer) {
    lines.push(`${answerHeading}: ${answer}`);
  }

  if (topResults.length > 0) {
    lines.push(`${sourcesHeading}:`);

    topResults.forEach((result, index) => {
      const title = result?.title || `Source ${index + 1}`;
      const url = result?.url || "";
      const snippet = typeof result?.content === "string" ? result.content.trim() : "";
      const formattedSnippet = snippet ? ` - ${snippet.slice(0, 220)}` : "";
      lines.push(`${index + 1}. ${title}${url ? ` (${url})` : ""}${formattedSnippet}`);
    });
  } else {
    lines.push(noSourcesText);
  }

  if (searchResponse?.responseTime) {
    lines.push(`Response time: ${searchResponse.responseTime}s`);
  }

  return lines.join("\n");
}
