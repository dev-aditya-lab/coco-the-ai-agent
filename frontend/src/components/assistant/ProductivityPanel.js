import { useEffect, useState } from "react";
import { BellRing, CalendarClock, PiggyBank, Target, RefreshCw, CheckSquare, CircleCheckBig, Trash2 } from "lucide-react";
import { formatDateTime } from "@/utils/time";

function NumberMetric({ label, value }) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5">
      <p className="m-0 text-[11px] text-slate-400">{label}</p>
      <p className="m-0 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function TodoRow({ item, onMarkDone, onDelete }) {
  const done = item.status === "done";
  const title = typeof item.title === "string" ? item.title : "";

  return (
    <article className={`rounded-xl border p-3 transition-colors ${done ? "border-emerald-500/30 bg-emerald-950/20" : "border-cyan-500/25 bg-slate-950/70"}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${done ? "bg-emerald-400" : "bg-cyan-400"}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="m-0 truncate text-sm font-semibold text-slate-100">{item.title}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${done ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"}`}>
              {done ? "Done" : "Pending"}
            </span>
          </div>
          {item.note ? <p className="m-0 mt-1 text-[11px] leading-5 text-slate-400">{item.note}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onMarkDone?.(title)}
              disabled={done || !title}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CircleCheckBig size={12} />
              Mark done
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(title)}
              disabled={!title}
              className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-400/50 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ProductivityPanel({ data, loading, onRefresh, onTodoAction }) {
  const reminders = Array.isArray(data?.reminders) ? data.reminders : [];
  const budget = data?.budget || { income: 0, expense: 0, net: 0, recent: [] };
  const habits = data?.habits || { done: 0, skipped: 0, recent: [] };
  const todos = data?.todos || { pending: 0, done: 0, total: 0, recent: [] };
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

  const handleMarkDone = (title) => {
    if (!title) {
      return;
    }

    onTodoAction?.(`mark task "${title}" as done`);
  };

  const handleDelete = (title) => {
    if (!title) {
      return;
    }

    onTodoAction?.(`delete task "${title}"`);
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
          <div className="rounded-2xl border border-cyan-500/20 bg-linear-to-br from-cyan-500/10 via-slate-950/80 to-slate-950 p-3 shadow-[0_14px_30px_-22px_rgba(34,211,238,0.5)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-100">
                <CheckSquare size={14} />
                To-Do Board
              </h3>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                {todos.total || 0} items
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <NumberMetric label="Pending" value={String(todos.pending || 0)} />
              <NumberMetric label="Done" value={String(todos.done || 0)} />
              <NumberMetric label="Total" value={String(todos.total || 0)} />
            </div>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Completion</span>
                <span>{todos.total > 0 ? `${Math.round(((todos.done || 0) / todos.total) * 100)}%` : "0%"}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-linear-to-r from-cyan-400 via-sky-400 to-emerald-400 transition-all"
                  style={{ width: `${todos.total > 0 ? Math.round(((todos.done || 0) / todos.total) * 100) : 0}%` }}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                Active focus
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                {todos.done || 0} completed
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                {todos.pending || 0} pending
              </span>
            </div>
          </div>

          {Array.isArray(todos.recent) && todos.recent.length > 0 ? (
            <div className="grid gap-2">
              {todos.recent.slice(0, 4).map((item) => (
                <TodoRow key={item.id} item={item} onMarkDone={handleMarkDone} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-3 py-4 text-center">
              <p className="m-0 text-xs text-slate-300">No tasks tracked yet.</p>
              <p className="m-0 mt-1 text-[11px] text-slate-500">Add a task to see it appear here as a live board item.</p>
            </div>
          )}
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
