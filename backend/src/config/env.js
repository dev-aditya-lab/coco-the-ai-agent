import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  mongodbUri: process.env.MONGODB_URI || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  qwenModel: process.env.QWEN_MODEL || "qwen/qwen3-32b",
  gptModel: process.env.GPT_MODEL || "openai/gpt-oss-120b",
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || "",
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB",
  elevenLabsHindiVoiceId: process.env.ELEVENLABS_HINDI_VOICE_ID || "",
  elevenLabsModelId: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
  voiceCacheTtlMs: Number(process.env.VOICE_CACHE_TTL_MS || 180000),
  actionOutputDir: process.env.ACTION_OUTPUT_DIR || "generated",
  puppeteerHeadless: (process.env.PUPPETEER_HEADLESS || "false").toLowerCase() === "true",
  actionStopOnFailure: (process.env.ACTION_STOP_ON_FAILURE || "true").toLowerCase() === "true",
};