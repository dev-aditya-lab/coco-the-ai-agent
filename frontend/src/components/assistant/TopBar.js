import { Activity, Bot, CircleAlert, Wifi, WifiOff } from "lucide-react";
import { getBackendUrl } from "@/services/assistant-api";

export default function TopBar({ backendOnline, stats }) {
  return (
    <header className="rounded-xl border border-slate-700 bg-slate-900/90 p-4 shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-blue-300">
          <Bot size={18} />
        </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">COCO Control Center</h1>
            <p className="text-sm text-slate-400">Reliable command orchestration with full backend visibility</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${backendOnline ? "border-emerald-700 bg-emerald-900/40 text-emerald-100" : "border-red-700 bg-red-900/40 text-red-100"}`}>
            {backendOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{backendOnline ? "Backend Connected" : "Backend Disconnected"}</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">
            <Activity size={14} />
            <span>{stats.totalCommands} commands</span>
          </div>

          <div className="inline-flex max-w-[240px] items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">
            <CircleAlert size={14} />
            <span className="truncate">{getBackendUrl()}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
