'use client';

import { History, RotateCw } from "lucide-react";

function formatHistoryTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function HistoryPanel({ history, isLoading, onReuse, onRefresh }) {
  return (
    <section className="space-y-3 rounded-3xl border border-white/10 bg-black/35 p-4 backdrop-blur-xl sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-zinc-500">
          <History className="h-4 w-4" aria-hidden="true" />
          <span>Command history</span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-white/3 text-zinc-300 transition hover:border-cyan-300/35 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 disabled:opacity-60"
          aria-label="Refresh history"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {history.length ? (
        <ul className="space-y-2">
          {history.map((entry) => (
            <li key={entry._id || `${entry.command}-${entry.createdAt}`}>
              <button
                type="button"
                onClick={() => onReuse(entry.command)}
                className="w-full rounded-xl border border-white/8 bg-white/2 px-3 py-2 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
              >
                <p className="truncate text-sm text-zinc-200">{entry.command}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                  <span>{entry.action || "-"}</span>
                  <span>{formatHistoryTime(entry.createdAt)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/2 px-3 py-4 text-sm text-zinc-500">
          No command history yet.
        </p>
      )}
    </section>
  );
}