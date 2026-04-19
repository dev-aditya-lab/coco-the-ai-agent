/**
 * Create File Tool - Create files on the system
 * Handles file creation with content in various formats
 */

import { BaseTool } from "./baseTool.js";
import { env } from "../../config/env.js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_FILE_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".js",
  ".ts",
  ".json",
  ".py",
  ".html",
  ".css",
  ".jsx",
  ".tsx",
  ".sql",
  ".yaml",
  ".yml",
  ".env",
  ".sh",
  ".xml",
]);

const DEFAULT_FILE_DIR = path.isAbsolute(env.cocoFilesDir)
  ? env.cocoFilesDir
  : path.join(process.cwd(), env.cocoFilesDir);

export class CreateFileTool extends BaseTool {
  constructor() {
    super(
      "create_file",
      "Create a new file with specified content. Supports text, code, markdown, and other formats.",
      {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description: "Name of the file to create (e.g., 'notes.txt', 'script.js')",
          },
          content: {
            type: "string",
            description: "Content to write to the file",
          },
          style: {
            type: "string",
            enum: ["bilingual", "english"],
            description: "Response style",
          },
        },
        required: ["filename", "content"],
      }
    );
  }

  isValidFileName(filename) {
    if (!filename) return false;

    // Check for invalid characters
    if (/[<>:"|?*]/.test(filename)) return false;

    // Check extension
    const ext = path.extname(filename).toLowerCase();
    if (ext && !ALLOWED_FILE_EXTENSIONS.has(ext)) return false;

    return true;
  }

  async execute(input) {
    const filename = this.normalizeString(input.filename);
    const content = this.normalizeString(input.content) || "";
    const style = input.style || "english";

    if (!filename) {
      return this.formatByStyle(
        style,
        "File ka naam batao.",
        "Please provide a filename."
      );
    }

    if (!this.isValidFileName(filename)) {
      return this.formatByStyle(
        style,
        `${filename} valid filename nahi hai.`,
        `${filename} is not a valid filename.`
      );
    }

    try {
      // Create directory if it doesn't exist
      await mkdir(DEFAULT_FILE_DIR, { recursive: true });

      // Create full file path
      const filePath = path.join(DEFAULT_FILE_DIR, filename);

      // Security: ensure path is within DEFAULT_FILE_DIR
      const resolvedPath = path.resolve(filePath);
      const resolvedDir = path.resolve(DEFAULT_FILE_DIR);

      if (!resolvedPath.startsWith(resolvedDir)) {
        return this.formatByStyle(
          style,
          "File path valid nahi hai.",
          "Invalid file path."
        );
      }

      // Write file
      await writeFile(resolvedPath, content, "utf-8");

      return this.formatByStyle(
        style,
        `${filename} create ho gaya.`,
        `File ${filename} created successfully.`
      );
    } catch (error) {
      console.error("[create-file-tool] Error:", error.message);
      return this.formatByStyle(
        style,
        `${filename} create nahi ho paya.`,
        `Could not create file ${filename}.`
      );
    }
  }
}
