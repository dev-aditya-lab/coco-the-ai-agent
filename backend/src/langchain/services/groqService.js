/**
 * Groq Service for LangChain
 * Provides LLM integration using Groq API
 */

import { ChatGroq } from "@langchain/groq";
import { env } from "../../config/env.js";

let groqInstance = null;

function parseModelJson(content) {
  const raw = typeof content === "string" ? content.trim() : "";
  if (!raw) {
    throw new Error("Empty model response");
  }

  const withoutFence = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const firstBrace = withoutFence.indexOf("{");
    const lastBrace = withoutFence.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const slice = withoutFence.slice(firstBrace, lastBrace + 1);
      return JSON.parse(slice);
    }

    throw new Error("No parsable JSON found");
  }
}

/**
 * Get or create Groq LLM instance
 * @param {Object} options - Configuration options
 * @returns {ChatGroq} - Groq LLM instance
 */
export function getGroqInstance(options = {}) {
  if (!groqInstance) {
    const apiKey = env.groqApiKey;

    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set in environment variables");
    }

    groqInstance = new ChatGroq({
      apiKey,
      model: options.model || options.modelName || "llama-3.3-70b-versatile",
      temperature: options.temperature !== undefined ? options.temperature : 0.7,
      maxTokens: options.maxTokens || 1024,
    });
  }

  return groqInstance;
}

/**
 * Get chat response from Groq
 * @param {string} message - User message
 * @param {Array} history - Conversation history
 * @param {string} styleInstruction - Style instruction for response
 * @returns {Promise<string>} - LLM response
 */
export async function getGroqChatResponse(message, history = [], styleInstruction = "", memoryContext = "") {
  try {
    const groq = getGroqInstance();

    const messages = [];

    messages.push({
      role: "system",
      content: `You are COCO, a helpful AI assistant. ${styleInstruction}`,
    });

    if (memoryContext) {
      messages.push({
        role: "system",
        content: `Relevant long-term memory context:\n${memoryContext}`,
      });
    }

    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        messages.push({
          role: msg.role || "user",
          content: msg.content || "",
        });
      }
    }

    messages.push({
      role: "user",
      content: message,
    });

    const response = await groq.invoke(messages);
    return response.content || "I couldn't process that.";
  } catch (error) {
    console.error("[groq-service] Chat error:", error.message);
    throw error;
  }
}

/**
 * Get info response from Groq
 * @param {string} query - Information query
 * @returns {Promise<string>} - LLM response
 */
export async function getGroqInfoResponse(query, styleInstruction = "") {
  try {
    const groq = getGroqInstance({
      temperature: 0.5,
      maxTokens: 512,
    });

    const systemPrompt = styleInstruction
      ? `You are a helpful AI assistant that provides accurate, concise information. Keep responses brief (1-2 lines). Be friendly and professional. ${styleInstruction}`
      : "You are a helpful AI assistant that provides accurate, concise information. Keep responses brief (1-2 lines). Be friendly and professional.";

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: query,
      },
    ];

    const response = await groq.invoke(messages);
    return response.content || "I couldn't find that information.";
  } catch (error) {
    console.error("[groq-service] Info error:", error.message);
    throw error;
  }
}

/**
 * Get action planning response from Groq
 * @param {string} command - User command
 * @param {Array} history - Conversation history
 * @returns {Promise<Object>} - JSON action plan
 */
