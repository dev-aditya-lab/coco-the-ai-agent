'use client';

import { MousePointerClick, WandSparkles } from "lucide-react";

const DEMO_COMMANDS = [
  { label: "Open Chrome", value: "Open Chrome" },
  { label: "Play a song on YouTube", value: "Play a song on YouTube" },
  { label: "Create a Python file", value: "Create a Python file named demo.py with hello world" },
];

const SUGGESTED_COMMANDS = [
  "Create a JavaScript file called hello.js",
  "Open VS Code",
  "Search YouTube for lo-fi coding music",
  "Get info about Python roadmap",
];

export default function CommandSuggestions({ onUseCommand, isLoading }) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-black/45 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-zinc-500">
        <MousePointerClick className="h-4 w-4" aria-hidden="true" />
        <span>Demo mode</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {DEMO_COMMANDS.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={isLoading}
            onClick={() => onUseCommand(item.value)}
            className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 font-mono text-xs text-cyan-100 transition duration-200 hover:border-cyan-300/45 hover:bg-cyan-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-zinc-500">
          <WandSparkles className="h-4 w-4" aria-hidden="true" />
          <span>Suggestions</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {SUGGESTED_COMMANDS.map((item) => (
            <button
              key={item}
              type="button"
              disabled={isLoading}
              onClick={() => onUseCommand(item)}
              className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-left font-mono text-xs text-zinc-300 transition duration-200 hover:border-white/25 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}