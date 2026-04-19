/**
 * Play YouTube Tool - Search and play videos on YouTube
 * Handles video search and playback
 */

import { BaseTool } from "./baseTool.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export class PlayYoutubeTool extends BaseTool {
  constructor() {
    super(
      "play_youtube",
      "Search for and play videos on YouTube. Examples: 'play Coldplay songs', 'play tutorials'.",
      {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Video title or search query",
          },
          style: {
            type: "string",
            enum: ["bilingual", "english"],
            description: "Response style",
          },
        },
        required: ["query"],
      }
    );
  }

  buildYouTubeSearchUrl(query) {
    const encoded = encodeURIComponent(this.normalizeString(query));
    return `https://www.youtube.com/results?search_query=${encoded}`;
  }

  async execute(input) {
    const query = this.normalizeString(input.query);
    const style = input.style || "english";

    if (!query) {
      return this.formatByStyle(
        style,
        "Kya search karu YouTube pe?",
        "What would you like to search on YouTube?"
      );
    }

    try {
      const url = this.buildYouTubeSearchUrl(query);

      // Open YouTube search in default browser
      const openCommand = process.platform === "win32"
        ? `start "${url}"`
        : process.platform === "darwin"
          ? `open "${url}"`
          : `xdg-open "${url}"`;

      execAsync(openCommand, { detached: true });

      return this.formatByStyle(
        style,
        `"${query}" YouTube pe search kar raha hoon.`,
        `Searching for "${query}" on YouTube.`
      );
    } catch (error) {
      console.error("[play-youtube-tool] Error:", error.message);
      return this.formatByStyle(
        style,
        "YouTube nahi khul paya.",
        "Could not open YouTube."
      );
    }
  }
}
