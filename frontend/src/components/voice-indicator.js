'use client';

export default function VoiceIndicator({ isListening, isSpeaking }) {
  if (!isListening && !isSpeaking) {
    return (
      <div className="h-6 text-xs uppercase tracking-[0.24em] text-zinc-600">
        voice idle
      </div>
    );
  }

  if (isListening) {
    return (
      <div className="h-6 text-xs uppercase tracking-[0.24em] text-red-200" aria-live="polite">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-300 shadow-[0_0_10px_rgba(252,165,165,0.8)]" aria-hidden="true" />
          <span>Listening...</span>
        </span>
      </div>
    );
  }

  return (
    <div className="h-6 text-xs uppercase tracking-[0.24em] text-cyan-100" aria-live="polite">
      <span className="inline-flex items-center gap-2">
        <span>Speaking...</span>
        <span className="inline-flex items-end gap-0.5" aria-hidden="true">
          <span className="h-2 w-0.5 animate-wave rounded bg-cyan-300 [animation-delay:0ms]" />
          <span className="h-3 w-0.5 animate-wave rounded bg-cyan-300 [animation-delay:120ms]" />
          <span className="h-2 w-0.5 animate-wave rounded bg-cyan-300 [animation-delay:240ms]" />
          <span className="h-3 w-0.5 animate-wave rounded bg-cyan-300 [animation-delay:360ms]" />
        </span>
      </span>
    </div>
  );
}
