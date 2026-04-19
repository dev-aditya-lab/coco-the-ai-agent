/**
 * Open App Tool - Launch applications on the system
 * Handles cross-platform app opening with alias resolution
 */

import { BaseTool } from "./baseTool.js";
import { APP_ALIASES, APP_REGISTRY } from "../../config/appRegistry.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export class OpenAppTool extends BaseTool {
  constructor() {
    super(
      "open_app",
      "Open an application or program on the user's system. Examples: VSCode, Chrome, Figma, Notepad, etc.",
      {
        type: "object",
        properties: {
          app_name: {
            type: "string",
            description: "Name of the application to open (e.g., 'vscode', 'chrome', 'figma')",
          },
          style: {
            type: "string",
            enum: ["bilingual", "english"],
            description: "Response style",
          },
        },
        required: ["app_name"],
      }
    );
  }

  normalizeAppName(name) {
    return this.normalizeString(name).toLowerCase().replace(/\s+/g, " ");
  }

  resolveAppCommand(appName) {
    const normalized = this.normalizeAppName(appName);

    // Check alias mapping
    if (APP_ALIASES[normalized]) {
      return APP_REGISTRY[APP_ALIASES[normalized]];
    }

    // Direct registry lookup
    if (APP_REGISTRY[normalized]) {
      return APP_REGISTRY[normalized];
    }

    return null;
  }

  async execute(input) {
    const appName = this.normalizeString(input.app_name);
    const style = input.style || "english";

    if (!appName) {
      return this.formatByStyle(
        style,
        "Kaun sa app kholna hai?",
        "Which app would you like to open?"
      );
    }

    const appCommand = this.resolveAppCommand(appName);

    if (!appCommand) {
      return this.formatByStyle(
        style,
        `${appName} app nahin mila.`,
        `${appName} app not found.`
      );
    }

    try {
      // Execute app launch
      if (typeof appCommand === "string") {
        await execAsync(appCommand);
      } else if (appCommand.command) {
        await execAsync(appCommand.command);
      }

      const normalizedName = this.normalizeAppName(appName);
      const appLabel = normalizedName
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      const wasEmptyAction =
        normalizedName.includes("empty")
        || normalizedName.includes("clear")
        || normalizedName.includes("khali")
        || (typeof appCommand === "string" && appCommand.includes("Clear-RecycleBin"));

      if (wasEmptyAction) {
        return {
          message: this.formatByStyle(
          style,
          "Recycle Bin saaf kar diya.",
          "Recycle Bin has been cleared."
          ),
          type: "open-app",
          app: appLabel,
          command: typeof appCommand === "string" ? appCommand : appCommand?.command || "",
        };
      }

      return {
        message: this.formatByStyle(
        style,
        `${appLabel} khul gaya.`,
        `Opening ${appLabel}.`
        ),
        type: "open-app",
        app: appLabel,
        command: typeof appCommand === "string" ? appCommand : appCommand?.command || "",
      };
    } catch (error) {
      console.error("[open-app-tool] Error:", error.message);
      return this.formatByStyle(
        style,
        `${appName} nahi khul paya.`,
        `Could not open ${appName}.`
      );
    }
  }
}
