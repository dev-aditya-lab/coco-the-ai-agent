import { env } from "../config/env.js";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const voiceCache = new Map();

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLanguage(value) {
  const language = typeof value === "string" ? value.trim() : "";
  return language || "hi-IN";
}

function pickVoiceId(language) {
  const normalizedLanguage = normalizeLanguage(language).toLowerCase();
  const isHindi = normalizedLanguage.startsWith("hi");

  if (isHindi && env.elevenLabsHindiVoiceId) {
    return env.elevenLabsHindiVoiceId;
  }

  return env.elevenLabsVoiceId;
}

function getCachedAudio(cacheKey) {
  const entry = voiceCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    voiceCache.delete(cacheKey);
    return null;
  }

  return entry.value;
}

export async function synthesizeWithElevenLabs(inputText, options = {}) {
  const text = normalizeText(inputText);
  const language = normalizeLanguage(options.language);
  const voiceId = pickVoiceId(language);
  const modelId = env.elevenLabsModelId;

  if (!text) {
    const error = new Error("Text is required for voice synthesis.");
    error.statusCode = 400;
    throw error;
  }

  if (!env.elevenLabsApiKey) {
    const error = new Error("ElevenLabs API key is not configured.");
    error.statusCode = 503;
    throw error;
  }

  if (!voiceId) {
    const error = new Error("ElevenLabs voice ID is not configured.");
    error.statusCode = 503;
    throw error;
  }

  const cacheKey = `${voiceId}|${modelId}|${language}|${text}`;
  const cachedAudio = getCachedAudio(cacheKey);

  if (cachedAudio) {
    return {
      provider: "elevenlabs",
      mimeType: "audio/mpeg",
      audioBase64: cachedAudio,
      cached: true,
      language,
      voiceId,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/${voiceId}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": env.elevenLabsApiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        language_code: language,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const error = new Error(`ElevenLabs request failed: ${response.status}${detail ? ` ${detail}` : ""}`);
      error.statusCode = response.status;
      throw error;
    }

    const mimeType = response.headers.get("content-type") || "audio/mpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    const audioBase64 = buffer.toString("base64");

    voiceCache.set(cacheKey, {
      value: audioBase64,
      expiresAt: Date.now() + env.voiceCacheTtlMs,
    });

    return {
      provider: "elevenlabs",
      mimeType,
      audioBase64,
      cached: false,
      language,
      voiceId,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
