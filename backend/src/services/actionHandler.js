import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { APP_ALIASES, APP_REGISTRY } from "../config/appRegistry.js";
import { requestInfoText } from "./aiService.js";

const execAsync = promisify(exec);

const FILLER_PATTERNS = [
  /\bcoco\b/g,
  /\bjarvis\b/g,
  /\bplease\b/g,
  /\bkholna\b/g,
  /\bkhol\b/g,
  /\bkhol do\b/g,
  /\bchalao\b/g,
  /\bopen karo\b/g,
  /\bopen\b/g,
  /\bkaro\b/g,
  /\bye\b/g,
  /\bapp\b/g,
  /\blaunch\b/g,
  /\bstart\b/g,
];

const ALLOWED_FILE_EXTENSIONS = new Set([".txt", ".md", ".js", ".ts", ".json", ".py", ".html", ".css"]);

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function titleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeAppCandidate(value) {
  let normalized = asText(value).toLowerCase();

  normalized = normalized.replace(/[.,!?]/g, " ");

  for (const pattern of FILLER_PATTERNS) {
    normalized = normalized.replace(pattern, " ");
  }

  normalized = normalized.replace(/\s+/g, " ").trim();

  for (const [alias, canonical] of Object.entries(APP_ALIASES)) {
    if (normalized === alias) {
      return canonical;
    }
  }

  return normalized;
}

function resolveAppName(parameters) {
  const appName = normalizeAppCandidate(parameters.app_name || parameters.app || "");
  const queryName = normalizeAppCandidate(parameters.query || "");

  const candidate = appName || queryName;
  if (!candidate) {
    return { key: "", command: "" };
  }

  if (APP_REGISTRY[candidate]) {
    return { key: candidate, command: APP_REGISTRY[candidate] };
  }

  const partialKey = Object.keys(APP_REGISTRY).find(
    (key) => key.includes(candidate) || candidate.includes(key)
  );

  if (partialKey) {
    return { key: partialKey, command: APP_REGISTRY[partialKey] };
  }

  return { key: "", command: "" };
}

function sanitizeFilename(rawFilename) {
  const cleaned = asText(rawFilename).replace(/\\/g, "/");
  const baseName = path.posix.basename(cleaned);
  const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (!safeName || safeName === "." || safeName === "..") {
    return "";
  }

  const extension = path.extname(safeName).toLowerCase();
  if (!ALLOWED_FILE_EXTENSIONS.has(extension)) {
    return "";
  }

  return safeName;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = asText(value);
    if (text) {
      return text;
    }
  }

  return "";
}

function extractYoutubeQuery(parameters) {
  return firstNonEmpty(
    parameters.query,
    parameters.search,
    parameters.song,
    parameters.video,
    parameters.prompt,
    parameters.text,
    parameters.topic
  );
}

function extractFilename(parameters) {
  const direct = firstNonEmpty(
    parameters.filename,
    parameters.file_name,
    parameters.file,
    parameters.name,
    parameters.path
  );

  if (direct) {
    return direct;
  }

  const query = firstNonEmpty(parameters.query, parameters.prompt, parameters.text);
  if (!query) {
    return "";
  }

  const match = query.match(/([a-zA-Z0-9._-]+\.(txt|md|js|ts|json|py|html|css))\b/i);
  return match ? match[1] : "";
}

function extractFileContent(parameters) {
  return firstNonEmpty(parameters.content, parameters.code, parameters.body, parameters.text);
}

function openUrlCommand(url) {
  if (process.platform === "win32") {
    return `start "" "${url}"`;
  }

  if (process.platform === "darwin") {
    return `open "${url}"`;
  }

  return `xdg-open "${url}"`;
}

async function openUrlInPreferredBrowser(url, browser) {
  const preferredBrowser = asText(browser).toLowerCase();

  if (process.platform === "win32" && preferredBrowser.includes("chrome")) {
    await execAsync(`start chrome "${url}"`);
    return;
  }

  await execAsync(openUrlCommand(url));
}

