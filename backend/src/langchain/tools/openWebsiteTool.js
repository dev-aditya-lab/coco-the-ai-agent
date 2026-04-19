/**
 * Open Website Tool - Navigate to websites
 * Handles URL resolution and website mapping
 */

import { BaseTool } from "./baseTool.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

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
  reddit: "https://reddit.com",
  stackoverflow: "https://stackoverflow.com",
  netflix: "https://netflix.com",
  amazon: "https://amazon.com",
};

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

export class OpenWebsiteTool extends BaseTool {
  constructor() {
    super(
      "open_website",
      "Open a website or URL in the default browser. Examples: 'youtube', 'google', 'github.com', etc.",
      {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Website name, domain, or full URL",
          },
          style: {
            type: "string",
            enum: ["bilingual", "english"],
            description: "Response style",
          },
        },
        required: ["url"],
      }
    );
  }

  sanitizeHostLabel(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "")
      .replace(/\.+/g, ".")
      .replace(/^\.+|\.+$/g, "");
  }

  buildWebsiteUrl(rawTarget) {
    const source = this.normalizeString(rawTarget);
    const sourceLower = source.toLowerCase();

    if (!source) {
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

    // Check mapped websites
    const mapped = Object.entries(WEBSITE_MAP).find(([key]) => {
      const exact = source === key || sourceLower === key;
      const tokenMatch = new RegExp(`\\b${key}\\b`).test(sourceLower);
      return exact || tokenMatch;
    });

    if (mapped) {
      return mapped[1];
    }

    // Handle domain-like inputs
    if (sourceLower.includes(".")) {
      return `https://${this.sanitizeHostLabel(sourceLower)}`;
    }

    // Check if it looks like a website
    if (WEBSITE_HINT_KEYWORDS.some((hint) => sourceLower.includes(hint))) {
      return `https://${this.sanitizeHostLabel(sourceLower)}`;
    }

    return "";
  }

  async execute(input) {
    const urlInput = this.normalizeString(input.url);
    const style = input.style || "english";

    if (!urlInput) {
      return this.formatByStyle(
        style,
        "Kaun si website khol du?",
        "Which website would you like to open?"
      );
    }

    const url = this.buildWebsiteUrl(urlInput);

    if (!url) {
      return this.formatByStyle(
        style,
        `${urlInput} valid nahi hai.`,
        `${urlInput} doesn't look like a valid website.`
      );
    }

    try {
      if (process.platform === "win32") {
        // Prefer Chrome on Windows, then fallback to the default browser.
        try {
          await execAsync(`cmd /c start "" chrome "${url}"`);
        } catch {
          await execAsync(`cmd /c start "" "${url}"`);
        }
      } else if (process.platform === "darwin") {
        // Prefer Google Chrome on macOS, fallback to default browser.
        try {
          await execAsync(`open -a "Google Chrome" "${url}"`);
        } catch {
          await execAsync(`open "${url}"`);
        }
      } else {
        // Linux: try common Chrome binaries first, then xdg-open.
        try {
          await execAsync(`google-chrome "${url}"`);
        } catch {
          try {
            await execAsync(`chromium-browser "${url}"`);
          } catch {
            await execAsync(`xdg-open "${url}"`);
          }
        }
      }

      const message = this.formatByStyle(
        style,
        `${urlInput} khul gaya.`,
        `Opening ${urlInput}.`
      );

      return {
        message,
        type: "website",
        input: urlInput,
        url,
      };
    } catch (error) {
      console.error("[open-website-tool] Error:", error.message);
      return this.formatByStyle(
        style,
        "Website nahi khul paya.",
        "Could not open the website."
      );
    }
  }
}
