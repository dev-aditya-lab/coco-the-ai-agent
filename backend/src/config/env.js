import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  mongodbUri: process.env.MONGODB_URI || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  qwenModel: process.env.QWEN_MODEL || "qwen/qwen3-32b",
  gptModel: process.env.GPT_MODEL || "openai/gpt-oss-120b",
  actionOutputDir: process.env.ACTION_OUTPUT_DIR || "generated",
  puppeteerHeadless: (process.env.PUPPETEER_HEADLESS || "false").toLowerCase() === "true",
  actionStopOnFailure: (process.env.ACTION_STOP_ON_FAILURE || "true").toLowerCase() === "true",
};