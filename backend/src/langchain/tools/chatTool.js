/**
 * Chat Tool - Handle conversational interactions
 * Provides natural language responses for general chat
 */

import { BaseTool } from "./baseTool.js";
import { getOpenClawTextResponse } from "../services/openclawService.js";

export class ChatTool extends BaseTool {
  constructor() {
    super(
      "chat",
      "Have a natural conversation with the user. Use this for greetings, casual talk, and general questions.",
      {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The user's message or question",
          },
          style: {
            type: "string",
            enum: ["bilingual", "english"],
            description: "Response style: 'bilingual' for Hinglish mix, 'english' for English only",
          },
          conversationHistory: {
            type: "array",
            description: "Previous conversation history for context",
          },
        },
        required: ["message"],
      }
    );
  }

  async execute(input) {
    const message = this.normalizeString(input.message);
    const style = input.style || "english";
    const history = input.conversationHistory || [];
    const memoryContext = this.normalizeString(input.memory_context);

    if (!message) {
      return this.formatByStyle(
        style,
        "Kuch kaha nahi, phir se try karo.",
        "I didn't catch that. Try again."
      );
    }

    const styleInstruction = style === "bilingual"
      ? "Respond once in natural mixed Hinglish. Do not add a separate translated line."
      : "Respond only in English, in 1-2 short lines.";

    const contextBlock = [
      memoryContext ? `Memory context:\n${memoryContext}` : "",
      Array.isArray(history) && history.length > 0
        ? `Recent conversation:\n${JSON.stringify(history.slice(-6), null, 2)}`
        : "",
    ].filter(Boolean).join("\n\n");

    const response = await getOpenClawTextResponse({
      systemPrompt: "You are COCO, a conversational assistant.",
      styleInstruction,
      userPrompt: `${contextBlock}\n\nUser message:\n${message}`,
    });
    return response;
  }
}
