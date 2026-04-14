'use client';

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

export default function VoiceInput({
  disabled,
  continuous = false,
  language = "en-IN",
  autoSubmit = true,
  onTranscript,
  onError,
  onListeningChange,
}) {
  const recognitionRef = useRef(null);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const onListeningChangeRef = useRef(onListeningChange);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    onListeningChangeRef.current = onListeningChange;
  }, [onTranscript, onError, onListeningChange]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      onErrorRef.current?.("Voice input is not supported in this browser.");
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      onListeningChangeRef.current?.(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      onListeningChangeRef.current?.(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      onListeningChangeRef.current?.(false);

      if (event.error === "not-allowed") {
        onErrorRef.current?.("Microphone permission denied. Please allow microphone access.");
        return;
      }

      if (event.error === "no-speech") {
        onErrorRef.current?.("No speech detected. Please try again.");
        return;
      }

      if (event.error === "language-not-supported") {
        onErrorRef.current?.("Selected voice language is not supported. Falling back to English.");
        return;
      }

      onErrorRef.current?.("Voice input failed. Please type your command.");
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      if (transcript) {
        onTranscriptRef.current?.(transcript, { autoSubmit });
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignore teardown errors when recognition was never started.
      }
      recognitionRef.current = null;
    };
  }, [continuous, language, autoSubmit]);

  function toggleListening() {
    if (disabled || !recognitionRef.current) {
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        onErrorRef.current?.("Could not stop microphone cleanly.");
      }
      return;
    }

    try {
      recognitionRef.current.start();
    } catch {
      onErrorRef.current?.("Microphone could not start. Please try again.");
    }
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled || !isSupported}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-60 ${
        isListening
          ? "border-red-300/35 bg-red-400/12 text-red-200 shadow-[0_0_18px_rgba(248,113,113,0.24)]"
          : "border-white/12 bg-black/35 text-zinc-300 hover:border-cyan-300/35 hover:text-cyan-200"
      }`}
      aria-label={isListening ? "Stop voice input" : "Start voice input"}
      title={isListening ? "Stop listening" : "Start listening"}
    >
      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}