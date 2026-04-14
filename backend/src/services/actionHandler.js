import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { env } from "../config/env.js";

const execAsync = promisify(exec);

const APP_COMMANDS_WINDOWS = {
  chrome: "start chrome",
  "google chrome": "start chrome",
  vscode: "start code",
  "visual studio code": "start code",
  notepad: "start notepad",
  calculator: "start calc",
};

const ALLOWED_FILE_EXTENSIONS = new Set([".txt", ".md", ".js", ".ts", ".json", ".py", ".html", ".css"]);

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
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
  const requestedApp = asText(parameters.app).toLowerCase();
  if (!requestedApp) {
    throw new Error("Missing app parameter for open_app.");
  }

  if (process.platform !== "win32") {
    throw new Error("open_app currently supports Windows only.");
  }

  const command = APP_COMMANDS_WINDOWS[requestedApp];
  if (!command) {
    throw new Error(`Unsupported app: ${requestedApp}`);
  }

  await execAsync(command);

  return {
    action: "open_app",
    status: "completed",
    message: `Opened ${requestedApp}.`,
    details: { app: requestedApp },
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