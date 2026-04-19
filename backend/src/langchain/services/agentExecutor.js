/**
 * Agent Executor Service
 * Core LangChain agent executor handling tool selection and execution
 */

import { getToolRegistry } from "../toolRegistry.js";
import { env } from "../../config/env.js";
import { getGroqActionPlan, getGroqAutonomousStep, getGroqEmailDraft } from "./groqService.js";
import { APP_ALIASES, APP_REGISTRY } from "../../config/appRegistry.js";

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

  sanitizeAssistantText(value) {
    const text = typeof value === "string" ? value : "";
    if (!text) {
      return "";
    }

    const withoutThink = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (!withoutThink) {
      return "";
    }

    if (/^\{[\s\S]*"next_action"[\s\S]*\}$/i.test(withoutThink)) {
      return "";
    }

    return withoutThink;
  }

  isOpenAppIntent(command) {
    const normalized = typeof command === "string" ? command.trim().toLowerCase() : "";
    if (!normalized) {
      return false;
    }

    if (!/\b(open|launch|start|run)\b/.test(normalized)) {
      return false;
    }

    const knownNames = [...new Set([...Object.keys(APP_ALIASES), ...Object.keys(APP_REGISTRY)])];
    return knownNames.some((name) => normalized.includes(name));
  }

  extractAppName(command) {
    const text = typeof command === "string" ? command.trim() : "";
    if (!text) {
      return "";
    }

    const lower = text.toLowerCase();
    const knownNames = [...new Set([...Object.keys(APP_ALIASES), ...Object.keys(APP_REGISTRY)])]
      .sort((a, b) => b.length - a.length);

    const matched = knownNames.find((name) => lower.includes(name));
    if (matched) {
      return matched;
    }

    const freeformMatch = text.match(/\b(?:open|launch|start|run)\s+(.+)$/i);
    return freeformMatch?.[1]?.trim() || "";
  }

  isCountdownIntent(command) {
    const normalized = typeof command === "string" ? command.trim().toLowerCase() : "";
    if (!normalized) {
      return false;
    }

    return /\b(countdown|count down)\b/.test(normalized)
      || /\bstart\b.*\b(\d+)\b.*\b(second|seconds|sec|s)\b/.test(normalized)
      || /\b(\d+)\s*(second|seconds|sec|s)\b.*\bcountdown\b/.test(normalized);
  }

  extractCountdownSeconds(command) {
    const text = typeof command === "string" ? command : "";
    const match = text.match(/\b(\d{1,3})\b\s*(?:second|seconds|sec|s)?/i);
    if (!match || !match[1]) {
      return 10;
    }

    const parsed = Number(match[1]);
    if (!Number.isFinite(parsed)) {
      return 10;
    }

    return Math.min(60, Math.max(1, parsed));
  }

  buildCountdownResponse(seconds, responseStyle) {
    const values = Array.from({ length: seconds }, (_, index) => seconds - index).join(", ");
    return responseStyle === "bilingual"
      ? `Countdown shuru: ${values}.`
      : `Countdown started: ${values}.`;
  }

  isApplicationWritingIntent(command) {
    const normalized = typeof command === "string" ? command.trim().toLowerCase() : "";
    if (!normalized) {
      return false;
    }

    const hasWriteIntent = /\b(write|draft|create|make)\b/.test(normalized);
    const hasApplicationWord = /\b(application|letter)\b/.test(normalized);
    const hasHackathonWord = /\bhackathon\b/.test(normalized);

    return hasWriteIntent && hasApplicationWord && hasHackathonWord;
  }

  extractInstitutionName(command) {
    const text = typeof command === "string" ? command.trim() : "";
    const explicitCollegeMatch = text.match(/\bcollege\s+([a-z][a-z\s&.'-]{2,80})/i);
    const locationMatch = text.match(/\b(?:at|on)\s+(?:our\s+)?([a-z][a-z\s&.'-]{2,80})/i);
    const fallbackMatch = text.match(/\bfor\s+([a-z][a-z\s&.'-]{2,80})/i);

    const raw = explicitCollegeMatch?.[1]?.trim()
      || locationMatch?.[1]?.trim()
      || fallbackMatch?.[1]?.trim()
      || "Ramgarh Engineering College";

    const cleaned = raw
      .replace(/\b(for\s+conducting|conducting\s+a?)\b.*$/i, "")
      .replace(/\s+/g, " ")
      .replace(/[.\s]+$/, "")
      .trim();

    const normalized = cleaned || "Ramgarh Engineering College";

    return normalized
      .replace(/\s+/g, " ")
      .replace(/[.\s]+$/, "")
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  buildHackathonApplicationContent(collegeName) {
    return [
      "To,",
      "The Principal,",
      `${collegeName}`,
      "",
      "Subject: Application for permission to conduct a Hackathon",
      "",
      "Respected Sir/Madam,",
      "",
      "I hope you are doing well. I am writing to request permission to organize a Hackathon at our college. The event will encourage students to work on practical problem-solving, innovation, and teamwork in a structured and competitive format.",
      "",
      "The Hackathon will provide students with hands-on exposure to real-world technical challenges, mentorship opportunities, and collaborative learning. We plan to ensure proper coordination for venue, schedule, technical resources, and discipline throughout the event.",
      "",
      "I kindly request you to grant approval for conducting this Hackathon at the earliest. We will submit a detailed event plan, budget, and timeline for your review if required.",
      "",
      "Thank you for your support.",
      "",
      "Yours faithfully,",
      "Student Coordinator",
    ].join("\n");
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async runCountdown(seconds, responseStyle) {
    const executedSteps = [];

    for (let current = seconds; current >= 1; current -= 1) {
      executedSteps.push({
        stepNumber: executedSteps.length + 1,
        action: "chat",
        status: "completed",
        message: responseStyle === "bilingual"
          ? `Countdown: ${current}`
          : `Countdown: ${current}`,
        parameters: { seconds: current },
        details: {},
      });

      if (current > 1) {
        await this.sleep(1000);
      }
    }

    const result = responseStyle === "bilingual"
      ? `Countdown complete: ${seconds} se 1 tak.`
      : `Countdown complete: ${seconds} to 1.`;

    return { result, executedSteps };
  }

  isEmailIntent(command) {
    const normalized = typeof command === "string" ? command.trim().toLowerCase() : "";
    if (!normalized) {
      return false;
    }

    const hasEmailVerb = /\b(send|email|mail)\b/.test(normalized);
    const hasRecipient = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(normalized);
    return hasEmailVerb && hasRecipient;
  }

  isYoutubeIntent(command) {
    const normalized = typeof command === "string" ? command.trim().toLowerCase() : "";
    if (!normalized) {
      return false;
    }

    const hasYoutubeWord = /\b(youtube|yt)\b/.test(normalized);
    const hasMediaVerb = /\b(play|search|find)\b/.test(normalized);
    const hasMediaNoun = /\b(song|songs|music|video|videos|track|playlist)\b/.test(normalized);

    return hasYoutubeWord || (hasMediaVerb && hasMediaNoun);
  }

  extractYoutubeQuery(command) {
    const text = typeof command === "string" ? command.trim() : "";
    if (!text) {
      return "";
    }

    const lowered = text.toLowerCase();

    if (/^\s*(yes|haan|ha|ok|okay|sure)\s*$/i.test(text)) {
      return "";
    }

    const explicitMatch =
      text.match(/(?:search|find|play)\s+(.+?)\s+(?:on\s+)?(?:youtube|yt)\b/i)
      || text.match(/(?:youtube|yt)\s+(?:for\s+)?(.+)$/i)
      || text.match(/(?:search|find|play)\s+(.+)$/i);

    let query = explicitMatch && explicitMatch[1] ? explicitMatch[1].trim() : text;

    query = query
      .replace(/\b(on\s+)?youtube\b/gi, "")
      .replace(/\byt\b/gi, "")
      .replace(/\b(play|search|find|a|an|the)\b/gi, "")
      .replace(/\b(from|on|at|to|for|with)\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!query) {
      if (lowered.includes("lofi")) {
        return "lofi songs";
      }
      if (lowered.includes("any song") || lowered.includes("any music")) {
        return "trending songs";
      }
    }

    return query;
  }

  async extractEmailParams(command, responseStyle = "english") {
    const text = typeof command === "string" ? command.trim() : "";
    const toMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const to = toMatch ? toMatch[0] : "";

    const subjectMatch =
      text.match(/\bsubject\s*(?:is|:)?\s*["']?([^"'\n]+)["']?/i)
      || text.match(/\bwith\s+(.+?)\s+subject\b/i);

    const topicMatch =
      text.match(/\babout\s+(.+?)(?:\s+with\s+.+\s+subject\b|\s+subject\s*(?:is|:)|$)/i)
      || text.match(/\bregarding\s+(.+?)(?:\s+with\s+.+\s+subject\b|\s+subject\s*(?:is|:)|$)/i)
      || text.match(/\bon\s+(.+?)(?:\s+with\s+.+\s+subject\b|\s+subject\s*(?:is|:)|$)/i);

    const rawTopic = topicMatch && topicMatch[1] ? topicMatch[1].trim() : "your requested update";
    const topic = rawTopic.replace(/[.\s]+$/, "") || "your requested update";
    const titleTopic = topic
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    const subject = subjectMatch && subjectMatch[1]
      ? subjectMatch[1].trim()
      : `Update on ${titleTopic}`;

    let body = "";
    let finalSubject = subject;

    try {
      const draft = await getGroqEmailDraft({
        command: text,
        topic,
        to,
        preferredSubject: subjectMatch && subjectMatch[1] ? subject : "",
        responseStyle,
      });

      if (draft?.subject && (!subjectMatch || !subjectMatch[1])) {
        finalSubject = String(draft.subject).trim();
      }

      if (draft?.body) {
        body = String(draft.body).trim();
      }
    } catch (error) {
      this.log(`Email draft generation fallback used: ${error?.message || "unknown error"}`);
    }

    if (!body) {
      body = [
        "Hello,",
        "",
        `I am sharing a quick update regarding ${topic}.`,
        "",
        "Please let me know if you would like a detailed summary or specific next steps.",
        "",
        "Best regards,",
        "COCO",
      ].join("\n");
    }

    return {
      to,
      subject: finalSubject,
      body,
      mode: "send",
    };
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

    if (action === "open_app") {
      if (!next.app_name && typeof next.app === "string") {
        next.app_name = next.app;
      }
      if (!next.app_name) {
        next.app_name = this.extractAppName(userInput);
      }
      delete next.app;
    }

    if (action === "play_youtube" && !next.query) {
      next.query = this.extractYoutubeQuery(userInput) || userInput;
    }

    if (action === "send_email" && !next.mode) {
      next.mode = "send";
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
      const sanitizedMessage = this.sanitizeAssistantText(result.message);
      const message = sanitizedMessage
        ? sanitizedMessage
        : JSON.stringify(result);
      return {
        message,
        details: result,
      };
    }

    const sanitized = this.sanitizeAssistantText(result);
    const message = sanitized || "Done.";
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

      if (this.isOpenAppIntent(userInput)) {
        const executedSteps = [];
        const appName = this.extractAppName(userInput);
        const plannedParams = this.prepareParameters(
          "open_app",
          { app_name: appName },
          userInput,
          memoryContext,
          responseStyle,
          history,
        );

        const execution = await this.executeSingleStep("open_app", plannedParams, 1, executedSteps);

        return {
          action: "open_app",
          result: execution.message,
          metadata: {
            duration: Date.now() - startTime,
            style: responseStyle,
            parameters: plannedParams,
            executedSteps,
            autonomousMode: false,
            planner: "shortcut",
            shortcut: "open_app_intent",
          },
        };
      }

      if (this.isCountdownIntent(userInput)) {
        const seconds = this.extractCountdownSeconds(userInput);
        const countdown = await this.runCountdown(seconds, responseStyle);
        return {
          action: "chat",
          result: countdown.result,
          metadata: {
            duration: Date.now() - startTime,
            style: responseStyle,
            parameters: {
              seconds,
              message: userInput,
            },
            executedSteps: countdown.executedSteps,
            autonomousMode: false,
            planner: "shortcut",
            shortcut: "countdown",
          },
        };
      }

      if (this.isApplicationWritingIntent(userInput)) {
        const executedSteps = [];
        const collegeName = this.extractInstitutionName(userInput);
        const plannedParams = this.prepareParameters(
          "create_file",
          {
            filename: "hackathon_application.txt",
            content: this.buildHackathonApplicationContent(collegeName),
          },
          userInput,
          memoryContext,
          responseStyle,
          history,
        );

        const execution = await this.executeSingleStep("create_file", plannedParams, 1, executedSteps);

        return {
          action: "create_file",
          result: execution.message,
          metadata: {
            duration: Date.now() - startTime,
            style: responseStyle,
            parameters: plannedParams,
            executedSteps,
            autonomousMode: false,
            planner: "shortcut",
            shortcut: "write_application",
          },
        };
      }

      if (this.isEmailIntent(userInput)) {
        const executedSteps = [];
        const plannedParams = this.prepareParameters(
          "send_email",
          await this.extractEmailParams(userInput, responseStyle),
          userInput,
          memoryContext,
          responseStyle,
          history,
        );

        const execution = await this.executeSingleStep("send_email", plannedParams, 1, executedSteps);

        return {
          action: "send_email",
          result: execution.message,
          metadata: {
            duration: Date.now() - startTime,
            style: responseStyle,
            parameters: plannedParams,
            executedSteps,
            autonomousMode: false,
            planner: "shortcut",
            shortcut: "email_intent",
          },
        };
      }

      if (this.isYoutubeIntent(userInput)) {
        const executedSteps = [];
        const extractedQuery = this.extractYoutubeQuery(userInput) || "trending songs";
        const plannedParams = this.prepareParameters(
          "play_youtube",
          { query: extractedQuery },
          userInput,
          memoryContext,
          responseStyle,
          history,
        );

        const execution = await this.executeSingleStep("play_youtube", plannedParams, 1, executedSteps);

        return {
          action: "play_youtube",
          result: execution.message,
          metadata: {
            duration: Date.now() - startTime,
            style: responseStyle,
            parameters: plannedParams,
            executedSteps,
            autonomousMode: false,
            planner: "shortcut",
            shortcut: "youtube_intent",
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
            const finalResponse = this.sanitizeAssistantText(stepPlan.final_response) || lastResult || "Task completed.";
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
