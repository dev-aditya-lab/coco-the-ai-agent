const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function submitCommand(command) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || "Could not process request.");
    }

    if (!data || typeof data !== "object") {
      throw new Error("Could not process request.");
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process request.";

    if (message.toLowerCase().includes("failed to fetch") || message.toLowerCase().includes("network")) {
      throw new Error("Service is unavailable right now.");
    }

    throw new Error("Could not process request.");
  }
}

export async function fetchCommandHistory(limit = 10) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/history?limit=${limit}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json().catch(() => null);

    if (!data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data;
  } catch {
    return [];
  }
}