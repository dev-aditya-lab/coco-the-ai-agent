'use client';

import { useState } from "react";
import AssistantLayout from "@/components/assistant-layout";
import CommandInput from "@/components/command-input";
import Loader from "@/components/loader";
import ResponseBox from "@/components/response-box";
import { submitCommand } from "@/services/assistant-service";

export default function AssistantConsole() {
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedCommand = command.trim();
    if (!trimmedCommand || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextResponse = await submitCommand(trimmedCommand);
      setResponse(nextResponse);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleCommandKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
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
      <Loader isLoading={isLoading} />
      <ResponseBox error={error} response={response} />
    </AssistantLayout>
  );
}