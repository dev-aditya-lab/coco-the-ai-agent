/**
 * Groq Service for LangChain
 * Provides LLM integration using Groq API
 */

import { ChatGroq } from "@langchain/groq";
import { env } from "../../config/env.js";

let groqInstance = null;

/**
 * Get or create Groq LLM instance
 * @param {Object} options - Configuration options
 * @returns {ChatGroq} - Groq LLM instance
 */
export function getGroqInstance(options = {}) {
  if (!groqInstance) {
    const apiKey = env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set in environment variables");
    }

    groqInstance = new ChatGroq({
      apiKey,
      modelName: options.modelName || "mixtral-8x7b-32768",
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

    // Build conversation messages
    const messages = [];

    // Add system prompt
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

    // Add conversation history
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        messages.push({
          role: msg.role || "user",
          content: msg.content || "",
        });
      }
    }

    // Add current message
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
 * @returns {Promise<string>} - JSON action plan
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

Response format:
{
  "action": "action_name",
  "parameters": {
    "key": "value"
  }
}`;

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
    
    // Parse JSON response
    try {
      return JSON.parse(response.content);
    } catch {
      // If not valid JSON, return as chat response
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
