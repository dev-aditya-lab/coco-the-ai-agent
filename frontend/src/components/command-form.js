'use client';

import { SendHorizontal } from "lucide-react";

export default function CommandForm({ command, onCommandChange, onSubmit, isLoading }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="sr-only" htmlFor="assistant-command">
        Command input
      </label>

      <div className="rounded-3xl border border-white/10 bg-black/60 p-3 shadow-inner shadow-black/20 transition focus-within:border-cyan-400/40 focus-within:ring-1 focus-within:ring-cyan-400/30">
        <textarea
          id="assistant-command"
          name="command"
          rows={4}
          value={command}
          onChange={(event) => onCommandChange(event.target.value)}
          placeholder="Ask Coco to analyze, plan, search, or act..."
          className="min-h-28 w-full resize-none border-0 bg-transparent px-3 py-2 text-base leading-7 text-zinc-100 outline-none placeholder:text-zinc-600"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-500">
          The backend is wired for future AI integration.
        </p>

        <button
          type="submit"
          disabled={isLoading || !command.trim()}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Submit command"
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}