const DEFAULT_TIMEOUT_MS = 20000;

function withTimeout(signal, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

export async function requestJson(url, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...restOptions } = options;
  const timeout = withTimeout(restOptions.signal, timeoutMs);

  try {
    const response = await fetch(url, {
      ...restOptions,
      signal: timeout.signal,
      headers: {
        "Content-Type": "application/json",
        ...(restOptions.headers || {}),
      },
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        (payload && typeof payload.error === "string" && payload.error)
        || (payload && typeof payload.message === "string" && payload.message)
        || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }

    if (String(error?.message || "").toLowerCase().includes("failed to fetch")) {
      throw new Error("Backend is unreachable. Check backend server and URL.");
    }

    throw error;
  } finally {
    timeout.clear();
  }
}
