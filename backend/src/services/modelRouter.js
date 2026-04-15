import { requestInfoTextGpt } from "./gptService.js";
import { requestActionPlanQwen, requestInfoTextQwen } from "./qwenService.js";

function normalizeInput(input) {
  return typeof input === "string" ? input.toLowerCase().trim() : "";
}

export function detectTaskType(input) {
  const text = normalizeInput(input);

  if (!text) {
    return "chat";
  }

  if (
    text.includes("who is")
    || text.includes("what is")
    || text.includes("how does")
    || text.includes("explain")
    || text.startsWith("who ")
    || text.startsWith("what ")
    || text.startsWith("how ")
  ) {
    return "info";
  }

  if (text.includes("open") || text.includes("play") || text.includes("create")) {
    return "action";
  }

  return "chat";
}

export async function routeActionPlan(input, history = []) {
  const type = detectTaskType(input);

  if (type === "info") {
    console.info("[model-router] planner_model", {
      taskType: type,
      model: "router-shortcut",
    });

    return JSON.stringify({
      steps: [
        {
          action: "get_info",
          parameters: {
            query: input,
          },
        },
      ],
    });
  }

  console.info("[model-router] planner_model", {
    taskType: type,
    model: "qwen",
  });

  return requestActionPlanQwen(input, history);
}

export async function routeInfoResponse(input, responseStyle = "english") {
  const style = responseStyle === "bilingual" ? "bilingual" : "english";
  const type = detectTaskType(input);
  const styleInstruction = style === "bilingual"
    ? "Respond once in natural mixed Hinglish. Do not add a separate translated line."
    : "Respond only in English, in 1-2 short lines.";
  const styledInput = `${input}\n\nStyle rule: ${styleInstruction}`;

  if (type === "info") {
    console.info("[model-router] info_model", {
      taskType: type,
      model: "gpt",
    });
    return requestInfoTextGpt(styledInput);
  }

  console.info("[model-router] info_model", {
    taskType: type,
    model: "qwen",
  });
  return requestInfoTextQwen(styledInput);
}
