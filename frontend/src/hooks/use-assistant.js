"use client";

import { useCallback, useMemo, useState } from "react";
import { getAssistantHistory, sendAssistantCommand } from "@/services/assistant-api";

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

export function useAssistant() {
  const [messages, setMessages] = useState([
    makeMessage({
      role: "assistant",
      content: "COCO is ready. Ask anything in English or Hinglish.",
      timestamp: null,
    }),
  ]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [backendOnline, setBackendOnline] = useState(true);

  const sendCommand = useCallback(async (command) => {
    const trimmed = typeof command === "string" ? command.trim() : "";
    if (!trimmed || loading) {
      return;
    }

    setError("");
    setLoading(true);

    const userMessage = makeMessage({
      role: "user",
      content: trimmed,
      command: trimmed,
      timestamp: new Date().toISOString(),
    });
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await sendAssistantCommand(trimmed);
      setBackendOnline(true);

      const assistantMessage = makeMessage({
        role: "assistant",
        content: response.finalMessage,
        command: trimmed,
        timestamp: response.timestamp,
        response,
      });

      setMessages((prev) => [...prev, assistantMessage]);

      const records = await getAssistantHistory(10);
      setHistory(records);
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
    } finally {
      setLoading(false);
    }
  }, [loading]);

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
    messages,
    history,
    loading,
    loadingHistory,
    error,
    backendOnline,
    stats,
    latestAssistantMessage,
    sendCommand,
    refreshHistory,
  };
}
