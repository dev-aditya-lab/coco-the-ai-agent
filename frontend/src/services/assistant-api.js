import { normalizeCommandResponse, normalizeHistoryRecords } from "@/utils/assistant-normalizers";
import { requestJson } from "@/services/http-client";

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");

export async function sendAssistantCommand(command) {
  const payload = await requestJson(`${BASE_URL}/api/command`, {
    method: "POST",
    body: JSON.stringify({ command }),
  });

  return normalizeCommandResponse(payload, command);
}

export async function getAssistantHistory(limit = 10) {
  const payload = await requestJson(`${BASE_URL}/api/history?limit=${limit}`);
  return normalizeHistoryRecords(payload);
}

export function getBackendUrl() {
  return BASE_URL;
}
