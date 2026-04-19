/**
 * Agent Executor Service
 * Core LangChain agent executor handling tool selection and execution
 */

import { getToolRegistry } from "../toolRegistry.js";
import { getGroqInstance, getGroqActionPlan } from "./groqService.js";

class AgentExecutor {
  constructor(options = {}) {
    this.registry = getToolRegistry();
    this.maxIterations = options.maxIterations || 10;
    this.verbose = options.verbose || false;
    this.llmOptions = options.llmOptions || {};
    this.llm = null;
  }

  /**
   * Log message if verbose mode is enabled
   * @param {string} message - Message to log
   */
  log(message) {
    if (this.verbose) {
      console.log(`[agent-executor] ${message}`);
    }
  }

  /**
   * Normalize and detect response style from command
   * @param {string} command - User command
   * @returns {string} - 'bilingual' or 'english'
   */
  detectResponseStyle(command) {
    const HINGLISH_HINT_REGEX = /[\u0900-\u097f]|\b(kya|kaise|kyu|kyon|mera|meri|mujhe|tum|tumhara|aap|aapka|hai|haan|nahi|kar|karo|batao|samjhao|main|mein|abhi|thoda|namaste|haanji|theek|thik)\b/i;
    return HINGLISH_HINT_REGEX.test(command) ? "bilingual" : "english";
  }

  /**
   * Execute agent with user input
   * @param {string} userInput - User command or question
   * @param {Array} history - Conversation history
   * @returns {Promise<Object>} - {action, result, metadata}
   */
  async execute(userInput, history = [], memoryContext = "") {
    const startTime = Date.now();
    this.log(`Executing: "${userInput}"`);

    try {
      if (!this.llm) {
        this.llm = getGroqInstance(this.llmOptions);
      }

      // Detect response style
      const responseStyle = this.detectResponseStyle(userInput);
      this.log(`Detected style: ${responseStyle}`);

      // Get action plan from LLM
      const actionPlan = await getGroqActionPlan(userInput, history, memoryContext);
      this.log(`Action plan: ${JSON.stringify(actionPlan)}`);

      const action = actionPlan.action || "chat";
      const parameters = actionPlan.parameters || {};

      if (action === "chat" && !parameters.message) {
        parameters.message = userInput;
      }

      if (action === "get_info" && !parameters.query) {
        parameters.query = userInput;
      }

      if (action === "get_user_info" && !parameters.type) {
        parameters.type = "name";
      }

      if (action === "research_web" && !parameters.query) {
        parameters.query = userInput;
      }

      if (memoryContext) {
        parameters.memory_context = memoryContext;
      }

      // Add response style to parameters
      parameters._response_style = responseStyle;
      parameters.style = responseStyle;

      // Check if tool exists
      if (!this.registry.hasTool(action)) {
        this.log(`Tool not found: ${action}, defaulting to chat`);
        return {
          action: "chat",
          result: `Sorry, I don't know how to '${action}'.`,
          metadata: {
            duration: Date.now() - startTime,
            style: responseStyle,
            error: "Tool not found",
          },
        };
      }

      // Execute tool
      this.log(`Executing tool: ${action}`);
      const result = await this.registry.executeTool(action, parameters);

      return {
        action,
        result,
        metadata: {
          duration: Date.now() - startTime,
          style: responseStyle,
          parameters,
        },
      };
    } catch (error) {
      console.error("[agent-executor] Error:", error.message);

      return {
        action: "error",
        result: `Sorry, something went wrong: ${error.message}`,
        metadata: {
          duration: Date.now() - startTime,
          error: error.message,
        },
      };
    }
  }

  /**
   * Execute with streaming response
   * @param {string} userInput - User command
   * @param {Function} onChunk - Callback for streaming chunks
   * @param {Array} history - Conversation history
   * @returns {Promise<Object>}
   */
  async executeStreaming(userInput, onChunk, history = []) {
    try {
      // For now, execute normally and send result
      const result = await this.execute(userInput, history);

      if (onChunk) {
        onChunk({
          type: "result",
          data: result.result,
        });
      }

      return result;
    } catch (error) {
      console.error("[agent-executor] Streaming error:", error.message);
      throw error;
    }
  }

  /**
   * Get available tools
   * @returns {Array} - List of available tools
   */
  getAvailableTools() {
    return this.registry.getAllTools();
  }

  /**
   * Get tool info by name
   * @param {string} toolName - Tool name
   * @returns {Object|null} - Tool definition
   */
  getToolInfo(toolName) {
    return this.registry.getToolDefinition(toolName);
  }

  /**
   * Register custom tool
   * @param {BaseTool} tool - Tool instance
   */
  registerTool(tool) {
    this.registry.register(tool);
  }

  /**
   * Unregister tool
   * @param {string} toolName - Tool name
   */
  unregisterTool(toolName) {
    this.registry.unregister(toolName);
  }
}

// Export singleton instance
let executorInstance = null;

/**
 * Get or create agent executor instance
 * @param {Object} options - Configuration options
 * @returns {AgentExecutor}
 */
export function getAgentExecutor(options = {}) {
  if (!executorInstance) {
    executorInstance = new AgentExecutor(options);
  }
  return executorInstance;
}

/**
 * Create a new agent executor instance
 * @param {Object} options - Configuration options
 * @returns {AgentExecutor}
 */
export function createAgentExecutor(options = {}) {
  return new AgentExecutor(options);
}

/**
 * Reset executor instance
 */
export function resetExecutor() {
  executorInstance = null;
}
