"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, SendHorizontal, Volume2, VolumeX } from "lucide-react";

const BROWSER_TTS_LANGUAGE = process.env.NEXT_PUBLIC_TTS_LANG || "hi-IN";
const BROWSER_TTS_GENDER = (process.env.NEXT_PUBLIC_TTS_GENDER || "female").toLowerCase() === "male"
  ? "male"
  : "female";

function chooseVoice(voices, language, gender) {
  if (!Array.isArray(voices) || voices.length === 0) {
    return null;
  }

  const lang = String(language || "hi-IN").toLowerCase();
  const genderPattern = gender === "male"
    ? /male|rahul|aditya|arjun|hemant|karan/i
    : /female|zira|swara|kalpana|sneha|priya/i;

  return (
    voices.find((voice) => voice.lang?.toLowerCase() === lang && genderPattern.test(voice.name))
    || voices.find((voice) => voice.lang?.toLowerCase() === lang)
    || voices.find((voice) => genderPattern.test(voice.name))
    || voices[0]
    || null
  );
}

export default function Composer({ loading, onSend, latestAssistantMessage = "", onStatusChange }) {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceSupported] = useState(
    () => typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [speechOutputSupported] = useState(
    () => typeof window !== "undefined" && Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance)
  );
  const [voiceError, setVoiceError] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("Voice idle");
  const [muted, setMuted] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("coco-muted") === "1"
  );
  const [speaking, setSpeaking] = useState(false);
  const [voiceSnippet, setVoiceSnippet] = useState("");
  const ttsVoiceRef = useRef(null);
  const lastSpokenMessageRef = useRef("");
  const recognitionRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetriesRef = useRef(2);

  const stopSpeechImmediately = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    // Some browser voices need both pause+cancel to stop instantly.
    window.speechSynthesis.pause();
    window.speechSynthesis.cancel();
    setTimeout(() => {
      window.speechSynthesis.cancel();
    }, 0);
    setTimeout(() => {
      window.speechSynthesis.cancel();
    }, 80);

    setSpeaking(false);
    onStatusChange?.("idle");
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("coco-muted", muted ? "1" : "0");
    }
  }, [muted]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return undefined;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setVoiceError("");
      setListening(true);
      setVoiceStatus("Listening for command");
      onStatusChange?.("listening");
    };

    recognition.onend = () => {
      setListening(false);
      setVoiceStatus("Voice idle");
      onStatusChange?.(loading ? "thinking" : "idle");
    };

    recognition.onerror = (event) => {
      setVoiceError(event?.error ? `Voice error: ${event.error}` : "Voice recognition failed.");
      setListening(false);
      setVoiceStatus("Voice error");
      onStatusChange?.("idle");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const part = event.results[index]?.[0]?.transcript || "";
        if (event.results[index]?.isFinal) {
          finalTranscript += part;
        } else {
          interimTranscript += part;
        }
      }

      if (interimTranscript.trim()) {
        setVoiceSnippet(interimTranscript.trim());
      }

      const cleaned = finalTranscript.trim();
      if (!cleaned) {
        return;
      }

      setVoiceSnippet(cleaned);
      onSend(cleaned);
      setValue("");
      setVoiceStatus("Command sent from voice");
      onStatusChange?.("thinking");
    };

    recognitionRef.current = recognition;

    const syncVoices = () => {
      const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
      ttsVoiceRef.current = chooseVoice(voices, BROWSER_TTS_LANGUAGE, BROWSER_TTS_GENDER);
    };

    syncVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = syncVoices;
    }

    return () => {
      try {
        recognition.stop();
      } catch {
        // no-op
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
      recognitionRef.current = null;
    };
  }, [loading, onSend, onStatusChange]);

  useEffect(() => {
    const text = String(latestAssistantMessage || "").trim();
    if (!text || muted || !speechOutputSupported || typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    if (lastSpokenMessageRef.current === text) {
      return;
    }

    lastSpokenMessageRef.current = text;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = BROWSER_TTS_LANGUAGE;
    utterance.rate = 0.95;
    utterance.pitch = 1;

    if (ttsVoiceRef.current) {
      utterance.voice = ttsVoiceRef.current;
    }

    utterance.onstart = () => {
      setSpeaking(true);
      setVoiceStatus("COCO speaking");
      onStatusChange?.("speaking");
    };

    utterance.onend = () => {
      setSpeaking(false);
      setVoiceStatus("Voice idle");
      onStatusChange?.("idle");
    };

    utterance.onerror = () => {
      setSpeaking(false);
      setVoiceStatus("Speech output failed");
      onStatusChange?.("idle");
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [latestAssistantMessage, muted, onStatusChange, speechOutputSupported]);

  useEffect(() => {
    if (loading && !listening) {
      onStatusChange?.("thinking");
      return;
    }

    if (!loading && !listening && !speaking) {
      onStatusChange?.("idle");
    }
  }, [listening, loading, onStatusChange, speaking]);

  const submit = (event) => {
    event.preventDefault();
    if (!value.trim()) {
      return;
    }

    onSend(value);
    setValue("");
  };

  const toggleVoice = () => {
    if (muted || !voiceSupported || !recognitionRef.current || loading) {
      return;
    }

    setVoiceSnippet("");

    try {
      if (listening) {
        recognitionRef.current.stop();
        retryCountRef.current = 0;
      } else {
        setVoiceError("");
        retryCountRef.current = 0;
        recognitionRef.current.start();
      }
    } catch (error) {
      if (retryCountRef.current < maxRetriesRef.current) {
        retryCountRef.current += 1;
        const delay = Math.pow(2, retryCountRef.current) * 100;
        setTimeout(toggleVoice, delay);
      } else {
        setVoiceError("Voice recognition is not available right now. Please refresh the page.");
        setListening(false);
        retryCountRef.current = 0;
      }
    }
  };

  const toggleMute = () => {
    setMuted((previous) => {
      const nextMuted = !previous;
      if (nextMuted) {
        stopSpeechImmediately();
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            // no-op
          }
        }
        setListening(false);
        setVoiceSnippet("");
        setVoiceStatus("Voice muted");
      } else {
        setVoiceStatus("Voice idle");
      }
      return nextMuted;
    });
  };

  const helperStatus = voiceError
    || (loading ? "COCO is thinking and planning actions..." : "")
    || (muted ? "Voice is muted." : "")
    || (speaking ? "Speaking response..." : "")
    || (voiceSnippet ? `Heard: ${voiceSnippet}` : "")
    || (!voiceSupported ? "Voice input is not supported in this browser." : voiceStatus);

  return (
    <section className="rounded-xl border border-slate-700/90 bg-slate-900/95 shadow-[0_12px_36px_-20px_rgba(2,6,23,0.95)]">
      <form className="grid gap-2 p-2" onSubmit={submit}>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Type a command in English or Hinglish..."
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
          rows={2}
          disabled={loading}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || !value.trim()}
          >
            <SendHorizontal size={16} />
            <span>{loading ? "Sending..." : "Send Command"}</span>
          </button>

          {typeof window !== "undefined" && (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={toggleVoice}
                disabled={muted || !voiceSupported || loading}
                aria-pressed={listening}
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
                <span>{listening ? "Stop Voice" : "Voice Command"}</span>
              </button>

              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${muted ? "border-slate-500 bg-slate-700 text-slate-200" : "border-slate-600 bg-slate-800 text-slate-100"}`}
                onPointerDown={!muted ? stopSpeechImmediately : undefined}
                onClick={toggleMute}
                disabled={!speechOutputSupported && !voiceSupported}
                aria-pressed={muted}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                <span>{muted ? "Muted" : "Voice Reply On"}</span>
              </button>
            </>
          )}
        </div>

        {typeof window !== "undefined" && helperStatus ? (
          <p className={`m-0 truncate text-xs ${voiceError ? "text-red-300" : "text-slate-400"}`}>{helperStatus}</p>
        ) : null}
      </form>
    </section>
  );
}
