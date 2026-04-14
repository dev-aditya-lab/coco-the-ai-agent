import { requestActionPlan } from "../services/aiService.js";
import { executeAction } from "../services/actionHandler.js";
import { env } from "../config/env.js";
import { getRecentCommands, saveCommandHistory } from "../services/historyService.js";

const ALLOWED_ACTIONS = new Set(["open_app", "play_youtube", "create_file", "get_info", "chat"]);
const conversationState = {
  name: "",
};

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function extractNameFromText(text) {
  const normalized = normalizeString(text);
  if (!normalized) {
    return "";
  }

  const match = normalized.match(/\b(?:i am|i'm|my name is)\s+([a-z][a-z\s'-]{1,30})/i);
  if (!match?.[1]) {
    return "";
  }

  const candidate = match[1].trim().split(" ").slice(0, 2).join(" ");
  return candidate
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildConversationResponse(command) {
  const normalized = normalizeString(command).toLowerCase();
  const extractedName = extractNameFromText(command);

  if (extractedName) {
    conversationState.name = extractedName;
    return `Hi ${extractedName}, nice to meet you. How can I help?`;
  }

  if (/\bhow are you\b/.test(normalized)) {
    return "I'm doing well, ready to help you.";
  }

  if (/\b(what are you doing|what you doing|what're you doing)\b/.test(normalized)) {
    return "I'm here to help you with tasks or answer questions.";
  }

  if (/\b(hi|hello|hey|namaste|yo)\b/.test(normalized)) {
    if (conversationState.name) {
      return `Hello ${conversationState.name}, how can I assist you?`;
    }

    return "Hello, how can I assist you?";
  }

  return "Sure, I am here with you. Tell me what you want to do next.";
}

function buildFallback(command, reason = "fallback") {
  return {
    action: "chat",
    parameters: {
      response: buildConversationResponse(command),
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

function normalizeStep(stepPayload, originalCommand, source = "groq") {
  if (!stepPayload || typeof stepPayload !== "object") {
    return buildFallback(originalCommand, "invalid_step");
  }

  const safeAction = normalizeString(stepPayload.action);
  const action = ALLOWED_ACTIONS.has(safeAction) ? safeAction : "chat";

  const parameters = normalizeParameters(stepPayload.parameters);

  if (action === "chat") {
    const topLevelResponse = normalizeString(stepPayload.response);
    if (!parameters.response) {
      parameters.response = topLevelResponse || buildConversationResponse(originalCommand);
    }
  }

  if (action === "get_info" && !parameters.query) {
    parameters.query = normalizeString(originalCommand);
  }

  return {
    action,
    parameters,
    meta: {
      source,
    },
  };
}

function validateActionPayload(payload, originalCommand) {
  if (!payload || typeof payload !== "object") {
    return [buildFallback(originalCommand, "invalid_payload")];
  }

  if (Array.isArray(payload.steps) && payload.steps.length > 0) {
    return payload.steps.map((step) => normalizeStep(step, originalCommand, "groq"));
  }

  if (payload.action) {
    return [normalizeStep(payload, originalCommand, "groq_single_step")];
  }

  return [buildFallback(originalCommand, "missing_steps")];
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

async function executeSteps(actionSteps, command) {
  const stepsExecuted = [];
  let activeApp = "";

  for (let index = 0; index < actionSteps.length; index += 1) {
    const step = actionSteps[index];
    const preparedStep = {
      ...step,
      parameters: {
        ...(step.parameters || {}),
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

function buildFinalMessage(stepsExecuted) {
  const failedStep = stepsExecuted.find((step) => step.status === "failed");

  if (failedStep) {
    return `Execution stopped at step ${failedStep.stepNumber}: ${failedStep.message}`;
  }

  if (stepsExecuted.length === 1 && stepsExecuted[0]?.action === "get_info") {
    return stepsExecuted[0].message || "Completed informational response.";
  }

  if (stepsExecuted.length === 1 && stepsExecuted[0]?.action === "chat") {
    return stepsExecuted[0].message || "Hello, how can I assist you?";
  }

  return `Executed ${stepsExecuted.length} step(s) successfully.`;
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

  try {
    const rawResponse = await requestActionPlan(command);
    console.info("[command] ai_response", { rawResponse });

    const parsedJson = parseActionJson(rawResponse);
    console.info("[command] parsed_json", parsedJson);

    const actionSteps = validateActionPayload(parsedJson, command);
    const stepsExecuted = await executeSteps(actionSteps, command);

    return res.status(200).json({
      success: stepsExecuted.every((step) => step.status !== "failed"),
      stepsExecuted,
      finalMessage: buildFinalMessage(stepsExecuted),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[command] processing_error", error);

    const fallbackSteps = [buildFallback(command, "parse_or_provider_error")];
    const stepsExecuted = await executeSteps(fallbackSteps, command);

    return res.status(200).json({
      success: stepsExecuted.every((step) => step.status !== "failed"),
      stepsExecuted,
      finalMessage: buildFinalMessage(stepsExecuted),
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