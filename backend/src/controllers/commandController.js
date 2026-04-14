import { requestActionPlan } from "../services/aiService.js";
import { executeAction } from "../services/actionHandler.js";
import { env } from "../config/env.js";
import { getRecentCommands, saveCommandHistory } from "../services/historyService.js";

const ALLOWED_ACTIONS = new Set(["open_app", "play_youtube", "create_file", "get_info"]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildFallback(command, reason = "fallback") {
  return {
    action: "get_info",
    parameters: {
      query: normalizeString(command),
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
  const action = ALLOWED_ACTIONS.has(safeAction) ? safeAction : "get_info";

  const parameters = normalizeParameters(stepPayload.parameters);
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
    timestamp: new Date(),
  };
}

async function executeSteps(actionSteps, command) {
  const stepsExecuted = [];

  for (let index = 0; index < actionSteps.length; index += 1) {
    const step = actionSteps[index];
    console.info("[command] step_execute_start", {
      stepNumber: index + 1,
      action: step.action,
      parameters: step.parameters,
    });

    const execution = await executeAction(step);

    const stepResult = {
      stepNumber: index + 1,
      action: step.action,
      parameters: step.parameters,
      status: execution.status,
      message: execution.message,
      details: execution.details,
    };

    stepsExecuted.push(stepResult);

    saveCommandHistory(toHistoryRecord(command, step, execution)).catch((error) => {
      console.error("[history] save_failed", error);
    });

    console.info("[command] step_execute_done", stepResult);

    if (env.actionStopOnFailure && execution.status === "failed") {
      break;
    }
  }

  return stepsExecuted;
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
    const failedStep = stepsExecuted.find((step) => step.status === "failed");

    return res.status(200).json({
      success: !failedStep,
      stepsExecuted,
      finalMessage: failedStep
        ? `Execution stopped at step ${failedStep.stepNumber}: ${failedStep.message}`
        : `Executed ${stepsExecuted.length} step(s) successfully.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[command] processing_error", error);

    const fallbackSteps = [buildFallback(command, "parse_or_provider_error")];
    const stepsExecuted = await executeSteps(fallbackSteps, command);

    return res.status(200).json({
      success: stepsExecuted.every((step) => step.status !== "failed"),
      stepsExecuted,
      finalMessage: "Used fallback execution path due to planning failure.",
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