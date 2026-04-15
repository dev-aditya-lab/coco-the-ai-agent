'use client';

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import AssistantLayout from "@/components/assistant-layout";
import CommandInput from "@/components/command-input";
import CommandSuggestions from "@/components/command-suggestions";
import HistoryPanel from "@/components/HistoryPanel";
import StatusIndicator from "@/components/status-indicator";
import TerminalView from "@/components/terminal-view";
import VoiceInput from "@/components/VoiceInput";
import VoiceIndicator from "@/components/voice-indicator";
import { fetchCommandHistory, submitCommand } from "@/services/assistant-service";

const PHASE = {
  idle: "idle",
  understanding: "understanding",
  executing: "executing",
  completed: "completed",
  error: "error",
};

const HINGLISH_LANGUAGES = ["en-IN", "hi-IN"];

function normalizeTtsLanguage(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    return "hi-IN";
  }

  if (normalized.toLowerCase() === "in-hi") {
    return "hi-IN";
  }

  return normalized;
}

const BROWSER_TTS_LANGUAGE = normalizeTtsLanguage(process.env.NEXT_PUBLIC_TTS_LANG || "hi-IN");
const BROWSER_TTS_GENDER = (process.env.NEXT_PUBLIC_TTS_GENDER || "female").toLowerCase() === "male"
  ? "male"
  : "female";

function pickHinglishVoice(voices, preferredGender = "female", preferredLanguage = "hi-IN") {
  if (!Array.isArray(voices) || voices.length === 0) {
    return null;
  }

  const targetLanguages = [preferredLanguage, ...HINGLISH_LANGUAGES].filter(Boolean);
  const isMalePreferred = preferredGender === "male";
  const genderPattern = isMalePreferred
    ? /male|rahul|aditya|arjun|hemant|karan|madhur/i
    : /female|zira|swara|kalpana|heera|sneha|priya/i;

  const femaleByLang = voices.find(
    (voice) => targetLanguages.includes(voice.lang) && genderPattern.test(voice.name)
  );
  if (femaleByLang) {
    return femaleByLang;
  }

  const byLang = voices.find((voice) => targetLanguages.includes(voice.lang));
  if (byLang) {
    return byLang;
  }

  const femaleByName = voices.find(
    (voice) => /india|indian|hindi|hinglish/i.test(voice.name) && genderPattern.test(voice.name)
  );
  if (femaleByName) {
    return femaleByName;
  }

  const byName = voices.find((voice) => /india|indian|hindi|hinglish/i.test(voice.name));
  if (byName) {
    return byName;
  }

  const femaleAny = voices.find((voice) => genderPattern.test(voice.name));
  if (femaleAny) {
    return femaleAny;
  }

  return byName || null;
}

function userFriendlyStepError(action) {
  if (action === "open_app") {
    return "Failed to open application";
  }

  if (action === "play_youtube") {
    return "Failed to play YouTube content";
  }

  if (action === "create_file") {
    return "Failed to create file";
  }

  return "Could not process request";
}

function normalizeSteps(rawSteps) {
  if (!Array.isArray(rawSteps)) {
    return [];
  }

  return rawSteps.map((step, index) => {
    const action = typeof step?.action === "string" ? step.action : "get_info";
    const status = step?.status === "completed" ? "completed" : "failed";
    const safeMessage = status === "completed"
      ? (typeof step?.message === "string" && step.message.trim() ? step.message : "Completed")
      : userFriendlyStepError(action);

    return {
      stepNumber: Number(step?.stepNumber) || index + 1,
      action,
      parameters: step?.parameters && typeof step.parameters === "object" ? step.parameters : {},
      status,
      message: safeMessage,
      details: step?.details && typeof step.details === "object" ? step.details : {},
    };
  });
}

function normalizeResponse(rawResponse, fallbackCommand) {
  if (!rawResponse || typeof rawResponse !== "object") {
    return {
      success: false,
      stepsExecuted: [],
      finalMessage: "Could not process request.",
      command: fallbackCommand,
    };
  }

  const modernSteps = normalizeSteps(rawResponse.stepsExecuted);

  if (modernSteps.length > 0) {
    return {
      success: Boolean(rawResponse.success),
      stepsExecuted: modernSteps,
      finalMessage: typeof rawResponse.finalMessage === "string"
        ? rawResponse.finalMessage
        : (modernSteps.every((step) => step.status === "completed")
            ? "Completed"
            : "Could not complete all steps"),
      command: fallbackCommand,
      timestamp: rawResponse.timestamp,
    };
  }

  // Backward compatibility for older backend payloads.
  if (rawResponse.data && rawResponse.execution) {
    const legacyStep = normalizeSteps([
      {
        stepNumber: 1,
        action: rawResponse.data.action,
        parameters: rawResponse.data.parameters,
        status: rawResponse.execution.status,
        message: rawResponse.execution.message,
        details: rawResponse.execution.details,
      },
    ]);

    return {
      success: legacyStep[0]?.status === "completed",
      stepsExecuted: legacyStep,
      finalMessage: legacyStep[0]?.status === "completed" ? "Completed" : "Could not process request",
      command: fallbackCommand,
      timestamp: rawResponse.timestamp,
    };
  }

  return {
    success: false,
    stepsExecuted: [],
    finalMessage: "Could not process request.",
    command: fallbackCommand,
    timestamp: rawResponse.timestamp,
  };
}

