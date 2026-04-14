'use client';

import { LoaderCircle } from "lucide-react";

export default function Loader({ isLoading }) {
  return (
    <div
      className={`flex min-h-11 items-center gap-2 text-sm text-zinc-400 transition-all duration-300 ${
        isLoading ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" aria-hidden="true" />
      <span className="tracking-wide">Thinking...</span>
    </div>
  );
}