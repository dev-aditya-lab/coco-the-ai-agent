"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  });

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
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
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
      setBackendOnline(false);
      setError(message);

      setMessages((prev) => [
        ...prev,
        makeMessage({
          role: "assistant",
          content: "Request failed. Please check backend connection and try again.",
          command: trimmed,
          timestamp: new Date().toISOString(),
        }),
      ]);
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
      setBackendOnline(true);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to load history.";
      setError(message);
      setBackendOnline(false);
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
