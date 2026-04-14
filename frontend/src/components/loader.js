'use client';

import { CheckCircle2, LoaderCircle } from "lucide-react";

const STATUS_LABELS = {
  understanding: "Understanding command...",
  executing: "Executing action...",
  completed: "Completed",
};

export default function Loader({ phase, isVisible }) {
  const isBusy = phase === "understanding" || phase === "executing";
  const label = STATUS_LABELS[phase] || "";

  return (
    <div
      className={`flex min-h-11 items-center gap-2 text-sm transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      {isBusy ? (
        <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
      )}
      <span className={isBusy ? "tracking-wide text-zinc-300" : "tracking-wide text-emerald-200"}>
        {label}
      </span>
    </div>
  );
}