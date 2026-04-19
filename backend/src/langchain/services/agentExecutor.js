/**
 * Agent Executor Service
 * Core LangChain agent executor handling tool selection and execution
 */

import { getToolRegistry } from "../toolRegistry.js";
import { env } from "../../config/env.js";
import { getGroqActionPlan, getGroqAutonomousStep } from "./groqService.js";

class AgentExecutor {
  constructor(options = {}) {
    this.registry = getToolRegistry();
    this.maxIterations = options.maxIterations || 8;
    this.plannerEnabled = options.plannerEnabled ?? true;
    this.autonomousEnabled = options.autonomousEnabled ?? env.agentAutonomousMode;
    this.maxAutonomousIterations = options.maxAutonomousIterations || env.agentAutonomousMaxIterations || 4;
    this.verbose = options.verbose || false;
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

  isGreetingIntent(command) {
    const normalized = typeof command === "string" ? command.trim().toLowerCase() : "";
    if (!normalized) {
      return false;
    }

    if (/^(hi|hii|hello|hey|yo|hola|namaste)(\s+coco)?[!,.\s]*$/.test(normalized)) {
      return true;
    }

    const actionKeyword = /\b(open|play|create|get|send|track|summarize|research|search|write|delete|remove|schedule)\b/;
    const namedGreeting = /^(hi|hii|hello|hey)\s+[a-z][a-z0-9_-]{1,20}[!,.?\s]*$/;

    return namedGreeting.test(normalized) && !actionKeyword.test(normalized);
  }

  buildGreetingResponse(responseStyle) {
    return responseStyle === "bilingual"
      ? "Hi! Main COCO hoon. Batao kya karna hai?"
      : "Hi! I'm COCO. What can I help you with?";
  }

  isSmallTalkIntent(command) {
    const normalized = typeof command === "string" ? command.trim().toLowerCase() : "";
    if (!normalized) {
      return false;
    }

    return [
      /\bhow are you\b/,
      /\bhow are you today\b/,
      /\bwhat'?s up\b/,
      /\bhow is it going\b/,
      /\bare you there\b/,
      /\bgood morning\b/,
      /\bgood evening\b/,
    ].some((pattern) => pattern.test(normalized));
  }

  buildSmallTalkResponse(responseStyle) {
    return responseStyle === "bilingual"
      ? "Main achha hoon, thanks! Main ready hoon, bolo kya help chahiye."
      : "I'm doing great, thanks! I'm ready to help with whatever you need.";
  }

  normalizePlan(actionPlan) {
    if (Array.isArray(actionPlan?.actions) && actionPlan.actions.length > 0) {
      return actionPlan.actions
        .slice(0, this.maxIterations)
        .map((step) => ({
          action: step?.action || "chat",
          parameters: step?.parameters && typeof step.parameters === "object" ? { ...step.parameters } : {},
        }));
    }

    return [
      {
        action: actionPlan?.action || "chat",
        parameters: actionPlan?.parameters && typeof actionPlan.parameters === "object" ? { ...actionPlan.parameters } : {},
      },
    ];
  }

  prepareParameters(action, parameters, userInput, memoryContext, responseStyle, history = []) {
    const next = parameters && typeof parameters === "object" ? { ...parameters } : {};

    if (action === "chat" && !next.message) {
      next.message = userInput;
    }

    if (action === "get_info" && !next.query) {
      next.query = userInput;
    }

    if (action === "get_user_info" && !next.type) {
      next.type = "name";
    }

    if (action === "research_web" && !next.query) {
      next.query = userInput;
    }

    if (action === "send_email" && !next.mode) {
      next.mode = "draft";
    }

    if (action === "schedule_reminder" && !next.title) {
      next.title = userInput;
    }

    if (action === "track_budget" && !next.category) {
      next.category = "general";
    }

    if (action === "track_habit" && !next.habit) {
      next.habit = userInput;
    }

    if (memoryContext) {
      next.memory_context = memoryContext;
    }

    if (Array.isArray(history) && history.length > 0 && action === "chat") {
      next.conversationHistory = history.slice(-6);
    }

    next._response_style = responseStyle;
    next.style = responseStyle;

    return next;
  }

  normalizeToolResult(result) {
    if (result && typeof result === "object") {
      const message = typeof result.message === "string" && result.message.trim()
        ? result.message
        : JSON.stringify(result);
      return {
        message,
        details: result,
      };
    }

    const message = typeof result === "string" && result.trim() ? result : "Done.";
    return {
      message,
      details: {},
    };
  }

  async executeSingleStep(action, parameters, stepNumber, executedSteps) {
    if (!this.registry.hasTool(action)) {
      const toolError = `Sorry, I don't know how to '${action}'.`;
      executedSteps.push({
        stepNumber,
        action,
        status: "failed",
        message: toolError,
        parameters,
        details: {},
      });

      return {
        ok: false,
        action,
        message: toolError,
        details: {},
      };
    }

    this.log(`Executing tool: ${action}`);
    const rawResult = await this.registry.executeTool(action, parameters);
    const normalized = this.normalizeToolResult(rawResult);

    executedSteps.push({
      stepNumber,
      action,
      status: "completed",
      message: normalized.message,
      parameters,
      details: normalized.details,
    });

    return {
      ok: true,
      action,
      message: normalized.message,
      details: normalized.details,
    };
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
      const responseStyle = this.detectResponseStyle(userInput);
      this.log(`Detected style: ${responseStyle}`);

      if (this.isGreetingIntent(userInput) || this.isSmallTalkIntent(userInput)) {
        return {
          action: "chat",
          result: this.isGreetingIntent(userInput)
            ? this.buildGreetingResponse(responseStyle)
            : this.buildSmallTalkResponse(responseStyle),
          metadata: {
            duration: Date.now() - startTime,
            style: responseStyle,
            parameters: {
              message: userInput,
            },
            executedSteps: [],
            autonomousMode: false,
            planner: "shortcut",
            shortcut: this.isGreetingIntent(userInput) ? "greeting" : "smalltalk",
          },
        };
      }

      if (this.autonomousEnabled) {
        const executedSteps = [];
        let lastAction = "chat";
        let lastResult = "";
        let lastParameters = {};

        for (let iteration = 0; iteration < this.maxAutonomousIterations; iteration += 1) {
          const stepPlan = await getGroqAutonomousStep({
            goal: userInput,
            history,
            memoryContext,
            completedSteps: executedSteps,
            remainingIterations: this.maxAutonomousIterations - iteration,
          });

          this.log(`Autonomous step plan: ${JSON.stringify(stepPlan)}`);

          if (stepPlan?.done) {
            const finalResponse = stepPlan.final_response || lastResult || "Task completed.";
            return {
              action: lastAction,
              result: finalResponse,
              metadata: {
                duration: Date.now() - startTime,
                style: responseStyle,
                parameters: lastParameters,
                executedSteps,
                autonomousMode: true,
                planner: "groq",
              },
            };
          }

          const plannedAction = stepPlan?.next_action?.action || "chat";
          const plannedParams = this.prepareParameters(
            plannedAction,
            stepPlan?.next_action?.parameters || {},
            userInput,
            memoryContext,
            responseStyle,
            history
          );

          const stepNumber = executedSteps.length + 1;
          const execution = await this.executeSingleStep(plannedAction, plannedParams, stepNumber, executedSteps);

          lastAction = execution.action;
          lastResult = execution.message;
          lastParameters = plannedParams;

          if (!execution.ok) {
            return {
              action: lastAction,
              result: lastResult,
              metadata: {
                duration: Date.now() - startTime,
                style: responseStyle,
                parameters: lastParameters,
                executedSteps,
                autonomousMode: true,
                planner: "groq",
                error: "Tool not found",
              },
            };
          }
        }

        return {
          action: lastAction,
          result: lastResult || "I completed as much as possible in autonomous mode.",
          metadata: {
            duration: Date.now() - startTime,
            style: responseStyle,
            parameters: lastParameters,
            executedSteps,
            autonomousMode: true,
            planner: "groq",
            maxIterationsReached: true,
          },
        };
      }

      const actionPlan = await getGroqActionPlan(userInput, history, memoryContext);
      this.log(`Action plan: ${JSON.stringify(actionPlan)}`);
      const planSteps = this.normalizePlan(actionPlan);
      const executedSteps = [];
      let lastAction = "chat";
      let lastResult = "";
      let lastParameters = {};

      for (let index = 0; index < planSteps.length; index += 1) {
        const current = planSteps[index] || {};
        const action = current.action || "chat";
        const parameters = this.prepareParameters(action, current.parameters || {}, userInput, memoryContext, responseStyle, history);
        const execution = await this.executeSingleStep(action, parameters, index + 1, executedSteps);

        lastAction = execution.action;
        lastResult = execution.message;
        lastParameters = parameters;

        if (!execution.ok) {
          break;
        }
      }

      return {
        action: lastAction,
        result: lastResult,
        metadata: {
          duration: Date.now() - startTime,
          style: responseStyle,
          parameters: lastParameters,
          executedSteps,
          planner: "groq",
        },
      };
    } catch (error) {
      console.error("[agent-executor] Error:", error.message);

      return {
        action: "chat",
        result: "I hit a temporary planning issue, but I'm here. Please try again.",
        metadata: {
          duration: Date.now() - startTime,
          error: error.message,
          planner: "fallback",
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
