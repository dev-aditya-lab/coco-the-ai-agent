import { env } from "../config/env.js";
import { INFO_PROMPT, SYSTEM_PROMPT } from "./aiService.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroqQwen({ messages, responseFormat, maxTokens = 420 }) {
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
        model: env.qwenModel,
        temperature: 0,
        max_tokens: maxTokens,
        ...(responseFormat ? { response_format: responseFormat } : {}),
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Qwen request failed: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Qwen returned an empty response.");
    }

    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function requestActionPlanQwen(command, history = []) {
  const safeHistory = Array.isArray(history)
    ? history
        .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
        .map((item) => ({ role: item.role, content: item.content.trim() }))
        .filter((item) => item.content.length > 0)
    : [];

  return callGroqQwen({
    responseFormat: { type: "json_object" },
    maxTokens: 420,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...safeHistory,
      { role: "user", content: command },
    ],
  });
}

export async function requestInfoTextQwen(query) {
  return callGroqQwen({
    maxTokens: 220,
    messages: [
      { role: "system", content: INFO_PROMPT },
      { role: "user", content: query },
    ],
  });
}
