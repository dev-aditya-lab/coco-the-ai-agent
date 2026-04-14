'use client';

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

export default function VoiceInput({
  disabled,
  continuous = false,
  onTranscript,
  onError,
  onListeningChange,
}) {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError?.("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      onListeningChange?.(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      onListeningChange?.(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      onListeningChange?.(false);

      if (event.error === "not-allowed") {
        onError?.("Microphone permission denied. Please allow microphone access.");
        return;
      }

      if (event.error === "no-speech") {
        onError?.("No speech detected. Please try again.");
        return;
      }

      onError?.("Voice input failed. Please type your command.");
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      if (transcript) {
        onTranscript?.(transcript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [continuous, onError, onListeningChange, onTranscript]);

  function toggleListening() {
    if (disabled || !recognitionRef.current) {
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    recognitionRef.current.start();
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled || !recognitionRef.current}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-60 ${
        isListening
          ? "border-red-300/35 bg-red-400/12 text-red-200"
          : "border-white/12 bg-black/35 text-zinc-300 hover:border-cyan-300/35 hover:text-cyan-200"
      }`}
      aria-label={isListening ? "Stop voice input" : "Start voice input"}
      title={isListening ? "Stop listening" : "Start listening"}
    >
      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}