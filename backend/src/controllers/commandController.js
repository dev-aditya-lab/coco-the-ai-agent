import { routeActionPlan } from "../services/modelRouter.js";
import { executeAction } from "../services/actionHandler.js";
import { env } from "../config/env.js";
import { getRecentCommands, saveCommandHistory } from "../services/historyService.js";

const ALLOWED_ACTIONS = new Set(["open_app", "open_website", "play_youtube", "create_file", "get_info", "get_user_info", "chat"]);
const MAX_CONVERSATION_MESSAGES = 10;
const conversationState = {
  name: "",
  history: [],
};

const HINGLISH_HINT_REGEX = /[\u0900-\u097f]|\b(kya|kaise|kyu|kyon|mera|meri|mujhe|tum|tumhara|aap|aapka|hai|haan|nahi|kar|karo|batao|samjhao|main|mein|abhi|thoda|namaste|haanji|theek|thik)\b/i;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function detectResponseStyle(command) {
  const normalized = normalizeString(command);
  if (!normalized) {
    return "english";
  }

  return HINGLISH_HINT_REGEX.test(normalized) ? "bilingual" : "english";
}

function formatByStyle(style, hinglish, english) {
  if (style === "bilingual") {
    return hinglish;
  }
  return english;
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

function isGreetingMessage(text) {
  const normalized = normalizeString(text).toLowerCase();
  return /\b(hi|hello|hey|namaste|yo)\b/.test(normalized);
}

function isIntroMessage(text) {
  const normalized = normalizeString(text).toLowerCase();
  return /\b(i am|i'm|my name is)\b/.test(normalized);
}

function personalizeChatResponse(command, response, responseStyle = "english") {
  const safeResponse = normalizeString(response);

  if (isGreetingMessage(command) && !isIntroMessage(command) && conversationState.name) {
    return formatByStyle(
      responseStyle,
      `Welcome back ${conversationState.name}, kaise help karu?`,
      `Welcome back ${conversationState.name}. How can I help?`
    );
  }

  return safeResponse || buildConversationResponse(command, responseStyle);
}

function buildConversationResponse(command, responseStyle = "english") {
  const normalized = normalizeString(command).toLowerCase();
  const extractedName = extractNameFromText(command);

  if (/\bwho are you\b/.test(normalized)) {
    return formatByStyle(
      responseStyle,
      "Main COCO hoon, ek AI assistant jo Aditya Gupta ne banaya hai. Main tasks perform kar sakta hoon aur questions ka answer de sakta hoon.",
      "I am COCO, an AI assistant created by Aditya Gupta. I can perform tasks and answer questions."
    );
  }

  if (extractedName) {
    conversationState.name = extractedName;
    return formatByStyle(
      responseStyle,
      `Hi ${extractedName}, nice to meet you. Kaise help karu?`,
      `Hi ${extractedName}, nice to meet you. How can I help?`
    );
  }

  if (/\bhow are you\b/.test(normalized)) {
    return formatByStyle(
      responseStyle,
      "Main ready hoon help karne ke liye.",
      "I am ready to help you."
    );
  }

  if (/\b(what are you doing|what you doing|what're you doing)\b/.test(normalized)) {
    return formatByStyle(
      responseStyle,
      "Main yaha tasks aur questions me help karne ke liye hoon.",
      "I am here to help with tasks and questions."
    );
  }

  if (/\b(hi|hello|hey|namaste|yo)\b/.test(normalized)) {
    if (conversationState.name) {
      return formatByStyle(
        responseStyle,
        `Hello ${conversationState.name}, kaise help kar sakta hoon?`,
        `Hello ${conversationState.name}, how can I help?`
      );
    }

    return formatByStyle(
      responseStyle,
      "Hello, kaise help kar sakta hoon?",
      "Hello, how can I help?"
    );
  }

  return formatByStyle(
    responseStyle,
    "Thoda clear karo, samajh nahi aaya.",
    "Please clarify your request; I did not fully understand it."
  );
}

function buildFallback(command, reason = "fallback", responseStyle = "english") {
  return {
    action: "chat",
    parameters: {
      response: buildConversationResponse(command, responseStyle),
      _response_style: responseStyle,
    },
    meta: {
      source: "fallback",
      reason,
    },
  };
}

function parseActionJson(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    const jsonCandidate = rawText.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonCandidate) {
      throw new Error("No JSON object found in model output.");
    }
    return JSON.parse(jsonCandidate);
  }
}

function normalizeParameters(parameters) {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    return {};
  }

  const normalized = {};

  for (const [key, value] of Object.entries(parameters)) {
    if (!key || typeof key !== "string") {
      continue;
    }

    if (typeof value === "string") {
      normalized[key] = value.trim();
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      normalized[key] = String(value);
      continue;
    }

    normalized[key] = "";
  }

  return normalized;
}

