import { History, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/utils/time";

export default function HistorySidebar({ records, loadingHistory, onRefresh }) {
  return (
    <aside className="rounded-xl border border-slate-700 bg-slate-900 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
          <History size={16} />
          <span>Command History</span>
        </h2>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onRefresh}
          disabled={loadingHistory}
        >
          <RefreshCw size={14} className={loadingHistory ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid max-h-190 gap-3 overflow-auto p-4">
        {records.length === 0 ? <p className="m-0 text-sm text-slate-400">No history available.</p> : null}

        {records.map((record) => (
          <article className="rounded-lg border border-slate-700 bg-slate-800 p-3" key={record.id}>
            <p className="m-0 text-sm leading-relaxed text-slate-100">{record.command || "(empty command)"}</p>
            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
              <span className={`inline-block h-2 w-2 rounded-full ${record.status === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
              <span>{record.action}</span>
              <span>{formatDateTime(record.createdAt)}</span>
            </div>
            {record.response ? <p className="mt-2 text-xs leading-relaxed text-slate-300">{record.response}</p> : null}
          </article>
        ))}
      </div>
    </aside>
  );
}
