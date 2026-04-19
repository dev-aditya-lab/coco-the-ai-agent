import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { existsSync } from "node:fs";
import { env } from "../../config/env.js";

const execFileAsync = promisify(execFile);
const OPENCLAW_RETRY_BACKOFF_MS = 2 * 60 * 1000;
let openclawUnavailableUntil = 0;

function compactText(value, maxChars) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || maxChars <= 0) {
    return "";
  }

  return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
}

function compactHistory(history) {
  if (!Array.isArray(history) || env.openclawMaxHistoryEntries <= 0) {
    return [];
  }

  return history.slice(-env.openclawMaxHistoryEntries).map((entry) => ({
    role: entry?.role === "assistant" ? "assistant" : "user",
    content: compactText(entry?.content, 240),
  }));
}

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
      return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("No parsable JSON found");
  }
}

function extractJsonFromStdout(stdout) {
  const text = typeof stdout === "string" ? stdout.trim() : "";
  if (!text) {
    throw new Error("OpenClaw returned empty output");
  }

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }

    throw new Error("OpenClaw output is not JSON");
  }
}

function resolveOpenClawCommand(args) {
  const cwd = path.resolve(process.cwd());
  const localScript = path.resolve(cwd, "node_modules/openclaw/openclaw.mjs");

  if (existsSync(localScript)) {
    return {
      command: process.execPath,
      commandArgs: [localScript, ...args],
    };
  }

  return {
    command: env.openclawExecutable || "openclaw",
    commandArgs: args,
  };
}

async function runOpenClawJson(args) {
  if (openclawUnavailableUntil > Date.now()) {
    throw new Error("OpenClaw is temporarily unavailable");
  }

  const { command, commandArgs } = resolveOpenClawCommand(args);
  try {
    const { stdout } = await execFileAsync(command, commandArgs, {
      cwd: path.resolve(process.cwd()),
      timeout: env.openclawTimeoutMs,
      maxBuffer: 1024 * 1024,
    });

    const parsed = extractJsonFromStdout(stdout);
    openclawUnavailableUntil = 0;
    return parsed;
  } catch (error) {
    const fallbackStdout = typeof error?.stdout === "string" ? error.stdout : "";
    if (fallbackStdout.trim()) {
      const parsed = extractJsonFromStdout(fallbackStdout);
      openclawUnavailableUntil = 0;
      return parsed;
    }
    openclawUnavailableUntil = Date.now() + OPENCLAW_RETRY_BACKOFF_MS;
    throw error;
  }
}

async function runOpenClawModelPrompt(prompt) {
  const args = [
    "infer",
    "model",
    "run",
    "--local",
    "--json",
    "--model",
    env.openclawModel,
    "--prompt",
    prompt,
  ];

  const payload = await runOpenClawJson(args);

  const output = Array.isArray(payload?.outputs) && payload.outputs.length > 0
    ? payload.outputs[0]
    : null;

  const text = typeof output?.text === "string" ? output.text.trim() : "";
  if (!text) {
    throw new Error("OpenClaw did not return text output");
  }

  return text;
}

export async function getOpenClawTextResponse({
  userPrompt,
  systemPrompt = "You are COCO, a practical assistant.",
  styleInstruction = "Respond in concise English.",
} = {}) {
  const safeUserPrompt = compactText(userPrompt, 5000);
  if (!safeUserPrompt) {
    return "";
  }

  const prompt = `${systemPrompt}\n\nStyle rules:\n${styleInstruction}\n\nUser input:\n${safeUserPrompt}`;
  return runOpenClawModelPrompt(prompt);
}

export async function getOpenClawActionPlan(command, history = [], memoryContext = "") {
  const compactedHistory = compactHistory(history);
  const compactedMemory = compactText(memoryContext, env.openclawMaxMemoryChars) || "(none)";

  const plannerPrompt = `You are an AI assistant that converts user commands into structured action plans.
Return ONLY a valid JSON object, nothing else.
Do not wrap in markdown or add any commentary.

Allowed actions: chat, open_app, open_website, play_youtube, create_file, get_info, get_user_info, research_web, send_email, summarize_inbox, schedule_reminder, track_budget, track_habit

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
- Do not return extra keys.

Conversation history (last 6):
${JSON.stringify(compactedHistory, null, 2)}

Memory context:
${compactedMemory}

User command:
${command}`;

  const modelText = await runOpenClawModelPrompt(plannerPrompt);

  try {
    return parseModelJson(modelText);
  } catch {
    return {
      action: "chat",
      parameters: {
        response: modelText,
      },
    };
  }
}

export async function getOpenClawAutonomousStep(input = {}) {
  const {
    goal = "",
    history = [],
    memoryContext = "",
    completedSteps = [],
    remainingIterations = 1,
  } = input;

  const compactedHistory = compactHistory(history);
  const compactedMemory = compactText(memoryContext, env.openclawMaxMemoryChars) || "(none)";

  const plannerPrompt = `You are an autonomous AI planner for a tool-using assistant.
You work in a loop: observe previous tool outputs, decide whether goal is complete, else choose exactly one next tool action.

Return ONLY valid JSON with this exact shape:
{
  "done": true_or_false,
  "final_response": "string for the user when done, else empty string",
  "next_action": {
    "action": "chat|open_app|open_website|play_youtube|create_file|get_info|get_user_info|research_web|send_email|summarize_inbox|schedule_reminder|track_budget|track_habit",
    "parameters": {}
  }
}

Rules:
- If the goal is achieved, set done=true and provide final_response.
- If not achieved, set done=false and provide next_action.
- Only one next action per step.
- Keep actions safe and practical.
- Prefer concise parameters.

Conversation history (last 6):
${JSON.stringify(compactedHistory, null, 2)}

Memory context:
${compactedMemory}

Planner state:
${JSON.stringify({
  goal,
  remainingIterations,
  completedSteps: Array.isArray(completedSteps)
    ? completedSteps.map((step) => ({
        stepNumber: step.stepNumber,
        action: step.action,
        status: step.status,
        message: compactText(step.message, env.openclawMaxStepMessageChars),
      }))
    : [],
}, null, 2)}`;

  const modelText = await runOpenClawModelPrompt(plannerPrompt);

  try {
    const parsed = parseModelJson(modelText);
    return {
      done: Boolean(parsed?.done),
      final_response: typeof parsed?.final_response === "string" ? parsed.final_response : "",
      next_action: parsed?.next_action && typeof parsed.next_action === "object" ? parsed.next_action : null,
    };
  } catch {
    return {
      done: true,
      final_response: modelText || "Task completed.",
      next_action: null,
    };
  }
}
