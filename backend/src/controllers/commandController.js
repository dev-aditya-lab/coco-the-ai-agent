import { requestActionPlan } from "../services/aiService.js";
import { executeAction } from "../services/actionHandler.js";

const ALLOWED_ACTIONS = new Set(["open_app", "play_youtube", "create_file", "get_info"]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildFallback(command, reason = "fallback") {
  return {
    action: "get_info",
    parameters: {
      app: "",
      query: normalizeString(command),
      filename: "",
      content: "",
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

function validateActionPayload(payload, originalCommand) {
  if (!payload || typeof payload !== "object") {
    return buildFallback(originalCommand, "invalid_payload");
  }

  const safeAction = normalizeString(payload.action);
  const action = ALLOWED_ACTIONS.has(safeAction) ? safeAction : "get_info";

  const params = payload.parameters && typeof payload.parameters === "object" ? payload.parameters : {};

  return {
    action,
    parameters: {
      app: normalizeString(params.app),
      query: normalizeString(params.query),
      filename: normalizeString(params.filename),
      content: normalizeString(params.content),
    },
    meta: {
      source: "groq",
    },
  };
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

    const actionPlan = validateActionPayload(parsedJson, command);
    const execution = await executeAction(actionPlan);

    return res.status(200).json({
      success: true,
      data: actionPlan,
      execution,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[command] processing_error", error);

    const fallback = buildFallback(command, "parse_or_provider_error");
    const execution = await executeAction(fallback);

    return res.status(200).json({
      success: true,
      data: fallback,
      execution,
      timestamp: new Date().toISOString(),
    });
  }
}