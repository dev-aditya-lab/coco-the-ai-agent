/**
 * Agent Executor Service
 * Core LangChain agent executor handling tool selection and execution
 */

import { getToolRegistry } from "../toolRegistry.js";
import { getGroqInstance, getGroqActionPlan, getGroqAutonomousStep } from "./groqService.js";
import { getOpenClawActionPlan, getOpenClawAutonomousStep } from "./openclawService.js";
import { env } from "../../config/env.js";

class AgentExecutor {
  constructor(options = {}) {
    this.registry = getToolRegistry();
    this.maxIterations = options.maxIterations || 10;
    this.openClawEnabled = options.openClawEnabled ?? env.openclawEnabled;
    this.autonomousEnabled = options.autonomousEnabled ?? env.agentAutonomousMode;
    this.maxAutonomousIterations = options.maxAutonomousIterations || env.agentAutonomousMaxIterations || 4;
    this.verbose = options.verbose || false;
    this.llmOptions = options.llmOptions || {};
    this.llm = null;
  }

  async planAction(userInput, history, memoryContext) {
    if (!this.openClawEnabled) {
      return {
        planner: "groq",
        plan: await getGroqActionPlan(userInput, history, memoryContext),
      };
    }

    try {
      return {
        planner: "openclaw",
        plan: await getOpenClawActionPlan(userInput, history, memoryContext),
      };
    } catch (error) {
      this.log(`OpenClaw plan failed, falling back to Groq: ${error.message}`);
      return {
        planner: "groq",
        plan: await getGroqActionPlan(userInput, history, memoryContext),
      };
    }
  }

  async planAutonomousStep(userInput, history, memoryContext, executedSteps, remainingIterations) {
    if (!this.openClawEnabled) {
      return {
        planner: "groq",
        stepPlan: await getGroqAutonomousStep({
          goal: userInput,
          history,
          memoryContext,
          completedSteps: executedSteps,
          remainingIterations,
        }),
      };
    }

    try {
      return {
        planner: "openclaw",
        stepPlan: await getOpenClawAutonomousStep({
          goal: userInput,
          history,
          memoryContext,
          completedSteps: executedSteps,
          remainingIterations,
        }),
      };
    } catch (error) {
      this.log(`OpenClaw autonomous step failed, falling back to Groq: ${error.message}`);
      return {
        planner: "groq",
        stepPlan: await getGroqAutonomousStep({
          goal: userInput,
          history,
          memoryContext,
          completedSteps: executedSteps,
          remainingIterations,
        }),
      };
    }
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

  normalizePlan(actionPlan, userInput) {
    if (Array.isArray(actionPlan?.actions) && actionPlan.actions.length > 0) {
      return actionPlan.actions
        .slice(0, 4)
        .map((step) => ({
          action: step?.action || "chat",
          parameters: step?.parameters && typeof step.parameters === "object" ? { ...step.parameters } : {},
        }));
    }

    return [
      {
        action: actionPlan?.action || "chat",
        parameters: actionPlan?.parameters && typeof actionPlan.parameters === "object"
          ? { ...actionPlan.parameters }
          : {},
      },
    ];
  }

  prepareParameters(action, parameters, userInput, memoryContext, responseStyle) {
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

    if (memoryContext) {
      next.memory_context = memoryContext;
    }

    next._response_style = responseStyle;
    next.style = responseStyle;

    return next;
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
      });

      return {
        ok: false,
        action,
        message: toolError,
      };
    }

    this.log(`Executing tool: ${action}`);
    const stepResult = await this.registry.executeTool(action, parameters);

    executedSteps.push({
      stepNumber,
      action,
      status: "completed",
      message: stepResult,
      parameters,
    });

    return {
      ok: true,
      action,
      message: stepResult,
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
      if (!this.llm) {
        this.llm = getGroqInstance(this.llmOptions);
      }

      // Detect response style
      const responseStyle = this.detectResponseStyle(userInput);
      this.log(`Detected style: ${responseStyle}`);

      if (this.autonomousEnabled) {
        const executedSteps = [];
        let lastAction = "chat";
        let lastResult = "";
        let lastParameters = {};
        let plannerUsed = "groq";

        for (let iteration = 0; iteration < this.maxAutonomousIterations; iteration += 1) {
          const planned = await this.planAutonomousStep(
            userInput,
            history,
            memoryContext,
            executedSteps,
            this.maxAutonomousIterations - iteration
          );
          const stepPlan = planned.stepPlan;
          plannerUsed = planned.planner;

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
                planner: plannerUsed,
              },
            };
          }

          const plannedAction = stepPlan?.next_action?.action || "chat";
          const plannedParams = this.prepareParameters(
            plannedAction,
            stepPlan?.next_action?.parameters || {},
            userInput,
            memoryContext,
            responseStyle
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
                planner: plannerUsed,
                error: "Tool not found",
              },
            };
          }
        }

        return {
          action: lastAction,
          result: lastResult || "I completed as much as I could in autonomous mode.",
          metadata: {
            duration: Date.now() - startTime,
            style: responseStyle,
            parameters: lastParameters,
            executedSteps,
            autonomousMode: true,
            planner: plannerUsed,
            maxIterationsReached: true,
          },
        };
      }

      // Get action plan from LLM
      const planned = await this.planAction(userInput, history, memoryContext);
      const actionPlan = planned.plan;
      this.log(`Action plan: ${JSON.stringify(actionPlan)}`);

      const planSteps = this.normalizePlan(actionPlan, userInput);
      const executedSteps = [];
      let lastAction = "chat";
      let lastResult = "";
      let lastParameters = {};

      for (let index = 0; index < planSteps.length; index += 1) {
        const current = planSteps[index] || {};
        const action = current.action || "chat";
        const parameters = this.prepareParameters(action, current.parameters || {}, userInput, memoryContext, responseStyle);
        const execution = await this.executeSingleStep(action, parameters, index + 1, executedSteps);

        lastAction = execution.action;
        lastResult = execution.message;
        lastParameters = parameters;

        if (!execution.ok) {
          return {
            action: lastAction,
            result: lastResult,
            metadata: {
              duration: Date.now() - startTime,
              style: responseStyle,
              parameters: lastParameters,
              executedSteps,
              error: "Tool not found",
            },
          };
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
          planner: planned.planner,
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
