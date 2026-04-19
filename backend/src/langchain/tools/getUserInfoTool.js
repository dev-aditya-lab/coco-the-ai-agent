/**
 * Get User Info Tool - Retrieve user profile information
 * Handles name lookup and user data retrieval
 */

import { BaseTool } from "./baseTool.js";

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
          userInfo = this.normalizeString(input.name) || process.env.COCO_USER_NAME || "Friend";
          break;

        case "email":
          userInfo = process.env.COCO_USER_EMAIL || "email@example.com";
          break;

        case "phone":
          userInfo = process.env.COCO_USER_PHONE || "Not set";
          break;

        case "profile":
          userInfo = {
            name: process.env.COCO_USER_NAME || "Friend",
            email: process.env.COCO_USER_EMAIL || "Not set",
            phone: process.env.COCO_USER_PHONE || "Not set",
          };
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
