import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { env } from "../config/env.js";
import { APP_ALIASES, APP_REGISTRY } from "../config/appRegistry.js";

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
  const query = asText(parameters.query);
  if (!query) {
    throw new Error("Missing query parameter for play_youtube.");
  }

  const browser = await puppeteer.launch({
    headless: env.puppeteerHeadless,
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("ytd-video-renderer a#thumbnail", { timeout: 15000 });

    const videoUrl = await page.$eval(
      "ytd-video-renderer a#thumbnail",
      (anchor) => anchor.getAttribute("href") || ""
    );

    if (!videoUrl) {
      throw new Error("Could not find a playable YouTube result.");
    }

    await page.goto(`https://www.youtube.com${videoUrl}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    return {
      action: "play_youtube",
      status: "completed",
      message: "Playing first YouTube result.",
      details: {
        query,
        videoUrl: `https://www.youtube.com${videoUrl}`,
      },
    };
  } finally {
    if (env.puppeteerHeadless) {
      await browser.close();
    }
  }
}

async function createFileAction(parameters) {
  const filename = sanitizeFilename(parameters.filename);
  if (!filename) {
    throw new Error("Invalid or missing filename for create_file.");
  }

  const content = typeof parameters.content === "string" ? parameters.content : "";

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

  return {
    action: "get_info",
    status: "completed",
    message: "No executable action was selected. Returning informational response.",
    details: {
      query,
    },
  };
}

const actionMap = {
  open_app: openAppAction,
  play_youtube: playYoutubeAction,
  create_file: createFileAction,
  get_info: getInfoAction,
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