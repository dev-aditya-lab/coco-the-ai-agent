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

export function normalizeTrackerSummary(payload) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const reminders = Array.isArray(data.reminders) ? data.reminders : [];
  const budget = data.budget && typeof data.budget === "object" ? data.budget : {};
  const habits = data.habits && typeof data.habits === "object" ? data.habits : {};

  return {
    reminders: reminders.map((item, index) => ({
      id: String(item?.id || `reminder-${index}`),
      title: typeof item?.title === "string" ? item.title : "",
      dueAt: item?.dueAt || null,
      notes: typeof item?.notes === "string" ? item.notes : "",
      status: typeof item?.status === "string" ? item.status : "pending",
    })),
    budget: {
      income: Number(budget?.income || 0),
      expense: Number(budget?.expense || 0),
      net: Number(budget?.net || 0),
      recent: Array.isArray(budget?.recent)
        ? budget.recent.map((item, index) => ({
            id: String(item?.id || `budget-${index}`),
            type: typeof item?.type === "string" ? item.type : "expense",
            amount: Number(item?.amount || 0),
            category: typeof item?.category === "string" ? item.category : "general",
            note: typeof item?.note === "string" ? item.note : "",
            occurredAt: item?.occurredAt || null,
          }))
        : [],
    },
    habits: {
      done: Number(habits?.done || 0),
      skipped: Number(habits?.skipped || 0),
      recent: Array.isArray(habits?.recent)
        ? habits.recent.map((item, index) => ({
            id: String(item?.id || `habit-${index}`),
            habit: typeof item?.habit === "string" ? item.habit : "",
            status: typeof item?.status === "string" ? item.status : "skipped",
            note: typeof item?.note === "string" ? item.note : "",
            occurredAt: item?.occurredAt || null,
          }))
        : [],
    },
  };
}
