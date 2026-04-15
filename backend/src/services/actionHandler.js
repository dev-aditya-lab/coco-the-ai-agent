import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { APP_ALIASES, APP_REGISTRY } from "../config/appRegistry.js";
import { routeInfoResponse } from "./modelRouter.js";

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
const WEBSITE_HINT_KEYWORDS = [
  "youtube",
  "google",
  "gmail",
  "instagram",
  "linkedin",
  "twitter",
  "facebook",
  "github",
  "stackoverflow",
  "netflix",
  "amazon",
  "reddit",
];

const WEBSITE_MAP = {
  youtube: "https://youtube.com",
  google: "https://google.com",
  gmail: "https://mail.google.com",
  instagram: "https://instagram.com",
  linkedin: "https://linkedin.com",
  twitter: "https://x.com",
  x: "https://x.com",
  github: "https://github.com",
  facebook: "https://facebook.com",
};

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function resolveResponseStyle(parameters = {}) {
  return asText(parameters._response_style).toLowerCase() === "bilingual" ? "bilingual" : "english";
}

function formatByStyle(style, hinglish, english) {
  if (style === "bilingual") {
    return hinglish;
  }
  return english;
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

function normalizeOpenTarget(value) {
  return normalizeAppCandidate(value).replace(/\s+/g, " ").trim();
}

function sanitizeHostLabel(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function hostToLabel(urlLike) {
  const text = asText(urlLike);
  if (!text) {
    return "Website";
  }

  try {
    const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    const { hostname } = new URL(withScheme);
    const cleanHost = hostname.replace(/^www\./i, "");
    const primary = cleanHost.split(".")[0] || cleanHost;
    return titleCase(primary || "Website");
  } catch {
    return titleCase(normalizeOpenTarget(text) || "Website");
  }
}

function isLikelyWebsiteName(target) {
  if (!target) {
    return false;
  }

  if (target.includes(".") || target.includes("www")) {
    return true;
  }

  return WEBSITE_HINT_KEYWORDS.some((hint) => target.includes(hint));
}

function extractOpenTarget(parameters) {
  return firstNonEmpty(
    parameters.app_name,
    parameters.app,
    parameters.site,
    parameters.website,
    parameters.service,
    parameters.query,
    parameters.url
  );
}

function buildWebsiteUrl(rawTarget) {
  const source = asText(rawTarget);
  const sourceLower = source.toLowerCase();
  const target = normalizeOpenTarget(rawTarget);

  if (!source && !target) {
    return "";
  }

  const hasScheme = /^https?:\/\//i.test(sourceLower);
  if (hasScheme) {
    try {
      const parsed = new URL(source);
      const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
      if (WEBSITE_MAP[host]) {
        return WEBSITE_MAP[host];
      }
      return source;
    } catch {
      return source;
    }
  }

  const mapped = Object.entries(WEBSITE_MAP).find(([key]) => {
    if (key.length <= 2) {
      return target === key || sourceLower === key;
    }

    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exact = target === key || sourceLower === key;
    const tokenMatch = new RegExp(`\\b${escaped}\\b`).test(target) || new RegExp(`\\b${escaped}\\b`).test(sourceLower);
    return exact || tokenMatch;
  });
  if (mapped) {
    return mapped[1];
  }

  if (sourceLower.includes(".")) {
    return `https://${sanitizeHostLabel(sourceLower)}`;
  }

  if (target.includes(".")) {
    return `https://${sanitizeHostLabel(target)}`;
  }

  if (!isLikelyWebsiteName(target)) {
    return "";
  }

  const compact = sanitizeHostLabel(target.replace(/\s+/g, ""));
  if (!compact) {
    return "";
  }

  return `https://${compact}.com`;
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

async function openWebsiteAction(parameters) {
  const responseStyle = resolveResponseStyle(parameters);
  const rawTarget = firstNonEmpty(parameters.url, parameters.website, parameters.site, parameters.query, parameters.app_name, parameters.app);
  const url = buildWebsiteUrl(rawTarget);

  if (!url) {
    return {
      action: "open_website",
      status: "failed",
      message: formatByStyle(responseStyle, "Ye app ya website nahi mila, thoda clear karo.", "I could not find that app or website. Please clarify."),
      details: {
        target: rawTarget,
      },
    };
  }

  const browser = firstNonEmpty(parameters.browser, parameters.app, parameters.app_name);
  await openUrlInPreferredBrowser(url, browser);
  const label = hostToLabel(rawTarget || url);

  return {
    action: "open_website",
    status: "completed",
    message: formatByStyle(responseStyle, `${label} browser me open kar raha hoon.`, `Opening ${label} in your browser.`),
    details: {
      url,
      browser: browser || "default",
      target: rawTarget,
    },
  };
}

async function openAppAction(parameters) {
  const responseStyle = resolveResponseStyle(parameters);
  const openTarget = extractOpenTarget(parameters);
  const { key: requestedApp, command } = resolveAppName(parameters);

  if (!requestedApp || !command) {
    const fallbackUrl = buildWebsiteUrl(openTarget);
    if (fallbackUrl) {
      return openWebsiteAction({
        url: fallbackUrl,
        query: openTarget,
        browser: parameters.browser,
      });
    }

    return {
      action: "open_app",
      status: "failed",
      message: formatByStyle(responseStyle, "Ye app ya website nahi mila, thoda clear karo.", "I could not find that app or website. Please clarify."),
      details: {
        app_name: asText(parameters.app_name || parameters.app || parameters.query),
      },
    };
  }

  if (process.platform !== "win32") {
    return {
      action: "open_app",
      status: "failed",
      message: formatByStyle(responseStyle, `${titleCase(requestedApp)} system me available nahi hai.`, `${titleCase(requestedApp)} is not available on this system.`),
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
      message: formatByStyle(responseStyle, `${titleCase(requestedApp)} system me available nahi hai.`, `${titleCase(requestedApp)} is not available on this system.`),
      details: {
        app_name: requestedApp,
      },
    };
  }

  return {
    action: "open_app",
    status: "completed",
    message: formatByStyle(responseStyle, `${titleCase(requestedApp)} open kar raha hoon.`, `Opening ${titleCase(requestedApp)}.`),
    details: { app_name: requestedApp },
  };
}

async function playYoutubeAction(parameters) {
  const responseStyle = resolveResponseStyle(parameters);
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
      ? formatByStyle(responseStyle, "Song play kar raha hoon.", "Playing your requested YouTube result.")
      : formatByStyle(responseStyle, "YouTube open kar raha hoon.", "Opening YouTube."),
    details: {
      query,
      url: targetUrl,
      browser: browser || undefined,
    },
  };
}

async function createFileAction(parameters) {
  const responseStyle = resolveResponseStyle(parameters);
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
    message: formatByStyle(responseStyle, `File create kar di hai: ${filename}`, `Created file: ${filename}`),
    details: {
      filename,
      path: filePath,
      bytes: Buffer.byteLength(content, "utf8"),
    },
  };
}

async function getInfoAction(parameters) {
  const responseStyle = resolveResponseStyle(parameters);
  const query = asText(parameters.query);
  const fallbackMessage = query
    ? formatByStyle(responseStyle, `Samajh gaya. Ye short answer hai: ${query}`, `Got it. Here is a short response: ${query}`)
    : formatByStyle(responseStyle, "Main try kar sakta hoon, thoda aur detail do.", "I can help with that. Please share a bit more detail.");

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
    answer = await routeInfoResponse(query, responseStyle);
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

async function getUserInfoAction(parameters) {
  const responseStyle = resolveResponseStyle(parameters);
  const type = asText(parameters.type).toLowerCase();
  const name = asText(parameters.name);

  if (type === "name") {
    return {
      action: "get_user_info",
      status: "completed",
      message: name
        ? formatByStyle(responseStyle, `Tumhara naam ${name} hai`, `Your name is ${name}`)
        : formatByStyle(responseStyle, "Mujhe abhi tak tumhara naam nahi pata", "I do not know your name yet"),
      details: {
        type: "name",
        found: Boolean(name),
      },
    };
  }

  return {
    action: "get_user_info",
    status: "completed",
    message: formatByStyle(responseStyle, "Mujhe abhi tak tumhari yeh info nahi pata", "I do not have that information yet"),
    details: {
      type: type || "unknown",
      found: false,
    },
  };
}

async function chatAction(parameters) {
  const responseStyle = resolveResponseStyle(parameters);
  const response = firstNonEmpty(parameters.response, parameters.message);

  return {
    action: "chat",
    status: "completed",
    message: response || formatByStyle(responseStyle, "Hello, kaise help kar sakta hoon?", "Hello, how can I help?"),
    details: {
      mode: "conversation",
    },
  };
}

const actionMap = {
  open_app: openAppAction,
  open_website: openWebsiteAction,
  play_youtube: playYoutubeAction,
  create_file: createFileAction,
  get_info: getInfoAction,
  get_user_info: getUserInfoAction,
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