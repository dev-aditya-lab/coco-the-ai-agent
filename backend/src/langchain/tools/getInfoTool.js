/**
 * Get Info Tool - Answer informational queries
 * Provides factual information using LLM
 */

import { BaseTool } from "./baseTool.js";
import { getGroqInfoResponse } from "../services/groqService.js";

export class GetInfoTool extends BaseTool {
  constructor() {
    super(
      "get_info",
      "Answer informational and factual questions. Examples: 'What is Python?', 'How does AI work?', 'Who is Steve Jobs?'",
      {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The informational query or question",
          },
          style: {
            type: "string",
            enum: ["bilingual", "english"],
            description: "Response style: 'bilingual' for Hinglish mix, 'english' for English only",
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
        "Kya janna chahte ho?",
        "What would you like to know?"
      );
    }

    const styleInstruction = style === "bilingual"
      ? "Respond once in natural mixed Hinglish. Do not add a separate translated line."
      : "Respond only in English, in 1-2 short lines.";

    const response = await getGroqInfoResponse(query, styleInstruction);
    return {
      message: response,
      type: "info",
      query,
      style,
    };
  }
}
