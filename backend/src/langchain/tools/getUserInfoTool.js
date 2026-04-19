/**
 * Get User Info Tool - Retrieve user profile information
 * Handles name lookup and user data retrieval
 */

import { BaseTool } from "./baseTool.js";
import { recallMemory } from "../services/hindsightService.js";
import { env } from "../../config/env.js";

export class GetUserInfoTool extends BaseTool {
  constructor() {
    super(
      "get_user_info",
      "Get user profile information like name, email, or other personal details.",
      {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["name", "email", "phone", "profile"],
            description: "Type of user information to retrieve",
          },
          style: {
            type: "string",
            enum: ["bilingual", "english"],
            description: "Response style",
          },
        },
        required: ["type"],
      }
    );
  }

  async execute(input) {
    const infoType = this.normalizeString(input.type).toLowerCase();
    const style = input.style || "english";

    // Get info from environment or memory
    try {
      let userInfo = "";

      switch (infoType) {
        case "name":
          userInfo = this.normalizeString(input.name) || env.cocoUserName || "";

          if (!this.normalizeString(userInfo)) {
            const recallResponse = await recallMemory("What is the user's name?", {
              types: ["world", "observation", "experience"],
              budget: "low",
              maxTokens: 600,
            });
            userInfo = this.normalizeString(recallResponse?.results?.[0]?.text) || "Friend";
          }
          break;

        case "email":
          userInfo = env.cocoUserEmail || "email@example.com";
          break;

        case "phone":
          userInfo = env.cocoUserPhone || "Not set";
          break;

        case "profile":
          userInfo = {
            name: env.cocoUserName || "Friend",
            email: env.cocoUserEmail || "Not set",
            phone: env.cocoUserPhone || "Not set",
          };

          if (userInfo.name === "Friend") {
            const recallResponse = await recallMemory("Tell me about the user's profile", {
              types: ["world", "observation", "experience"],
              budget: "low",
              maxTokens: 800,
            });

            const profileHint = this.normalizeString(recallResponse?.results?.[0]?.text);
            if (profileHint) {
              userInfo = profileHint;
            }
          }
          break;

        default:
          return this.formatByStyle(
            style,
            "Us info type ke baare mein maloom nahi.",
            "I don't know about that type of information."
          );
      }

      if (typeof userInfo === "object") {
        userInfo = JSON.stringify(userInfo, null, 2);
      }

      return userInfo || this.formatByStyle(
        style,
        "Ye information set nahi hai.",
        "That information is not set."
      );
    } catch (error) {
      console.error("[get-user-info-tool] Error:", error.message);
      return this.formatByStyle(
        style,
        "User info retrieve nahi ho paya.",
        "Could not retrieve user information."
      );
    }
  }
}