async function openAppAction(parameters) {
  const { key: requestedApp, command } = resolveAppName(parameters);

  if (!requestedApp || !command) {
    return {
      action: "open_app",
      status: "failed",
      message: "Application not installed or not recognized",
      details: {
        app_name: asText(parameters.app_name || parameters.app || parameters.query),
      },
    };
  }

  if (process.platform !== "win32") {
    return {
      action: "open_app",
      status: "failed",
      message: `${titleCase(requestedApp)} is not installed on your system`,
      details: {
        app_name: requestedApp,
      },
    };
  }

  try {
    await execAsync(command);
  } catch {
    return {
      action: "open_app",
      status: "failed",
      message: `${titleCase(requestedApp)} is not installed on your system`,
      details: {
        app_name: requestedApp,
      },
    };
  }

  return {
    action: "open_app",
    status: "completed",
    message: `Opening ${titleCase(requestedApp)}...`,
    details: { app_name: requestedApp },
  };
}

async function playYoutubeAction(parameters) {
  const query = extractYoutubeQuery(parameters);
  const browser = firstNonEmpty(parameters.browser, parameters.app, parameters.app_name);
  const targetUrl = query
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    : "https://www.youtube.com";

  await openUrlInPreferredBrowser(targetUrl, browser);

  return {
    action: "play_youtube",
    status: "completed",
    message: query
      ? "Opened YouTube search in your browser."
      : "Opened YouTube in your browser.",
    details: {
      query,
      url: targetUrl,
      browser: browser || undefined,
    },
  };
}

async function createFileAction(parameters) {
  const filename = sanitizeFilename(extractFilename(parameters));
  if (!filename) {
    throw new Error("Invalid or missing filename for create_file.");
  }

  const content = extractFileContent(parameters);

  const outputDir = path.resolve(process.cwd(), env.actionOutputDir);
  await mkdir(outputDir, { recursive: true });

  const filePath = path.join(outputDir, filename);
  await writeFile(filePath, content, "utf8");

  return {
    action: "create_file",
    status: "completed",
    message: `File created: ${filename}`,
    details: {
      filename,
      path: filePath,
      bytes: Buffer.byteLength(content, "utf8"),
    },
  };
}

async function getInfoAction(parameters) {
  const query = asText(parameters.query);
  const fallbackMessage = query
    ? `I could not execute an action, but here is what I found: ${query}`
    : "I could not execute an action for this command.";

  if (!query || !env.groqApiKey) {
    return {
      action: "get_info",
      status: "completed",
      message: fallbackMessage,
      details: {
        query,
      },
    };
  }

  let answer = "";

  try {
    answer = await requestInfoText(query);
  } catch {
    answer = fallbackMessage;
  }

  return {
    action: "get_info",
    status: "completed",
    message: answer || fallbackMessage,
    details: {
      query,
    },
  };
}

async function chatAction(parameters) {
  const response = firstNonEmpty(parameters.response, parameters.message);

  return {
    action: "chat",
    status: "completed",
    message: response || "Hello, how can I assist you?",
    details: {
      mode: "conversation",
    },
  };
}

const actionMap = {
  open_app: openAppAction,
  play_youtube: playYoutubeAction,
  create_file: createFileAction,
  get_info: getInfoAction,
  chat: chatAction,
};

export async function executeAction(actionPayload) {
  const action = asText(actionPayload?.action);
  const parameters = actionPayload?.parameters && typeof actionPayload.parameters === "object"
    ? actionPayload.parameters
    : {};

  const handler = actionMap[action] || actionMap.get_info;

  console.info("[action] execute_start", { action, parameters });

  try {
    const result = await handler(parameters);
    console.info("[action] execute_success", { action: result.action, result });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown action execution error.";
    console.error("[action] execute_failure", { action, error: errorMessage });

    return {
      action: action || "get_info",
      status: "failed",
      message: errorMessage,
      details: {
        parameters,
      },
    };
  }
}