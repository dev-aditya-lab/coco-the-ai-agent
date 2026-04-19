/**
 * Tool Registry
 * Centralized registry for all agent tools
 * Provides tool discovery, registration, and management
 */

import { ChatTool } from "./tools/chatTool.js";
import { OpenAppTool } from "./tools/openAppTool.js";
import { OpenWebsiteTool } from "./tools/openWebsiteTool.js";
import { PlayYoutubeTool } from "./tools/playYoutubeTool.js";
import { CreateFileTool } from "./tools/createFileTool.js";
import { GetInfoTool } from "./tools/getInfoTool.js";
import { GetUserInfoTool } from "./tools/getUserInfoTool.js";

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.toolInstances = new Map();
    this.initializeDefaultTools();
  }

  /**
   * Initialize all default tools
   */
  initializeDefaultTools() {
    this.register(new ChatTool());
    this.register(new OpenAppTool());
    this.register(new OpenWebsiteTool());
    this.register(new PlayYoutubeTool());
    this.register(new CreateFileTool());
    this.register(new GetInfoTool());
    this.register(new GetUserInfoTool());
  }

  /**
   * Register a new tool
   * @param {BaseTool} tool - Tool instance to register
   * @throws {Error} If tool name already exists
   */
  register(tool) {
    if (!tool || !tool.name) {
      throw new Error("Invalid tool: must have a name");
    }

    if (this.tools.has(tool.name)) {
      console.warn(`[tool-registry] Tool '${tool.name}' already registered, overwriting`);
    }

    this.tools.set(tool.name, tool.getDefinition());
    this.toolInstances.set(tool.name, tool);

    console.info(`[tool-registry] Registered tool: ${tool.name}`);
  }

  /**
   * Get tool definition by name
   * @param {string} name - Tool name
   * @returns {Object|null} - Tool definition or null
   */
  getToolDefinition(name) {
    return this.tools.get(name) || null;
  }

  /**
   * Get tool instance by name
   * @param {string} name - Tool name
   * @returns {BaseTool|null} - Tool instance or null
   */
  getToolInstance(name) {
    return this.toolInstances.get(name) || null;
  }

  /**
   * Get all registered tools
   * @returns {Array} - Array of tool definitions
   */
  getAllTools() {
    return Array.from(this.tools.values());
  }

  /**
   * Get all tool names
   * @returns {Array<string>} - Array of tool names
   */
  getAllToolNames() {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if tool exists
   * @param {string} name - Tool name
   * @returns {boolean}
   */
  hasTool(name) {
    return this.tools.has(name);
  }

  /**
   * Execute a tool
   * @param {string} name - Tool name
   * @param {Object} input - Tool input parameters
   * @returns {Promise<string>} - Tool result
   */
  async executeTool(name, input) {
    const tool = this.getToolInstance(name);

    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    try {
      const result = await tool.execute(input);
      return result;
    } catch (error) {
      console.error(`[tool-registry] Error executing tool '${name}':`, error.message);
      throw error;
    }
  }

  /**
   * Get tools formatted for LangChain
   * @returns {Array} - Array of tool definitions
   */
  getToolsForLangChain() {
    return Array.from(this.tools.values()).map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema,
      },
    }));
  }

  /**
   * Unregister a tool
   * @param {string} name - Tool name
   * @returns {boolean} - True if tool was unregistered
   */
  unregister(name) {
    const existed = this.tools.has(name);
    this.tools.delete(name);
    this.toolInstances.delete(name);

    if (existed) {
      console.info(`[tool-registry] Unregistered tool: ${name}`);
    }

    return existed;
  }

  /**
   * Get tool count
   * @returns {number}
   */
  getToolCount() {
    return this.tools.size;
  }

  /**
   * Clear all tools
   */
  clearAllTools() {
    this.tools.clear();
    this.toolInstances.clear();
    console.info("[tool-registry] Cleared all tools");
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();

/**
 * Get the global tool registry
 * @returns {ToolRegistry}
 */
export function getToolRegistry() {
  return toolRegistry;
}
