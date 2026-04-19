"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, SendHorizontal, Volume2, VolumeX } from "lucide-react";

const BROWSER_TTS_LANGUAGE = process.env.NEXT_PUBLIC_TTS_LANG || "hi-IN";
const BROWSER_TTS_GENDER = (process.env.NEXT_PUBLIC_TTS_GENDER || "female").toLowerCase() === "male"
  ? "male"
  : "female";

const DEMO_PROMPTS = [
  { label: "chat", prompt: "Hi COCO, how are you today?" },
  { label: "open_app", prompt: "Open calculator app" },
  { label: "open_website", prompt: "Open github.com" },
  { label: "play_youtube", prompt: "Play lofi coding songs on YouTube" },
  { label: "create_file", prompt: "Create file notes.md with project summary" },
  { label: "get_info", prompt: "What is the current time in India?" },
  { label: "get_user_info", prompt: "What is my name?" },
  { label: "research_web", prompt: "Do web research on latest AI agent frameworks with references" },
  { label: "send_email", prompt: "Draft email to demo@company.com with subject Sprint Update and body We completed phase 2." },
  { label: "schedule_reminder", prompt: "Set reminder for tomorrow 9 AM to review project tasks" },
  { label: "track_budget", prompt: "Track expense 450 in food category" },
  { label: "track_habit", prompt: "Mark habit workout as done" },
];

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
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("Voice idle");
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceSnippet, setVoiceSnippet] = useState("");
  const ttsVoiceRef = useRef(null);
  const lastSpokenMessageRef = useRef("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem("coco-muted");
    if (saved === "1") {
      setMuted(true);
    }
  }, []);

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
      setVoiceSupported(false);
      return undefined;
    }

    setVoiceSupported(true);
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
    if (!text || muted || !voiceSupported || typeof window === "undefined" || !window.speechSynthesis) {
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
  }, [latestAssistantMessage, muted, onStatusChange, voiceSupported]);

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
    if (!voiceSupported || !recognitionRef.current || loading) {
      return;
    }

    setVoiceSnippet("");

    try {
      if (listening) {
        recognitionRef.current.stop();
      } else {
        setVoiceError("");
        recognitionRef.current.start();
      }
    } catch {
      setVoiceError("Voice recognition is not available right now.");
      setListening(false);
    }
  };

  const toggleMute = () => {
    setMuted((previous) => {
      const next = !previous;
      if (next && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
      }
      return next;
    });
  };

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900 shadow-lg">
      <div className="border-b border-slate-700 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">Command Input</h2>
      </div>

      <form className="grid gap-3 p-4" onSubmit={submit}>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Type a command in English or Hinglish..."
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 outline-none focus:border-blue-500"
          rows={3}
          disabled={loading}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || !value.trim()}
          >
            <SendHorizontal size={16} />
            <span>{loading ? "Sending..." : "Send Command"}</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={toggleVoice}
            disabled={!voiceSupported || loading}
            aria-pressed={listening}
          >
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
            <span>{listening ? "Stop Voice" : "Voice Command"}</span>
          </button>

          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${muted ? "border-slate-500 bg-slate-700 text-slate-200" : "border-slate-600 bg-slate-800 text-slate-100"}`}
            onClick={toggleMute}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{muted ? "Muted" : "Voice Reply On"}</span>
          </button>
        </div>

        {!voiceSupported ? <p className="m-0 text-xs text-slate-400">Voice input is not supported in this browser.</p> : null}
        {voiceError ? <p className="m-0 text-xs text-red-300">{voiceError}</p> : null}
        {voiceSupported ? <p className="m-0 text-xs text-slate-400">{voiceStatus}</p> : null}
        {loading ? <p className="m-0 animate-pulse text-xs text-blue-200">COCO is thinking and planning actions...</p> : null}
        {speaking ? <p className="m-0 text-xs text-slate-300">Speaking response...</p> : null}
        {voiceSnippet ? <p className="m-0 text-xs text-slate-300">Heard: {voiceSnippet}</p> : null}
      </form>

      <div className="border-t border-slate-700 px-4 py-3">
        <p className="mb-2 text-xs font-medium text-slate-400">Demo prompts by tool</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEMO_PROMPTS.map((item) => (
            <button
              key={`${item.label}-${item.prompt}`}
              type="button"
              className="flex flex-col items-start gap-1 rounded-lg border border-slate-700 bg-slate-800 p-2 text-left hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => onSend(item.prompt)}
              disabled={loading}
            >
              <span className="rounded-md border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                {item.label}
              </span>
              <span className="text-xs text-slate-100">{item.prompt}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
