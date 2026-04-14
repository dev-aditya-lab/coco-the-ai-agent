'use client';

import { SendHorizontal, TerminalSquare } from "lucide-react";

export default function CommandInput({
  command,
  isLoading,
  onCommandChange,
  onCommandKeyDown,
  onSubmit,
}) {
  const isDisabled = isLoading;
  const canSubmit = command.trim().length > 0 && !isDisabled;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/3 p-5 shadow-xl shadow-black/50 backdrop-blur-xl sm:p-7">
      <form onSubmit={onSubmit} className="space-y-4">
        <label htmlFor="assistant-command" className="sr-only">
          Assistant command input
        </label>

        <div className="group relative">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors duration-300 group-focus-within:text-cyan-200">
            <TerminalSquare className="h-5 w-5" aria-hidden="true" />
          </div>

          <input
            id="assistant-command"
            name="command"
            type="text"
            autoComplete="off"
            spellCheck={false}
            disabled={isDisabled}
            value={command}
            onChange={(event) => onCommandChange(event.target.value)}
            onKeyDown={onCommandKeyDown}
            placeholder="Type a command and press Enter"
            className="h-14 w-full rounded-2xl border border-white/10 bg-black/60 pl-12 pr-16 text-base text-zinc-100 transition duration-300 placeholder:text-zinc-600 focus:border-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-65"
            aria-describedby="command-help"
          />

          <button
            type="submit"
            disabled={!canSubmit}
            className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 transition duration-300 hover:scale-[1.03] hover:border-cyan-300/45 hover:bg-cyan-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 disabled:scale-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-zinc-500"
            aria-label="Submit command"
          >
            <SendHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p id="command-help" className="text-xs uppercase tracking-[0.22em] text-zinc-500">
          Enter submits command
        </p>
      </form>
    </section>
  );
}