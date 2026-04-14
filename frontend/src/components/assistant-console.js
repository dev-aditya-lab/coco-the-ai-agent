'use client';

import { useMemo, useState } from "react";
import AssistantLayout from "@/components/assistant-layout";
import CommandInput from "@/components/command-input";
import CommandSuggestions from "@/components/command-suggestions";
import Loader from "@/components/loader";
import ResponseBox from "@/components/response-box";
import { submitCommand } from "@/services/assistant-service";

const PHASE = {
  idle: "idle",
  understanding: "understanding",
  executing: "executing",
  completed: "completed",
  error: "error",
};

function userFriendlyStepError(action) {
  if (action === "open_app") {
    return "Failed to open application";
  }

  if (action === "play_youtube") {
    return "Failed to play YouTube content";
  }

  if (action === "create_file") {
    return "Failed to create file";
  }

  return "Could not process request";
}

function normalizeSteps(rawSteps) {
  if (!Array.isArray(rawSteps)) {
    return [];
  }

  return rawSteps.map((step, index) => {
    const action = typeof step?.action === "string" ? step.action : "get_info";
    const status = step?.status === "completed" ? "completed" : "failed";
    const safeMessage = status === "completed"
      ? (typeof step?.message === "string" && step.message.trim() ? step.message : "Completed")
      : userFriendlyStepError(action);

    return {
      stepNumber: Number(step?.stepNumber) || index + 1,
      action,
      parameters: step?.parameters && typeof step.parameters === "object" ? step.parameters : {},
      status,
      message: safeMessage,
      details: step?.details && typeof step.details === "object" ? step.details : {},
    };
  });
}

function normalizeResponse(rawResponse, fallbackCommand) {
  if (!rawResponse || typeof rawResponse !== "object") {
    return {
      success: false,
      stepsExecuted: [],
      finalMessage: "Could not process request.",
      command: fallbackCommand,
    };
  }

  const modernSteps = normalizeSteps(rawResponse.stepsExecuted);

  if (modernSteps.length > 0) {
    return {
      success: Boolean(rawResponse.success),
      stepsExecuted: modernSteps,
      finalMessage: typeof rawResponse.finalMessage === "string"
        ? rawResponse.finalMessage
        : (modernSteps.every((step) => step.status === "completed")
            ? "Completed"
            : "Could not complete all steps"),
      command: fallbackCommand,
      timestamp: rawResponse.timestamp,
    };
  }

  // Backward compatibility for older backend payloads.
  if (rawResponse.data && rawResponse.execution) {
    const legacyStep = normalizeSteps([
      {
        stepNumber: 1,
        action: rawResponse.data.action,
        parameters: rawResponse.data.parameters,
        status: rawResponse.execution.status,
        message: rawResponse.execution.message,
        details: rawResponse.execution.details,
      },
    ]);

    return {
      success: legacyStep[0]?.status === "completed",
      stepsExecuted: legacyStep,
      finalMessage: legacyStep[0]?.status === "completed" ? "Completed" : "Could not process request",
      command: fallbackCommand,
      timestamp: rawResponse.timestamp,
    };
  }

  return {
    success: false,
    stepsExecuted: [],
    finalMessage: "Could not process request.",
    command: fallbackCommand,
    timestamp: rawResponse.timestamp,
  };
}

export default function AssistantConsole() {
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState(PHASE.idle);

  const showLoader = isLoading || phase === PHASE.completed;

  const logs = useMemo(() => {
    if (!response?.stepsExecuted) {
      return [];
    }

    return response.stepsExecuted.map((step) => ({
      title: `Step ${step.stepNumber}: ${step.action}`,
      status: step.status,
      details: step.message,
    }));
  }, [response]);

  async function runCommand(nextCommand) {
    const trimmedCommand = nextCommand.trim();
    if (!trimmedCommand || isLoading) {
      return;
    }

    setCommand(trimmedCommand);
    setIsLoading(true);
    setError(null);
    setPhase(PHASE.understanding);

    const phaseTimer = setTimeout(() => {
      setPhase(PHASE.executing);
    }, 450);

    try {
      const rawResponse = await submitCommand(trimmedCommand);
      const nextResponse = normalizeResponse(rawResponse, trimmedCommand);
      setResponse(nextResponse);
      setPhase(PHASE.completed);
    } catch {
      setError("Could not process request.");
      setPhase(PHASE.error);
    } finally {
      clearTimeout(phaseTimer);
      setIsLoading(false);

      setTimeout(() => {
        setPhase((currentPhase) => (currentPhase === PHASE.completed ? PHASE.idle : currentPhase));
      }, 900);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    runCommand(command);
  }

  function handleCommandKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      runCommand(command);
    }
  }

  function handleSuggestion(commandValue) {
    runCommand(commandValue);
  }

  return (
    <AssistantLayout>
      <CommandInput
        command={command}
        isLoading={isLoading}
        onCommandChange={setCommand}
        onCommandKeyDown={handleCommandKeyDown}
        onSubmit={handleSubmit}
      />
      <CommandSuggestions isLoading={isLoading} onUseCommand={handleSuggestion} />
      <Loader isVisible={showLoader} phase={phase} />
      <ResponseBox error={error} logs={logs} response={response} />
    </AssistantLayout>
  );
}