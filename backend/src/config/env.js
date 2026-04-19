import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFilePath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: envFilePath });

export const env = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:4000,http://localhost:4001,http://localhost:4003,http://localhost:5000,http://localhost:5001,http://localhost:5002",
  mongodbUri: process.env.MONGODB_URI || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
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
  openclawEnabled: (process.env.OPENCLAW_ENABLED || "true").toLowerCase() === "true",
  openclawExecutable: process.env.OPENCLAW_EXECUTABLE || "",
  openclawTimeoutMs: Math.max(3000, Number(process.env.OPENCLAW_TIMEOUT_MS || 45000)),
  openclawModel: process.env.OPENCLAW_MODEL || "groq/llama-3.1-8b-instant",
  openclawMaxHistoryEntries: Math.max(0, Number(process.env.OPENCLAW_MAX_HISTORY_ENTRIES || 4)),
  openclawMaxMemoryChars: Math.max(0, Number(process.env.OPENCLAW_MAX_MEMORY_CHARS || 1200)),
  openclawMaxStepMessageChars: Math.max(0, Number(process.env.OPENCLAW_MAX_STEP_MESSAGE_CHARS || 120)),
  agentAutonomousMode: (process.env.AGENT_AUTONOMOUS_MODE || "true").toLowerCase() === "true",
  agentAutonomousMaxIterations: Math.max(1, Number(process.env.AGENT_AUTONOMOUS_MAX_ITERATIONS || 4)),
  cocoFilesDir: process.env.COCO_FILES_DIR || "coco_files",
  cocoUserName: process.env.COCO_USER_NAME || "Friend",
  cocoUserEmail: process.env.COCO_USER_EMAIL || "email@example.com",
  cocoUserPhone: process.env.COCO_USER_PHONE || "Not set",
  resendMail: (process.env.RESEND_MAIL || "").trim(),
};