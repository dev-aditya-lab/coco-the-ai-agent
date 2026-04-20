function cleanAssistantText(rawText) {
  const source = typeof rawText === "string" ? rawText : "";
  if (!source.trim()) {
    return "";
  }

  return source
    .replace(/<think[\s\S]*$/gi, "")
    .replace(/<think[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think>/gi, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function formatAssistantText(rawText) {
  const cleaned = cleanAssistantText(rawText);
  if (!cleaned) {
    return "No response from assistant.";
  }

  const lines = cleaned.split("\n");
  const formatted = [];

  for (const originalLine of lines) {
    const line = originalLine.trim();

    if (!line) {
      if (formatted.length > 0 && formatted[formatted.length - 1] !== "") {
        formatted.push("");
      }
      continue;
    }

    if (/^coco$/i.test(line) || /^\d{1,2}:\d{2}:\d{2}\s*(am|pm)$/i.test(line)) {
      continue;
    }

    if (/^based on (the )?research:?$/i.test(line)) {
      formatted.push("## Summary");
      continue;
    }

    if (/^research action$/i.test(line)) {
      formatted.push("### Research Action");
      continue;
    }

    if (/^sources:?$/i.test(line)) {
      formatted.push("### Sources");
      continue;
    }

    const stepMatch = line.match(/^step\s*(\d+)\s*:\s*(.+)$/i);
    if (stepMatch) {
      const stepAction = stepMatch[2].trim().toLowerCase();
      if (stepAction === "chat") {
        continue;
      }
      formatted.push(`- **Step ${stepMatch[1]}:** ${stepMatch[2]}`);
      continue;
    }

    if (/^raw backend payload$/i.test(line)) {
      continue;
    }

    const labelMatch = line.match(/^(topic|depth|final conclusion|reliability note)\s*:\s*(.+)$/i);
    if (labelMatch) {
      formatted.push(`- **${labelMatch[1]}:** ${labelMatch[2]}`);
      continue;
    }

    if (/^\d+\./.test(line) || /^[-*]\s+/.test(line) || /^#+\s+/.test(line)) {
      formatted.push(line);
      continue;
    }

    if (/^a (digital poster|large group|poster)/i.test(line)) {
      formatted.push(`- ${line}`);
      continue;
    }

    formatted.push(line);
  }

  const deduped = [];
  for (const line of formatted) {
    const previous = deduped[deduped.length - 1];
    if (line && previous && line.toLowerCase() === previous.toLowerCase()) {
      continue;
    }
    deduped.push(line);
  }

  return deduped.join("\n").replace(/\n{3,}/g, "\n\n").trim() || "No response from assistant.";
}

function normalizeStep(step, index) {
  return {
    stepNumber: Number(step?.stepNumber) || index + 1,
    action: typeof step?.action === "string" ? step.action : "unknown",
    status: step?.status === "completed" ? "completed" : "failed",
    message: formatAssistantText(step?.message),
    parameters: step?.parameters && typeof step.parameters === "object" ? step.parameters : {},
    details: step?.details && typeof step.details === "object" ? step.details : {},
  };
}

export function normalizeCommandResponse(payload, command) {
  const steps = Array.isArray(payload?.stepsExecuted)
    ? payload.stepsExecuted.map((step, index) => normalizeStep(step, index))
    : [];

  const timestamp = typeof payload?.timestamp === "string" ? payload.timestamp : new Date().toISOString();
  const finalMessage = formatAssistantText(payload?.finalMessage);

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
  const todos = data.todos && typeof data.todos === "object" ? data.todos : {};

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
    todos: {
      pending: Number(todos?.pending || 0),
      done: Number(todos?.done || 0),
      total: Number(todos?.total || 0),
      recent: Array.isArray(todos?.recent)
        ? todos.recent.map((item, index) => ({
            id: String(item?.id || `todo-${index}`),
            title: typeof item?.title === "string" ? item.title : "",
            note: typeof item?.note === "string" ? item.note : "",
            status: typeof item?.status === "string" ? item.status : "pending",
            createdAt: item?.createdAt || null,
            updatedAt: item?.updatedAt || null,
          }))
        : [],
    },
  };
}
