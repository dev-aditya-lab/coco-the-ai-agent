import { getAgentExecutor } from "../langchain/index.js";
import { env } from "../config/env.js";
import { getRecentCommands, saveCommandHistory } from "../services/historyService.js";
import { buildMemoryContext, retainMemory } from "../langchain/index.js";

const MAX_CONVERSATION_MESSAGES = 10;
const conversationState = {
  name: "",
  history: [],
};

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function appendConversationHistory(role, content) {
  const safeRole = role === "assistant" ? "assistant" : "user";
  const safeContent = normalizeString(content);

  if (!safeContent) {
    return;
  }

  conversationState.history.push({ role: safeRole, content: safeContent });

  if (conversationState.history.length > MAX_CONVERSATION_MESSAGES) {
    conversationState.history = conversationState.history.slice(-MAX_CONVERSATION_MESSAGES);
  }
}

function extractNameFromText(text) {
  const normalized = normalizeString(text);
  if (!normalized) {
    return "";
  }

  const englishMatch = normalized.match(/\b(?:i am|i'm|my name is)\s+([a-z][a-z\s'-]{1,30})/i);
  const hindiMatch = normalized.match(/\bmera naam\s+([a-z][a-z\s'-]{1,30})\s+hai\b/i);
  const raw = englishMatch?.[1] || hindiMatch?.[1] || "";

  if (!raw) {
    return "";
  }

  const candidate = raw.trim().split(" ").slice(0, 2).join(" ");
  const blockedNameTokens = new Set(["batao", "batado", "kya", "hai", "abhi", "tha", "bolo"]);
  const candidateTokens = candidate.toLowerCase().split(" ").filter(Boolean);

  if (candidateTokens.some((token) => blockedNameTokens.has(token))) {
    return "";
  }

  return candidate
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function isNameLookupIntent(text) {
  const normalized = normalizeString(text).toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    /\bwhat\s+is\s+my\s+name\b/.test(normalized)
    || /\btell\s+my\s+name\b/.test(normalized)
    || /\bmy\s+name\b/.test(normalized)
    || /\bmera\s+naam\b/.test(normalized)
  ) && !/\bmy\s+name\s+is\b|\bmera\s+naam\s+[a-z][a-z\s'-]{0,30}\s+hai\b/.test(normalized);
}

async function logCommandToHistory(command, action, parameters, response, status) {
  try {
    await saveCommandHistory({
      command,
      action,
      parameters,
      response,
      status,
    });
  } catch (error) {
    console.error("[history] save_failed", error);
  }
}

export async function postCommand(req, res) {
  const command = normalizeString(req.body?.command);

  if (!command) {
    return res.status(400).json({
      success: false,
      error: "command is required.",
    });
  }

  console.info("[command] input", { command });

  const extractedName = extractNameFromText(command);
  if (extractedName && !isNameLookupIntent(command)) {
    conversationState.name = extractedName;
  }

  try {
    const memoryContext = await buildMemoryContext(command, {
      budget: "low",
      maxTokens: 1000,
      includeEntities: true,
      includeChunks: false,
      includeSourceFacts: false,
      tags: conversationState.name ? [conversationState.name.toLowerCase()] : undefined,
    });

    const executor = getAgentExecutor({
      verbose: env.DEBUG === "true",
    });

    const result = await executor.execute(command, conversationState.history, memoryContext);

    const parameters = {
      ...(result.metadata?.parameters || {}),
      name: conversationState.name || result.metadata?.parameters?.name || "",
    };

    const stepsExecuted = [
      {
        stepNumber: 1,
        action: result.action,
        parameters,
        status: result.action === "error" ? "failed" : "completed",
        message: result.result,
        details: result.metadata,
      },
    ];

    const finalMessage = result.result;

    appendConversationHistory("user", command);
    appendConversationHistory("assistant", finalMessage);

    await retainMemory(`User said: ${command}\nAssistant replied: ${finalMessage}`, {
      context: "conversation",
      metadata: {
        action: result.action,
        userName: conversationState.name || "",
        command,
      },
      tags: conversationState.name ? ["conversation", conversationState.name.toLowerCase()] : ["conversation"],
    });

    if (extractedName && !isNameLookupIntent(command)) {
      await retainMemory(`The user introduced themselves as ${extractedName}.`, {
        context: "profile",
        metadata: {
          type: "user_name",
          name: extractedName,
        },
        tags: ["profile", "name"],
      });
    }

    await logCommandToHistory(
      command,
      result.action,
      parameters,
      finalMessage,
      result.action === "error" ? "failure" : "success"
    );

    return res.status(200).json({
      success: result.action !== "error",
      stepsExecuted,
      finalMessage,
      modePayload: result.action === "chat" ? { action: "chat", response: finalMessage } : null,
      timestamp: new Date().toISOString(),
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("[command] processing_error", error);

    const errorMessage = env.DEBUG === "true" ? error.message : "An error occurred processing your command.";

    appendConversationHistory("user", command);
    appendConversationHistory("assistant", errorMessage);

    await logCommandToHistory(command, "error", {}, errorMessage, "failure");

    return res.status(200).json({
      success: false,
      stepsExecuted: [
        {
          stepNumber: 1,
          action: "error",
          status: "failed",
          message: errorMessage,
        },
      ],
      finalMessage: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getHistory(req, res) {
  const requestedLimit = req.query.limit;

  try {
    const history = await getRecentCommands(requestedLimit || 10);

    return res.status(200).json({
      success: true,
      data: history,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[history] fetch_failed", error);

    return res.status(200).json({
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    });
  }
}