export default function AssistantConsole() {
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState(PHASE.idle);
  const [history, setHistory] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voiceStatusText, setVoiceStatusText] = useState("");
  const speechRef = useRef(null);
  const lastSpokenKeyRef = useRef("");

  const showStatus = isLoading || phase === PHASE.completed || phase === PHASE.error;

  useEffect(() => {
    refreshHistory();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    const syncVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = pickHinglishVoice(voices, BROWSER_TTS_GENDER, BROWSER_TTS_LANGUAGE);
      setSelectedVoice(preferred);
    };

    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (!response?.finalMessage) {
      return;
    }

    if (isMuted || typeof window === "undefined") {
      return;
    }

    const speakKey = `${response.timestamp || ""}-${response.finalMessage}`;

    if (lastSpokenKeyRef.current === speakKey) {
      return;
    }

    lastSpokenKeyRef.current = speakKey;

    let cancelled = false;

    const stopAllSpeech = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };

    const playBrowserTts = () => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setError("Voice output unavailable. Please check browser audio settings.");
        setIsSpeaking(false);
        setVoiceStatusText("");
        return;
      }

      const utterance = new SpeechSynthesisUtterance(response.finalMessage);
      utterance.lang = selectedVoice?.lang || BROWSER_TTS_LANGUAGE;
      utterance.rate = 0.95;
      utterance.pitch = 1;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        if (cancelled) {
          return;
        }
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        if (cancelled) {
          return;
        }
        setIsSpeaking(false);
        setVoiceStatusText("");
      };

      utterance.onerror = () => {
        if (cancelled) {
          return;
        }
        setIsSpeaking(false);
        setVoiceStatusText("");
        setError("Voice output unavailable. Please check browser audio settings.");
      };

      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    stopAllSpeech();
    setVoiceStatusText(`Speaking (${BROWSER_TTS_GENDER})...`);
    playBrowserTts();

    return () => {
      cancelled = true;
      stopAllSpeech();
      setIsSpeaking(false);
      setVoiceStatusText("");
    };
  }, [response, isMuted, selectedVoice]);

  async function refreshHistory() {
    const records = await fetchCommandHistory(10);
    setHistory(Array.isArray(records) ? records : []);
  }

  async function runCommand(nextCommand) {
    const trimmedCommand = nextCommand.trim();
    if (!trimmedCommand || isLoading) {
      return;
    }

    setCommand(trimmedCommand);
    setIsLoading(true);
    setError(null);
    setPhase(PHASE.understanding);

    const phaseTimer = setTimeout(() => {
      setPhase(PHASE.executing);
    }, 450);

    try {
      const rawResponse = await submitCommand(trimmedCommand);
      const nextResponse = normalizeResponse(rawResponse, trimmedCommand);
      setResponse(nextResponse);
      setPhase(PHASE.completed);
      setCommand("");
      refreshHistory();
    } catch {
      setError("Could not process request.");
      setPhase(PHASE.error);
    } finally {
      clearTimeout(phaseTimer);
      setIsLoading(false);

      setTimeout(() => {
        setPhase((currentPhase) => (currentPhase === PHASE.completed ? PHASE.idle : currentPhase));
      }, 900);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    runCommand(command);
  }

  function handleCommandKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      runCommand(command);
    }
  }

  function handleSuggestion(commandValue) {
    runCommand(commandValue);
  }

  function handleVoiceTranscript(transcript, options = {}) {
    setCommand(transcript);

    if (options.autoSubmit !== false) {
      runCommand(transcript);
    }
  }

  function handleVoiceError(message) {
    setError(message || "Voice input failed. Please type your command.");
  }

  function toggleMute() {
    if (typeof window !== "undefined") {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }

    setIsSpeaking(false);
    setVoiceStatusText("");
    setIsMuted((prev) => !prev);
  }

  return (
    <AssistantLayout>
      <CommandInput
        command={command}
        isLoading={isLoading}
        onCommandChange={setCommand}
        onCommandKeyDown={handleCommandKeyDown}
        onSubmit={handleSubmit}
      />
      <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/45 p-3 sm:grid-cols-2 sm:p-4">
        <StatusIndicator isVisible={showStatus} phase={phase} />
        <VoiceIndicator isListening={isListening} isSpeaking={isSpeaking} voiceStatusText={voiceStatusText} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <VoiceInput
          disabled={isLoading}
          onError={handleVoiceError}
          onListeningChange={setIsListening}
          onTranscript={handleVoiceTranscript}
        />

        <button
          type="button"
          onClick={toggleMute}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-black/35 text-zinc-300 transition hover:border-cyan-300/35 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
          aria-label={isMuted ? "Unmute speech" : "Mute speech"}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>

      <TerminalView command={command} error={error} phase={phase} response={response} />

      <CommandSuggestions isLoading={isLoading} onUseCommand={handleSuggestion} />
      <HistoryPanel history={history} isLoading={isLoading} onRefresh={refreshHistory} onReuse={handleSuggestion} />
    </AssistantLayout>
  );
}