function normalizeStep(stepPayload, originalCommand, source = "groq", responseStyle = "english") {
  if (!stepPayload || typeof stepPayload !== "object") {
    return buildFallback(originalCommand, "invalid_step", responseStyle);
  }

  const safeAction = normalizeString(stepPayload.action);
  const action = ALLOWED_ACTIONS.has(safeAction) ? safeAction : "chat";

  const parameters = normalizeParameters(stepPayload.parameters);

  if (action === "chat") {
    const topLevelResponse = normalizeString(stepPayload.response);
    parameters.response = personalizeChatResponse(
      originalCommand,
      parameters.response || topLevelResponse,
      responseStyle
    );
  }

  if (action === "get_info" && !parameters.query) {
    parameters.query = normalizeString(originalCommand);
  }

  if (action === "get_user_info" && !parameters.type) {
    parameters.type = "name";
  }

  parameters._response_style = responseStyle;

  return {
    action,
    parameters,
    meta: {
      source,
    },
  };
}

function validateActionPayload(payload, originalCommand, responseStyle = "english") {
  if (!payload || typeof payload !== "object") {
    return [buildFallback(originalCommand, "invalid_payload", responseStyle)];
  }

  if (Array.isArray(payload.steps) && payload.steps.length > 0) {
    return payload.steps.map((step) => normalizeStep(step, originalCommand, "groq", responseStyle));
  }

  if (payload.action) {
    return [normalizeStep(payload, originalCommand, "groq_single_step", responseStyle)];
  }

  return [buildFallback(originalCommand, "missing_steps", responseStyle)];
}

function toHistoryRecord(command, actionPlan, execution) {
  return {
    command,
    action: actionPlan.action,
    parameters: actionPlan.parameters,
    response: typeof execution?.message === "string" ? execution.message : "",
    status: execution?.status === "failed" ? "failure" : "success",
  };
}

