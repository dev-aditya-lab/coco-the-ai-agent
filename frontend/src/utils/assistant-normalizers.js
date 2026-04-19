function normalizeStep(step, index) {
  return {
    stepNumber: Number(step?.stepNumber) || index + 1,
    action: typeof step?.action === "string" ? step.action : "unknown",
    status: step?.status === "completed" ? "completed" : "failed",
    message: typeof step?.message === "string" && step.message.trim() ? step.message : "No details",
    parameters: step?.parameters && typeof step.parameters === "object" ? step.parameters : {},
    details: step?.details && typeof step.details === "object" ? step.details : {},
  };
}

export function normalizeCommandResponse(payload, command) {
  const steps = Array.isArray(payload?.stepsExecuted)
    ? payload.stepsExecuted.map((step, index) => normalizeStep(step, index))
    : [];

  const timestamp = typeof payload?.timestamp === "string" ? payload.timestamp : new Date().toISOString();
  const finalMessage = typeof payload?.finalMessage === "string" && payload.finalMessage.trim()
    ? payload.finalMessage
    : "No response from assistant.";

  return {
    success: Boolean(payload?.success),
    command,
    timestamp,
    finalMessage,
    steps,
    metadata: payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
    modePayload: payload?.modePayload && typeof payload.modePayload === "object" ? payload.modePayload : null,
    raw: payload,
  };
}

export function normalizeHistoryRecords(payload) {
  if (!payload || !Array.isArray(payload.data)) {
    return [];
  }

  return payload.data.map((record, index) => ({
    id: String(record?._id || `${record?.createdAt || "history"}-${index}`),
    command: typeof record?.command === "string" ? record.command : "",
    action: typeof record?.action === "string" ? record.action : "unknown",
    response: typeof record?.response === "string" ? record.response : "",
    status: record?.status === "success" ? "success" : "failure",
    parameters: record?.parameters && typeof record.parameters === "object" ? record.parameters : {},
    createdAt: record?.createdAt,
  }));
}
