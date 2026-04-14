import { env } from "../config/env.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export const SYSTEM_PROMPT = `You are a strict JSON action planner for an AI agent.

Return only one valid JSON object and nothing else.
Do not wrap in markdown.
Do not add commentary.

Allowed actions:
- open_app
- play_youtube
- create_file
- get_info

Response schema (must match exactly):
{
  "action": "string",
  "parameters": {
    "app": "string",
    "query": "string",
    "filename": "string",
    "content": "string"
  }
}

Rules:
1) Always include all parameter keys with string values.
2) Use empty string for missing values.
3) If command is ambiguous or unsupported, use action "get_info".
4) Output must be valid JSON parseable by JSON.parse.`;

export async function requestActionPlan(command) {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.groqModel,
        temperature: 0,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: command },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Groq request failed: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Groq returned an empty response.");
    }

    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}