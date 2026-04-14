function normalizeCommand(command) {
  return command.trim().replace(/\s+/g, " ");
}

export async function buildCommandResponse(command) {
  const normalizedCommand = normalizeCommand(command);

  return {
    command: normalizedCommand,
    reply: `Command received: ${normalizedCommand}. The backend is ready for AI orchestration.`,
    status: "ready",
    timestamp: new Date().toISOString(),
    meta: {
      mode: "starter",
      source: "express-service",
    },
  };
}