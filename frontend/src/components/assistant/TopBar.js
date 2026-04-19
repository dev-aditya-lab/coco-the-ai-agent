import { Activity, Bot, CircleAlert, Sparkles, Wifi, WifiOff } from "lucide-react";
import { getBackendUrl } from "@/services/assistant-api";

function prettyStatus(status) {
  switch (status) {
    case "listening":
      return "Listening";
    case "thinking":
      return "Thinking";
    case "executing":
      return "Executing Action";
    case "responding":
      return "Responding";
    case "speaking":
      return "Speaking";
    default:
      return "Idle";
  }
}

export default function TopBar({ backendOnline, stats, profileName, agentStatus }) {
  const status = prettyStatus(agentStatus);
  const busy = agentStatus && agentStatus !== "idle";

  return (
    <header className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/85 p-4 shadow-[0_14px_42px_-22px_rgba(15,23,42,0.9)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.12),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(251,191,36,0.12),transparent_36%)]" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-700/60 bg-cyan-950/35 text-cyan-200">
            <Bot size={18} />
          </div>
          <div>
            <h1 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-100">
              <span>COCO Control Center</span>
              <Sparkles size={15} className="text-amber-200" />
            </h1>
            <p className="text-sm text-slate-400">
              {profileName ? `Hi ${profileName}, command orchestration is ready.` : "Reliable command orchestration with full backend visibility"}
            </p>
          </div>
        </div>

        <div className="relative flex flex-wrap gap-2">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${backendOnline ? "border-emerald-700 bg-emerald-900/40 text-emerald-100" : "border-red-700 bg-red-900/40 text-red-100"}`}>
            {backendOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{backendOnline ? "Backend Connected" : "Backend Disconnected"}</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">
            <Activity size={14} />
            <span>{stats.totalCommands} commands</span>
          </div>

          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${busy ? "border-blue-700 bg-blue-900/40 text-blue-100" : "border-slate-700 bg-slate-800 text-slate-300"}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${busy ? "animate-pulse bg-blue-300" : "bg-slate-400"}`} />
            <span>{status}</span>
          </div>

          <div className="inline-flex max-w-60 items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">
            <CircleAlert size={14} />
            <span className="truncate">{getBackendUrl()}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
