"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAssistantHistory, getTrackerSummary, sendAssistantCommand } from "@/services/assistant-api";

function makeMessage({ role, content, timestamp, command, response }) {
  const resolvedTimestamp = typeof timestamp === "string" && timestamp.trim()
    ? timestamp
    : null;

  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    timestamp: resolvedTimestamp,
    command: command || "",
    response: response || null,
  };
}

function extractNameFromText(text) {
  const value = typeof text === "string" ? text.trim() : "";
  if (!value) {
    return "";
  }

  const match = value.match(/\b(?:i am|i'm|my name is|mera naam)\s+([a-z][a-z\s'-]{1,30})/i);
  const name = match?.[1] ? match[1].trim().split(" ").slice(0, 2).join(" ") : "";

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildGreeting(name) {
  if (name) {
    return `Welcome back, ${name}. COCO is ready for your next goal.`;
  }
  return "COCO is ready. Ask anything in English or Hinglish.";
}

function isConnectivityError(message) {
  const normalized = typeof message === "string" ? message.toLowerCase() : "";
  return normalized.includes("unreachable")
    || normalized.includes("failed to fetch")
    || normalized.includes("network");
}

function buildOfflineFallbackReply(command, previousMessages = [], hardOffline = false) {
  const text = typeof command === "string" ? command.trim() : "";
  const normalized = text.toLowerCase();
  const lastAssistant = [...previousMessages].reverse().find((item) => item?.role === "assistant")?.content || "";
  const likelyCookingContext = /recipe|paneer|kadai|kadhai|cook|cooking|ingredient|food/i.test(`${text} ${lastAssistant}`);

  const missingGarlic = (
    /garlic|lahsun/i.test(normalized)
    && /(don't have|dont have|no |without|nahi hai|nahin hai|nhi hai|missing)/i.test(normalized)
  );

  if (missingGarlic && likelyCookingContext) {
    return [
      "## No-Garlic Kadai Paneer",
      "No problem. You can make tasty kadhai paneer without garlic.",
      "### Quick adjustment",
      "- Use extra ginger (about 1/2 tsp more).",
      "- Add a pinch of asafoetida (hing) for aroma (optional).",
      "- Slightly increase kasuri methi and garam masala at the end.",
      "### Short steps",
      "1. Heat oil/butter and saute onion, ginger, and green chili.",
      "2. Add tomato puree, salt, turmeric, coriander powder, and red chili powder; cook till oil separates.",
      "3. Add capsicum and cook 2 minutes.",
      "4. Add paneer cubes with a little water or cream; simmer 3 to 4 minutes.",
      "5. Finish with garam masala and crushed kasuri methi.",
      "Serve hot with roti or naan.",
      "",
      hardOffline
        ? "Backend is temporarily unavailable, so this is an offline quick reply."
        : "There was a temporary request issue, so this is a quick local reply.",
    ].join("\n");
  }

  if (hardOffline) {
    return [
      "Backend is temporarily unavailable, so I could not complete the full AI flow.",
      "",
      "Please try again in a moment. If you want, I can still give a quick manual answer based on your last message.",
    ].join("\n");
  }

  return [
    "I hit a temporary request issue while processing that.",
    "",
    "Please retry once. If it still fails, I will continue with a local quick answer.",
  ].join("\n");
}

export function useAssistant() {
  const [profileName, setProfileName] = useState("");
  const [agentStatus, setAgentStatus] = useState("idle");
  const [messages, setMessages] = useState([
    makeMessage({
      role: "assistant",
      content: buildGreeting(""),
      timestamp: null,
    }),
  ]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingTracker, setLoadingTracker] = useState(false);
  const [error, setError] = useState("");
  const [backendOnline, setBackendOnline] = useState(true);
  const [trackerSummary, setTrackerSummary] = useState({
    reminders: [],
    budget: { income: 0, expense: 0, net: 0, recent: [] },
    habits: { done: 0, skipped: 0, recent: [] },
    todos: { pending: 0, done: 0, total: 0, recent: [] },
  });
  const connectivityFailuresRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedName = window.localStorage.getItem("coco-profile-name") || "";
    if (!savedName) {
      return;
    }

    setProfileName(savedName);
    setMessages((prev) => {
      if (!Array.isArray(prev) || prev.length === 0 || prev[0]?.role !== "assistant") {
        return prev;
      }

      const next = [...prev];
      next[0] = {
        ...next[0],
        content: buildGreeting(savedName),
      };
      return next;
    });
  }, []);

  const refreshTrackerSummary = useCallback(async () => {
    setLoadingTracker(true);
    try {
      const summary = await getTrackerSummary();
      setTrackerSummary(summary);
      connectivityFailuresRef.current = 0;
      setBackendOnline(true);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "";
      const connectivityIssue = isConnectivityError(message);
      connectivityFailuresRef.current = connectivityIssue ? connectivityFailuresRef.current + 1 : 0;
      setBackendOnline(!(connectivityIssue && connectivityFailuresRef.current >= 2));
    } finally {
      setLoadingTracker(false);
    }
  }, []);

  useEffect(() => {
    refreshTrackerSummary();
  }, [refreshTrackerSummary]);

  const sendCommand = useCallback(async (command) => {
    const trimmed = typeof command === "string" ? command.trim() : "";
    if (!trimmed || loading) {
      return;
    }

    console.info("[assistant] send command", { command: trimmed });
    setError("");
    setLoading(true);
    setAgentStatus("thinking");

    const userMessage = makeMessage({
      role: "user",
      content: trimmed,
      command: trimmed,
      timestamp: new Date().toISOString(),
    });
    setMessages((prev) => [...prev, userMessage]);

    const extractedName = extractNameFromText(trimmed);
    if (extractedName) {
      setProfileName(extractedName);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("coco-profile-name", extractedName);
      }
      setMessages((prev) => {
        if (!Array.isArray(prev) || prev.length === 0 || prev[0]?.role !== "assistant") {
          return prev;
        }

        const next = [...prev];
        next[0] = {
          ...next[0],
          content: buildGreeting(extractedName),
        };
        return next;
      });
    }

    try {
      const response = await sendAssistantCommand(trimmed);
      console.info("[assistant] command response", { command: trimmed, action: response?.metadata?.planner, success: response?.success });
      connectivityFailuresRef.current = 0;
      setBackendOnline(true);
      setAgentStatus("executing");

      const assistantMessage = makeMessage({
        role: "assistant",
        content: response.finalMessage,
        command: trimmed,
        timestamp: response.timestamp,
        response,
      });

      setMessages((prev) => [...prev, assistantMessage]);
      setAgentStatus("responding");

      const records = await getAssistantHistory(10);
      setHistory(records);
      await refreshTrackerSummary();
      setAgentStatus("idle");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to process command.";
      console.error("[assistant] command failed", { command: trimmed, error: requestError });
      const connectivityIssue = isConnectivityError(message);
      connectivityFailuresRef.current = connectivityIssue ? connectivityFailuresRef.current + 1 : 0;
      const hardOffline = connectivityIssue && connectivityFailuresRef.current >= 2;
      setBackendOnline(!hardOffline);
      setError(message);

      setMessages((prev) => {
        const fallbackContent = connectivityIssue
          ? buildOfflineFallbackReply(trimmed, prev, hardOffline)
          : "Request failed. Please try again.";

        return [
          ...prev,
          makeMessage({
            role: "assistant",
            content: fallbackContent,
            command: trimmed,
            timestamp: new Date().toISOString(),
          }),
        ];
      });
      setAgentStatus("idle");
    } finally {
      setLoading(false);
    }
  }, [loading, refreshTrackerSummary]);

  const refreshHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const records = await getAssistantHistory(10);
      setHistory(records);
      connectivityFailuresRef.current = 0;
      setBackendOnline(true);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to load history.";
      console.error("[assistant] history refresh failed", { error: requestError });
      setError(message);
      const connectivityIssue = isConnectivityError(message);
      connectivityFailuresRef.current = connectivityIssue ? connectivityFailuresRef.current + 1 : 0;
      setBackendOnline(!(connectivityIssue && connectivityFailuresRef.current >= 2));
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const stats = useMemo(() => {
    const assistantMessages = messages.filter((item) => item.role === "assistant");
    const commandMessages = messages.filter((item) => item.role === "user");

    return {
      totalMessages: messages.length,
      totalCommands: commandMessages.length,
      totalResponses: assistantMessages.length,
    };
  }, [messages]);

  const latestAssistantMessage = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "assistant") {
        return messages[index]?.content || "";
      }
    }

    return "";
  }, [messages]);

  return {
    profileName,
    messages,
    history,
    loading,
    loadingHistory,
    loadingTracker,
    error,
    backendOnline,
    agentStatus,
    trackerSummary,
    stats,
    latestAssistantMessage,
    setAgentStatus,
    sendCommand,
    refreshHistory,
    refreshTrackerSummary,
  };
}
