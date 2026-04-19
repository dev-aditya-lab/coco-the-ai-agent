import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFilePath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: envFilePath });

export const env = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3001",
  mongodbUri: process.env.MONGODB_URI || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  hindsightApiKey: process.env.HINDSIGHT_API_KEY || "",
  hindsightApiEndpoint: process.env.HINDSIGHT_API_ENDPOINTS || process.env.HINDSIGHT_API_URL || "",
  hindsightApiUrl: process.env.HINDSIGHT_API_URL || process.env.HINDSIGHT_API_ENDPOINTS || "",
  hindsightBankId: process.env.HINDSIGHT_BANK_ID || "coco",
  tavilyApiKey: process.env.TAVILY_API_KEY || "",
  qwenModel: process.env.QWEN_MODEL || "qwen/qwen3-32b",
  gptModel: process.env.GPT_MODEL || "openai/gpt-oss-120b",
  actionOutputDir: process.env.ACTION_OUTPUT_DIR || "generated",
  puppeteerHeadless: (process.env.PUPPETEER_HEADLESS || "false").toLowerCase() === "true",
  actionStopOnFailure: (process.env.ACTION_STOP_ON_FAILURE || "true").toLowerCase() === "true",
};