'use client';

import { useState } from "react";
import { ArrowUpRight, Bot, Command, LoaderCircle, Sparkles } from "lucide-react";
import CommandForm from "@/components/command-form";
import ResponsePanel from "@/components/response-panel";
import { submitCommand } from "@/services/assistant-service";

export default function AssistantConsole() {
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedCommand = command.trim();
    if (!trimmedCommand || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextResponse = await submitCommand(trimmedCommand);
      setResponse(nextResponse);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-4 py-10 text-zinc-100 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_35%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(6,182,212,0.08),transparent_30%)]" />

      <section className="relative z-10 flex w-full max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-emerald-300 shadow-[0_0_40px_rgba(34,197,94,0.18)]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-400">
                Assistant Core
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
                Coco Command Interface
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200 sm:flex">
            <Sparkles className="h-4 w-4" />
            <span>Ready for AI expansion</span>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <section className="rounded-4xl border border-white/10 bg-white/3shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
            <div className="mb-6 flex items-center gap-3 text-sm text-zinc-400">
              <Command className="h-4 w-4 text-cyan-300" />
              <span>Type a command and send it to the backend</span>
            </div>

            <CommandForm
              command={command}
              onCommandChange={setCommand}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-zinc-500">
              <span>Single POST route: /api/command</span>
              <span>Separate Node.js and Next.js layers</span>
            </div>
          </section>

          <section className="flex h-full flex-col gap-4 rounded-4xl border border-white/10 bg-[#0a0a0a]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                  Response
                </p>
                <h2 className="mt-1 text-xl font-semibold text-zinc-100">
                  Terminal output
                </h2>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-200">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>

            <ResponsePanel response={response} error={error} isLoading={isLoading} />

            {isLoading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/3 px-4 py-3 text-sm text-zinc-300">
                <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
                <span>Thinking...</span>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}