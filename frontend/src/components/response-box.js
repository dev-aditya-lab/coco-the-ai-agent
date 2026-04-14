'use client';

import { AlertTriangle, Bot, TerminalSquare } from "lucide-react";
import { formatTimestamp } from "@/utils/response-utils";

export default function ResponseBox({ response, error }) {
  if (error) {
    return (
      <section className="animate-fade-in rounded-3xl border border-red-400/20 bg-red-500/8 p-5 sm:p-6" aria-live="polite">
        <div className="flex items-center gap-3 text-red-200">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <p className="text-sm font-medium tracking-wide">Request failed</p>
        </div>
        <p className="mt-3 text-sm leading-7 text-red-100/90">{error}</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-black/55 p-5 shadow-xl shadow-black/40 backdrop-blur-xl sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-zinc-500">
          <TerminalSquare className="h-4 w-4" aria-hidden="true" />
          <span>Output</span>
        </div>
        <p className="text-xs text-zinc-600">{formatTimestamp(response?.timestamp)}</p>
      </header>

      <div className="min-h-52 space-y-3 font-mono text-sm leading-7" aria-live="polite" aria-atomic="true">
        {response ? (
          <div key={response.timestamp} className="animate-slide-fade space-y-3">
            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/8 px-4 py-3 text-cyan-100">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/80">User command</p>
              <p className="mt-1 break-all text-cyan-100">{response.command}</p>
            </div>

            <div className="rounded-2xl border border-white/12 bg-white/3 px-4 py-3 text-zinc-200">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                <span>System response</span>
              </div>
              <p className="mt-1 text-zinc-100">{response.reply}</p>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in rounded-2xl border border-dashed border-white/10 bg-white/2 px-4 py-6 text-zinc-500">
            Response output appears here after you submit a command.
          </div>
        )}
      </div>
    </section>
  );
}