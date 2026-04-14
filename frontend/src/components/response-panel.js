'use client';

import { AlertTriangle, Bot, Clock3 } from "lucide-react";
import { formatTimestamp } from "@/utils/response-utils";

export default function ResponsePanel({ response, error }) {
  if (error) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/5 px-6 py-8 text-center">
        <AlertTriangle className="h-8 w-8 text-red-300" />
        <p className="mt-4 text-lg font-medium text-red-100">Request failed</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-red-200/80">{error}</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/2 px-6 py-8 text-center">
        <Bot className="h-10 w-10 text-zinc-500" />
        <p className="mt-4 text-lg font-medium text-zinc-200">Awaiting command</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
          Send a command to see the backend response in a clean, terminal-style panel.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-64 flex-col justify-between rounded-3xl border border-white/10 bg-black/50 p-5">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
          <Clock3 className="h-3.5 w-3.5" />
          <span>{formatTimestamp(response.timestamp)}</span>
        </div>

        <p className="rounded-2xl border border-white/10 bg-white/3 px-4 py-3 font-mono text-sm leading-7 text-zinc-100">
          {response.reply}
        </p>
      </div>

      <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 text-sm text-zinc-400 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Command</p>
          <p className="mt-2 wrap-break-word text-zinc-200">{response.command}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Status</p>
          <p className="mt-2 text-zinc-200">{response.status}</p>
        </div>
      </div>
    </div>
  );
}