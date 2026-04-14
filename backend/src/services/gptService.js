import { env } from "../config/env.js";
import { INFO_PROMPT } from "./aiService.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroqGpt({ messages, maxTokens = 260 }) {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.gptModel,
        temperature: 0,
        max_tokens: maxTokens,
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GPT request failed: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("GPT returned an empty response.");
    }

    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function requestInfoTextGpt(query) {
  return callGroqGpt({
    maxTokens: 260,
    messages: [
      { role: "system", content: INFO_PROMPT },
      { role: "user", content: query },
    ],
  });
}