export async function getGroqActionPlan(command, history = [], memoryContext = "") {
  try {
    const groq = getGroqInstance({
      temperature: 0.3,
      maxTokens: 1024,
    });

    const systemPrompt = `You are an AI assistant that converts user commands into structured action plans.
Return ONLY a valid JSON object, nothing else.
Do not wrap in markdown or add any commentary.

Allowed actions: chat, open_app, open_website, play_youtube, create_file, get_info, get_user_info, research_web

Use research_web for internet research, current information, latest news, source-backed answers, or when the user explicitly asks to research something online.

If user asks for one task, return single-action format:
{
  "action": "action_name",
  "parameters": {
    "key": "value"
  }
}

If user asks for a multi-step goal (contains words like "and", "then", "after that", or clearly needs multiple actions), return:
{
  "actions": [
    {
      "action": "action_name",
      "parameters": { "key": "value" }
    }
  ]
}

Rules:
- Keep at most 4 actions.
- Each action must be one of allowed actions.
- Put concrete tool input in parameters.
- Do not return extra keys.`;

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...(memoryContext
        ? [{ role: "system", content: `Relevant long-term memory context:\n${memoryContext}` }]
        : []),
      ...(Array.isArray(history)
        ? history.slice(-6).map((entry) => ({
            role: entry?.role === "assistant" ? "assistant" : "user",
            content: typeof entry?.content === "string" ? entry.content : "",
          }))
        : []),
      {
        role: "user",
        content: command,
      },
    ];

    const response = await groq.invoke(messages);

    try {
      return parseModelJson(response.content);
    } catch {
      return {
        action: "chat",
        parameters: {
          response: response.content,
        },
      };
    }
  } catch (error) {
    console.error("[groq-service] Action plan error:", error.message);
    throw error;
  }
}

/**
 * Get one autonomous planning step (OpenCLAW-style loop)
 * @param {Object} input - Planner input
 * @returns {Promise<Object>} - {done, final_response, next_action}
 */
export async function getGroqAutonomousStep(input = {}) {
  const {
    goal = "",
    history = [],
    memoryContext = "",
    completedSteps = [],
    remainingIterations = 1,
  } = input;

  try {
    const groq = getGroqInstance({
      temperature: 0.2,
      maxTokens: 1024,
    });

    const systemPrompt = `You are an autonomous AI planner for a tool-using assistant.
You work in a loop: observe previous tool outputs, decide whether goal is complete, else choose exactly one next tool action.

Return ONLY valid JSON with this exact shape:
{
  "done": true_or_false,
  "final_response": "string for the user when done, else empty string",
  "next_action": {
    "action": "chat|open_app|open_website|play_youtube|create_file|get_info|get_user_info|research_web",
    "parameters": {}
  }
}

Rules:
- If the goal is achieved, set done=true and provide final_response.
- If not achieved, set done=false and provide next_action.
- Only one next action per step.
- Keep actions safe and practical.
- Prefer concise parameters.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(memoryContext
        ? [{ role: "system", content: `Relevant long-term memory context:\n${memoryContext}` }]
        : []),
      ...(Array.isArray(history)
        ? history.slice(-6).map((entry) => ({
            role: entry?.role === "assistant" ? "assistant" : "user",
            content: typeof entry?.content === "string" ? entry.content : "",
          }))
        : []),
      {
        role: "user",
        content: JSON.stringify({
          goal,
          remainingIterations,
          completedSteps: Array.isArray(completedSteps)
            ? completedSteps.map((step) => ({
                stepNumber: step.stepNumber,
                action: step.action,
                status: step.status,
                message: typeof step.message === "string" ? step.message.slice(0, 800) : "",
              }))
            : [],
        }),
      },
    ];

    const response = await groq.invoke(messages);

    try {
      const parsed = parseModelJson(response.content);
      return {
        done: Boolean(parsed?.done),
        final_response: typeof parsed?.final_response === "string" ? parsed.final_response : "",
        next_action: parsed?.next_action && typeof parsed.next_action === "object"
          ? parsed.next_action
          : null,
      };
    } catch {
      return {
        done: true,
        final_response: typeof response.content === "string" ? response.content : "Task completed.",
        next_action: null,
      };
    }
  } catch (error) {
    console.error("[groq-service] Autonomous step error:", error.message);
    throw error;
  }
}

/**
 * Create a streaming response from Groq
 * @param {string} message - User message
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<void>}
 */
export async function getGroqStreamingResponse(message, onChunk) {
  try {
    const groq = getGroqInstance();

    const messages = [
      {
        role: "system",
        content: "You are COCO, a helpful AI assistant.",
      },
      {
        role: "user",
        content: message,
      },
    ];

    const stream = await groq.stream(messages);

    for await (const chunk of stream) {
      if (onChunk) {
        onChunk(chunk);
      }
    }
  } catch (error) {
    console.error("[groq-service] Streaming error:", error.message);
    throw error;
  }
}
