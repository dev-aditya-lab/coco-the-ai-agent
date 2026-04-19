/**
 * Research Web Tool
 * Uses Tavily to fetch live internet research and then formats the result for COCO.
 */

import { BaseTool } from "./baseTool.js";
import { getOpenClawTextResponse } from "../services/openclawService.js";
import { searchWeb, summarizeResearchResults } from "../services/tavilyService.js";
import { retainMemory } from "../services/hindsightService.js";

const ALLOWED_TOPICS = new Set(["general", "news", "finance"]);
const ALLOWED_SEARCH_DEPTHS = new Set(["basic", "advanced"]);

function normalizeTopic(value) {
  const topic = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ALLOWED_TOPICS.has(topic) ? topic : "general";
}

function normalizeSearchDepth(value) {
  const depth = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ALLOWED_SEARCH_DEPTHS.has(depth) ? depth : "basic";
}

export class ResearchWebTool extends BaseTool {
  constructor() {
    super(
      "research_web",
      "Research the internet for current, source-backed information. Use this for latest news, comparisons, fact-checking, and any query that needs web research.",
      {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The research topic or question",
          },
          topic: {
            type: "string",
            enum: ["general", "news", "finance"],
            description: "Search category for Tavily",
          },
          max_results: {
            type: "number",
            description: "Maximum number of results to return",
          },
          search_depth: {
            type: "string",
            enum: ["basic", "advanced", "fast", "ultra-fast"],
            description: "Search depth for Tavily",
          },
          include_answer: {
            type: "boolean",
            description: "Whether Tavily should include an LLM-generated answer",
          },
          include_raw_content: {
            type: "boolean",
            description: "Whether to include parsed content for each result",
          },
          include_domains: {
            type: "array",
            items: { type: "string" },
            description: "Optional domains to prioritize",
          },
          exclude_domains: {
            type: "array",
            items: { type: "string" },
            description: "Optional domains to exclude",
          },
          style: {
            type: "string",
            enum: ["bilingual", "english"],
            description: "Response style",
          },
        },
        required: ["query"],
      }
    );
  }

  async execute(input) {
    const query = this.normalizeString(input.query);
    const style = input.style || "english";

    if (!query) {
      return this.formatByStyle(
        style,
        "Research ke liye topic do.",
        "Please provide a topic to research."
      );
    }

    try {
      const normalizedTopic = normalizeTopic(input.topic);
      const normalizedDepth = normalizeSearchDepth(input.search_depth);

      const searchResponse = await searchWeb(query, {
        topic: normalizedTopic,
        maxResults: input.max_results || 5,
        searchDepth: normalizedDepth,
        includeAnswer: input.include_answer ?? true,
        includeRawContent: input.include_raw_content ?? false,
        includeDomains: input.include_domains || [],
        excludeDomains: input.exclude_domains || [],
      });

      const researchSummary = summarizeResearchResults(searchResponse, {
        query,
        style,
        maxResults: input.max_results || 5,
      });

      const synthesisPrompt = `${researchSummary}\n\nRewrite this as a concise assistant response.\nRules:\n- If the style is bilingual, answer once in natural Hinglish and do not duplicate in English.\n- If the style is english, answer only in English.\n- Keep it short, practical, and source-aware.`;

      const styleInstruction = style === "bilingual"
        ? "If the source summary is in Hindi or the user asked in Hinglish, answer once in natural mixed Hinglish. Do not provide a separate English translation."
        : "Answer only in English.";

      const finalResponse = await getOpenClawTextResponse({
        systemPrompt: "You are COCO, a web research assistant that cites and summarizes reliably.",
        styleInstruction,
        userPrompt: synthesisPrompt,
      });

      await retainMemory(`Research query: ${query}\n\nAnswer:\n${finalResponse}\n\nResearch notes:\n${researchSummary}`, {
        context: "web-research",
        metadata: {
          query,
          topic: normalizedTopic,
          search_depth: normalizedDepth,
          source: "tavily",
        },
        tags: ["research", "web"],
      });

      return finalResponse;
    } catch (error) {
      console.error("[research-web-tool] Error:", error.message);
      return this.formatByStyle(
        style,
        `Research nahi ho paya: ${error.message}`,
        `Could not complete research: ${error.message}`
      );
    }
  }
}
