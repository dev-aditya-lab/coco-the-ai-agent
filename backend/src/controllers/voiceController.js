import { synthesizeWithElevenLabs } from "../services/voiceService.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function postVoice(req, res) {
  const text = normalizeText(req.body?.text);
  const language = typeof req.body?.language === "string" ? req.body.language.trim() : "";

  if (!text) {
    return res.status(400).json({
      success: false,
      error: "text is required.",
      fallbackSuggested: true,
    });
  }

  try {
    const result = await synthesizeWithElevenLabs(text, { language });

    return res.status(200).json({
      success: true,
      provider: result.provider,
      mimeType: result.mimeType,
      audioBase64: result.audioBase64,
      cached: Boolean(result.cached),
      language: result.language,
      voiceId: result.voiceId,
      normalizedText: result.normalizedText || text,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice generation failed.";

    return res.status(502).json({
      success: false,
      error: message,
      fallbackSuggested: true,
      provider: "browser",
    });
  }
}
