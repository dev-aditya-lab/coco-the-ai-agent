import { BaseTool } from "./baseTool.js";
import { getGroqChatResponse } from "../services/groqService.js";

export class SummarizeInboxTool extends BaseTool {
  constructor() {
    super(
      "summarize_inbox",
      "Summarize and prioritize inbox messages provided by the user.",
      {
        type: "object",
        properties: {
          messages: {
            type: "array",
            items: { type: "string" },
            description: "Inbox messages to summarize",
          },
          style: { type: "string", enum: ["bilingual", "english"] },
        },
        required: ["messages"],
      }
    );
  }

  async execute(input) {
    const items = Array.isArray(input.messages)
      ? input.messages.map((item) => this.normalizeString(item)).filter(Boolean)
      : [];
    const style = input.style || "english";

    if (items.length === 0) {
      return this.formatByStyle(style, "Summarize karne ke liye inbox messages do.", "Provide inbox messages to summarize.");
    }

    const styleInstruction = style === "bilingual"
      ? "Respond once in natural Hinglish with priority labels and short action list."
      : "Respond in English with priority labels and short action list.";

    const response = await getGroqChatResponse(
      `Inbox messages:\n${items.map((item, idx) => `${idx + 1}. ${item}`).join("\n")}`,
      [],
      styleInstruction,
      "",
    );

    return {
      message: response,
      type: "inbox-summary",
      count: items.length,
    };
  }
}
