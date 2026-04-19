import { useEffect, useState } from "react";
import { BellRing, CalendarClock, PiggyBank, Target, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/utils/time";

function NumberMetric({ label, value }) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5">
      <p className="m-0 text-[11px] text-slate-400">{label}</p>
      <p className="m-0 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export default function ProductivityPanel({ data, loading, onRefresh }) {
  const reminders = Array.isArray(data?.reminders) ? data.reminders : [];
  const budget = data?.budget || { income: 0, expense: 0, net: 0, recent: [] };
  const habits = data?.habits || { done: 0, skipped: 0, recent: [] };
  const [now, setNow] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dueSoon = reminders.filter((item) => {
    const dueAt = new Date(item.dueAt || 0).getTime();
    if (!Number.isFinite(dueAt)) {
      return false;
    }
    const delta = dueAt - now;
    return delta <= 5 * 60 * 1000 && delta >= -60 * 1000;
  });

  const toCountdown = (dueAt) => {
    const due = new Date(dueAt || 0).getTime();
    if (!Number.isFinite(due)) {
      return "No due time";
    }
    const delta = due - now;
    if (delta <= 0) {
      return "Due now";
    }
    const mins = Math.floor(delta / 60000);
    const secs = Math.floor((delta % 60000) / 1000);
    return `${mins}m ${secs}s left`;
  };

  return (
    <aside className="rounded-2xl border border-slate-700/80 bg-slate-900/85 shadow-[0_16px_48px_-30px_rgba(15,23,42,0.9)]">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">Productivity Snapshot</h2>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid gap-4 p-4">
        {dueSoon.length > 0 ? (
          <section className="rounded-xl border border-amber-500/40 bg-amber-900/20 p-3">
            <p className="m-0 mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-100">
              <BellRing size={14} />
              Reminder Alerts
            </p>
            {dueSoon.slice(0, 2).map((item) => (
              <p key={item.id} className="m-0 text-xs text-amber-50">
                {item.title}: {toCountdown(item.dueAt)}
              </p>
            ))}
          </section>
        ) : null}

        <section className="grid gap-2">
          <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <CalendarClock size={14} />
            Reminders
          </h3>
          {reminders.length === 0 ? <p className="m-0 text-xs text-slate-400">No upcoming reminders.</p> : null}
          {reminders.slice(0, 4).map((item) => (
            <article key={item.id} className="rounded-md border border-slate-700 bg-slate-950/60 p-2">
              <p className="m-0 text-xs font-semibold text-slate-100">{item.title}</p>
              <p className="m-0.5 text-[11px] text-slate-400">{formatDateTime(item.dueAt)}</p>
              <p className="m-0 text-[11px] text-cyan-200">{toCountdown(item.dueAt)}</p>
              {item.notes ? <p className="m-0 text-[11px] text-slate-300">{item.notes}</p> : null}
            </article>
          ))}
        </section>

        <section className="grid gap-2">
          <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <PiggyBank size={14} />
            Budget
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <NumberMetric label="Income" value={budget.income.toFixed(2)} />
            <NumberMetric label="Expense" value={budget.expense.toFixed(2)} />
            <NumberMetric label="Net" value={budget.net.toFixed(2)} />
          </div>
          {Array.isArray(budget.recent) && budget.recent.length > 0 ? (
            <div className="grid gap-1">
              {budget.recent.slice(0, 3).map((item) => (
                <p key={item.id} className="m-0 text-[11px] text-slate-300">
                  {item.type} {item.amount} in {item.category}
                </p>
              ))}
            </div>
          ) : null}
        </section>

        <section className="grid gap-2">
          <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <Target size={14} />
            Habits
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <NumberMetric label="Done" value={String(habits.done || 0)} />
            <NumberMetric label="Skipped" value={String(habits.skipped || 0)} />
          </div>
          {Array.isArray(habits.recent) && habits.recent.length > 0 ? (
            <div className="grid gap-1">
              {habits.recent.slice(0, 3).map((item) => (
                <p key={item.id} className="m-0 text-[11px] text-slate-300">
                  {item.habit}: {item.status}
                </p>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </aside>
  );
}
