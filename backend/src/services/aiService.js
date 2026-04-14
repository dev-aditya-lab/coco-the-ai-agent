import { env } from "../config/env.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export const SYSTEM_PROMPT = `You are a strict JSON action planner for an AI agent.

Return only one valid JSON object and nothing else.
Do not wrap in markdown.
Do not add commentary.
Think step-by-step internally, but do not reveal reasoning.

You have exactly three modes:
1) action mode
2) info mode
3) conversation mode

Mode detection rules:
- Greeting or casual talk -> conversation mode
- "who is", "what is", "how does", "explain" -> info mode
- Operational commands (open/play/create/search/do task) -> action mode
- If uncertain, default to conversation mode

You must understand English and Hinglish commands.
For app-open intent, extract only the app name and ignore filler words such as:
"coco", "jarvis", "please", "kholna", "khol do", "chalao", "open karo", "khol", "open".

For app-open commands, prefer this JSON format:
{
  "action": "open_app",
  "parameters": {
    "app_name": "string"
  }
}

Examples:
Input: "coco figma kholna"
Output: {"action":"open_app","parameters":{"app_name":"figma"}}

Input: "vs code open karo"
Output: {"action":"open_app","parameters":{"app_name":"vscode"}}

Allowed actions:
- open_app
- play_youtube
- create_file
- get_info
- chat

Conversation mode output (exact):
{
  "action": "chat",
  "response": "string"
}

Conversation personality rules:
- Friendly and natural tone
- Keep response short (1-2 lines)
- No emojis
- Slightly smart and helpful
- Not robotic

Examples:
Input: "hi I am Aditya"
Output: {"action":"chat","response":"Hi Aditya, nice to meet you. How can I help?"}

Input: "hi"
Output: {"action":"chat","response":"Hello, how can I assist you?"}

Input: "what are you doing"
Output: {"action":"chat","response":"I'm here to help you with tasks or answer questions."}

Input: "how are you"
Output: {"action":"chat","response":"I'm doing well, ready to help you."}

Response schema (must match exactly):
{
  "steps": [
    {
      "action": "string",
      "parameters": {}
    }
  ]
}

Rules:
1) Always return at least one step.
2) Use only allowed actions.
3) If command is ambiguous or unsupported, return a chat response.
4) parameters must be an object.
5) Use string values in parameters.
6) For chat action in step format, use parameters.response as the message.
7) Output must be valid JSON parseable by JSON.parse.`;

const INFO_PROMPT = `You are a concise assistant.
Answer the user's question directly in plain text.
Do not output JSON.
Keep responses short and clear in 1-2 lines.`;

async function callGroq({ messages, responseFormat, maxTokens = 420 }) {
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
        max_tokens: maxTokens,
        ...(responseFormat ? { response_format: responseFormat } : {}),
        messages,
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

export async function requestActionPlan(command) {
  return callGroq({
    responseFormat: { type: "json_object" },
    maxTokens: 420,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: command },
    ],
  });
}

export async function requestInfoText(query) {
  return callGroq({
    maxTokens: 220,
    messages: [
      { role: "system", content: INFO_PROMPT },
      { role: "user", content: query },
    ],
  });
}