function inferYoutubeQueryFromCommand(command) {
  const normalized = normalizeString(command).toLowerCase();
  if (!normalized) {
    return "";
  }

  const cleaned = normalized
    .replace(/[.,!?]/g, " ")
    .replace(/\b(coco|jarvis|please|plz|khol|khlo|kholna|khol do|open|chalao|play|na|main|mein|me|in|on|youtube|chrome|browser)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

async function executeSteps(actionSteps, command, responseStyle = "english") {
  const stepsExecuted = [];
  let activeApp = "";

  for (let index = 0; index < actionSteps.length; index += 1) {
    const step = actionSteps[index];
    const preparedStep = {
      ...step,
      parameters: {
        ...(step.parameters || {}),
        _response_style: responseStyle,
      },
    };

    if (preparedStep.action === "play_youtube") {
      const hasQuery = normalizeString(
        preparedStep.parameters.query
          || preparedStep.parameters.search
          || preparedStep.parameters.song
          || preparedStep.parameters.video
          || preparedStep.parameters.topic
      );

      if (!hasQuery) {
        const inferredQuery = inferYoutubeQueryFromCommand(command);
        if (inferredQuery) {
          preparedStep.parameters.query = inferredQuery;
        }
      }

      if (!normalizeString(preparedStep.parameters.browser) && activeApp) {
        preparedStep.parameters.browser = activeApp;
      }
    }

    console.info("[command] step_execute_start", {
      stepNumber: index + 1,
      action: preparedStep.action,
      parameters: preparedStep.parameters,
    });

    const execution = await executeAction(preparedStep);

    const stepResult = {
      stepNumber: index + 1,
      action: preparedStep.action,
      parameters: preparedStep.parameters,
      status: execution.status,
      message: execution.message,
      details: execution.details,
    };

    stepsExecuted.push(stepResult);

    if (preparedStep.action === "open_app" && execution.status === "completed") {
      activeApp = normalizeString(
        execution?.details?.app_name || preparedStep.parameters.app_name || preparedStep.parameters.app
      ).toLowerCase();
    }

    saveCommandHistory(toHistoryRecord(command, preparedStep, execution)).catch((error) => {
      console.error("[history] save_failed", error);
    });

    console.info("[command] step_execute_done", stepResult);

    if (env.actionStopOnFailure && execution.status === "failed") {
      break;
    }
  }

  return stepsExecuted;
}

function buildFinalMessage(stepsExecuted, responseStyle = "english") {
  const failedStep = stepsExecuted.find((step) => step.status === "failed");

  if (failedStep) {
    return `Execution stopped at step ${failedStep.stepNumber}: ${failedStep.message}`;
  }

  if (stepsExecuted.length === 1 && stepsExecuted[0]?.action === "get_info") {
    return stepsExecuted[0].message || "Completed informational response.";
  }

  if (stepsExecuted.length === 1 && stepsExecuted[0]?.action === "chat") {
    return stepsExecuted[0].message || formatByStyle(responseStyle, "Hello, kaise help kar sakta hoon?", "Hello, how can I help?");
  }

  if (stepsExecuted.length === 1) {
    return stepsExecuted[0].message || formatByStyle(responseStyle, "Kaam ho gaya.", "Task completed.");
  }

  return formatByStyle(responseStyle, "Kaam complete ho gaya.", "Task completed successfully.");
}

function buildModePayload(stepsExecuted) {
  if (stepsExecuted.length === 1 && stepsExecuted[0]?.action === "chat") {
    return {
      action: "chat",
      response: stepsExecuted[0].message || "Hello, kaise help kar sakta hoon?",
    };
  }

  return null;
}

export async function postCommand(req, res) {
  const command = normalizeString(req.body?.command);
  const responseStyle = detectResponseStyle(command);

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
    let actionSteps;

    if (isNameLookupIntent(command)) {
      actionSteps = [
        {
          action: "get_user_info",
          parameters: {
            type: "name",
            name: conversationState.name,
            _response_style: responseStyle,
          },
          meta: {
            source: "rule_name_lookup",
          },
        },
      ];
    } else {
      const rawResponse = await routeActionPlan(command, conversationState.history);
      console.info("[command] ai_response", { rawResponse });

      const parsedJson = parseActionJson(rawResponse);
      console.info("[command] parsed_json", parsedJson);

      actionSteps = validateActionPayload(parsedJson, command, responseStyle);
    }

    const stepsExecuted = await executeSteps(actionSteps, command, responseStyle);
    const finalMessage = buildFinalMessage(stepsExecuted, responseStyle);

    appendConversationHistory("user", command);
    appendConversationHistory("assistant", finalMessage);

    return res.status(200).json({
      success: stepsExecuted.every((step) => step.status !== "failed"),
      stepsExecuted,
      finalMessage,
      modePayload: buildModePayload(stepsExecuted),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[command] processing_error", error);

    const fallbackSteps = [buildFallback(command, "parse_or_provider_error", responseStyle)];
    const stepsExecuted = await executeSteps(fallbackSteps, command, responseStyle);
    const finalMessage = buildFinalMessage(stepsExecuted, responseStyle);

    appendConversationHistory("user", command);
    appendConversationHistory("assistant", finalMessage);

    return res.status(200).json({
      success: stepsExecuted.every((step) => step.status !== "failed"),
      stepsExecuted,
      finalMessage,
      modePayload: buildModePayload(stepsExecuted),
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