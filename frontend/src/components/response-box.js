'use client';

import { AlertTriangle, Bot, CheckCircle2, TerminalSquare, XCircle } from "lucide-react";
import { formatTimestamp } from "@/utils/response-utils";

function StatusBadge({ status }) {
  const isSuccess = status === "completed";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.2em] ${
        isSuccess
          ? "border border-emerald-300/30 bg-emerald-300/12 text-emerald-200"
          : "border border-red-300/30 bg-red-300/12 text-red-200"
      }`}
    >
      {isSuccess ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {isSuccess ? "Success" : "Failure"}
    </span>
  );
}

export default function ResponseBox({ response, error, logs = [] }) {
  if (error) {
    return (
      <section className="animate-fade-in rounded-3xl border border-red-400/20 bg-red-500/8 p-5 sm:p-6" aria-live="polite">
        <div className="flex items-center gap-3 text-red-200">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <p className="text-sm font-medium tracking-wide">Could not process request</p>
        </div>
        <p className="mt-3 text-sm leading-7 text-red-100/90">{error || "Please try a different command."}</p>
      </section>
    );
  }

  const hasResponse = response && typeof response === "object";
  const steps = hasResponse && Array.isArray(response.stepsExecuted) ? response.stepsExecuted : [];

  return (
    <section className="rounded-3xl border border-white/10 bg-black/55 p-5 shadow-xl shadow-black/40 backdrop-blur-xl sm:p-6" aria-live="polite" aria-atomic="true">
      <header className="mb-4 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-zinc-500">
          <TerminalSquare className="h-4 w-4" aria-hidden="true" />
          <span>Output</span>
        </div>
        <p className="text-xs text-zinc-600">{formatTimestamp(response?.timestamp || Date.now())}</p>
      </header>

      <div className="min-h-52 space-y-4 font-mono text-sm leading-7">
        {hasResponse ? (
          <div key={response.timestamp || response.finalMessage} className="animate-slide-fade space-y-4">
            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/8 px-4 py-3 text-cyan-100">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/80">User input</p>
              <p className="mt-1 break-all text-cyan-100">{response.command || "-"}</p>
            </div>

            <div className="rounded-2xl border border-white/12 bg-white/3 px-4 py-3 text-zinc-200">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                <span>System actions</span>
              </div>

              {steps.length ? (
                <ol className="mt-3 space-y-3">
                  {steps.map((step) => (
                    <li key={`${step.stepNumber}-${step.action}`} className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-zinc-100">Step {step.stepNumber}: {step.action}</p>
                        <StatusBadge status={step.status} />
                      </div>
                      <p className="mt-1 text-zinc-400">{step.message}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-zinc-400">No steps were returned by the system.</p>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-300/18 bg-emerald-300/8 px-4 py-3 text-emerald-100">
              <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300/80">Final result</p>
              <p className="mt-1 text-emerald-100">{response.finalMessage || "Completed"}</p>
            </div>

            {logs.length ? (
              <div className="rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-zinc-200">
                <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Internal log</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {logs.map((log) => (
                    <li key={log.title} className="flex items-start justify-between gap-3 rounded-lg border border-white/8 bg-white/2 px-3 py-2">
                      <div>
                        <p className="text-zinc-200">{log.title}</p>
                        <p className="text-zinc-500">{log.details}</p>
                      </div>
                      <StatusBadge status={log.status === "completed" ? "completed" : "failed"} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="animate-fade-in rounded-2xl border border-dashed border-white/10 bg-white/2 px-4 py-6 text-zinc-500">
            Submit a command to see user input, system actions, and final result.
          </div>
        )}
      </div>
    </section>
  );
}