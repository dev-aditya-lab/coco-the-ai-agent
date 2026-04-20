import {
  Bot,
  ExternalLink,
  FileText,
  Globe,
  Info,
  Mail,
  PlayCircle,
  Search,
  SquareTerminal,
  User,
} from "lucide-react";

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "";
  }
  return amount.toFixed(2);
}

function safeDate(value) {
  const source = cleanText(value);
  if (!source) {
    return "";
  }

  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) {
    return source;
  }

  return parsed.toLocaleString();
}

function CardShell({ icon, title, children }) {
  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function LabelRow({ label, value }) {
  const text = cleanText(value);
  if (!text) {
    return null;
  }

  return (
    <p className="m-0 text-[11px] text-slate-300">
      <span className="text-slate-400">{label}: </span>
      <span>{text}</span>
    </p>
  );
}

function extractUrls(text) {
  const source = cleanText(text);
  if (!source) {
    return [];
  }

  const matches = source.match(/https?:\/\/[^\s)]+/gi) || [];
  return Array.from(new Set(matches));
}

function tryEvaluateExpression(query) {
  const source = cleanText(query).toLowerCase();
  const expression = source
    .replace(/^(calculate|calc|solve|what is|find)\s*/i, "")
    .replace(/[=?]/g, "")
    .trim();

  if (!expression || !/^[0-9+\-*/().\s]+$/.test(expression)) {
    return null;
  }

  try {
    const value = Function(`"use strict"; return (${expression});`)();
    if (!Number.isFinite(Number(value))) {
      return null;
    }
    return {
      expression,
      result: Number(value),
    };
  } catch {
    return null;
  }
}

function tryUnitConversion(query) {
  const source = cleanText(query).toLowerCase();
  const match = source.match(/(\d+(?:\.\d+)?)\s*(km|m|cm|mm|kg|g|lb|lbs|c|f)\s*(?:to|in)\s*(km|m|cm|mm|kg|g|lb|lbs|c|f)/i);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  const from = match[2].toLowerCase();
  const to = match[3].toLowerCase();

  const massFactors = { kg: 1, g: 1000, lb: 2.2046226218, lbs: 2.2046226218 };
  const lengthFactors = { km: 0.001, m: 1, cm: 100, mm: 1000 };

  if (from in massFactors && to in massFactors) {
    const kgValue = value / massFactors[from];
    return { from, to, value, result: kgValue * massFactors[to] };
  }

  if (from in lengthFactors && to in lengthFactors) {
    const meterValue = value / lengthFactors[from];
    return { from, to, value, result: meterValue * lengthFactors[to] };
  }

  if ((from === "c" || from === "f") && (to === "c" || to === "f")) {
    const result = from === "c" ? ((value * 9) / 5) + 32 : ((value - 32) * 5) / 9;
    return { from, to, value, result };
  }

  return null;
}

function OpenWebsiteCard({ step }) {
  const url = cleanText(step.parameters?.url || step.details?.url);
  return (
    <CardShell icon={<Globe size={13} />} title="Website action">
      <LabelRow label="Target" value={url} />
      {url ? (
        <a className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue-300 hover:text-blue-200" href={url} target="_blank" rel="noreferrer">
          <ExternalLink size={12} />
          Open link
        </a>
      ) : null}
    </CardShell>
  );
}

function OpenAppCard({ step }) {
  return (
    <CardShell icon={<SquareTerminal size={13} />} title="System action">
      <LabelRow label="App" value={step.parameters?.app_name || step.parameters?.app} />
      <LabelRow label="Command" value={step.details?.command} />
    </CardShell>
  );
}

function CreateFileCard({ step }) {
  const preview = cleanText(step.details?.contentPreview);
  return (
    <CardShell icon={<FileText size={13} />} title="File operation">
      <LabelRow label="Filename" value={step.details?.filename || step.parameters?.filename} />
      <LabelRow label="Path" value={step.details?.path || step.parameters?.path} />
      <LabelRow label="Lines" value={String(step.details?.lineCount || "")} />
      {preview ? (
        <div className="mt-2 rounded-md border border-slate-700/70 bg-slate-900/90 p-2">
          <p className="m-0 mb-1 text-[11px] text-slate-400">Content preview</p>
          <pre className="m-0 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-slate-200">{preview}</pre>
        </div>
      ) : null}
    </CardShell>
  );
}

function YoutubeCard({ step }) {
  return (
    <CardShell icon={<PlayCircle size={13} />} title="YouTube action">
      <LabelRow label="Query" value={step.parameters?.query || step.details?.query} />
      <LabelRow label="URL" value={step.details?.url} />
    </CardShell>
  );
}

function ResearchCard({ step }) {
  const links = Array.isArray(step.details?.sources)
    ? step.details.sources.map((source) => source.url).filter(Boolean)
    : extractUrls(step.message);
  const sources = Array.isArray(step.details?.sources) ? step.details.sources : [];
  const images = Array.isArray(step.details?.images) ? step.details.images : [];

  return (
    <CardShell icon={<Search size={13} />} title="Research action">
      <LabelRow label="Topic" value={step.parameters?.query || step.parameters?.topic} />
      <LabelRow label="Depth" value={step.parameters?.search_depth || step.parameters?.depth} />
      {sources.length > 0 ? (
        <div className="mt-1 grid gap-1">
          <p className="m-0 text-[11px] text-slate-400">Sources:</p>
          {sources.slice(0, 5).map((source, index) => (
            <a key={`${source.url}-${index}`} className="inline-flex items-center gap-1 text-[11px] text-blue-300 hover:text-blue-200" href={source.url} target="_blank" rel="noreferrer">
              <ExternalLink size={12} />
              <span className="truncate">{source.title || source.url}</span>
            </a>
          ))}
        </div>
      ) : null}
      {links.length > 0 && sources.length === 0 ? (
        <div className="mt-1 grid gap-1">
          <p className="m-0 text-[11px] text-slate-400">Sources:</p>
          {links.slice(0, 5).map((link) => (
            <a key={link} className="inline-flex items-center gap-1 text-[11px] text-blue-300 hover:text-blue-200" href={link} target="_blank" rel="noreferrer">
              <ExternalLink size={12} />
              <span className="truncate">{link}</span>
            </a>
          ))}
        </div>
      ) : null}
      {images.length > 0 ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {images.slice(0, 4).map((image, index) => (
            <a key={`${image.url}-${index}`} href={image.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-md border border-slate-700 bg-slate-900/80">
              <img src={image.url} alt={image.alt || "Research image"} className="h-24 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <p className="m-0 truncate px-2 py-1 text-[10px] text-slate-300">{image.alt || "Reference image"}</p>
            </a>
          ))}
        </div>
      ) : null}
    </CardShell>
  );
}

function InfoCard({ step }) {
  const query = cleanText(step.parameters?.query);
  const lower = query.toLowerCase();
  const type = lower.includes("weather")
    ? "Weather"
    : lower.includes("news")
      ? "News"
      : lower.includes("time")
        ? "Time"
        : lower.includes("stock") || lower.includes("price") || lower.includes("market")
          ? "Finance"
          : "Information";
  const calculation = tryEvaluateExpression(query);
  const conversion = tryUnitConversion(query);

  return (
    <CardShell icon={<Info size={13} />} title={`${type} card`}>
      <LabelRow label="Query" value={query} />
      <LabelRow label="Summary" value={step.message} />
      {calculation ? (
        <div className="mt-2 rounded-md border border-emerald-700/40 bg-emerald-900/20 p-2">
          <p className="m-0 text-[11px] text-emerald-200">Calculation</p>
          <p className="m-0 text-[11px] text-slate-100">{calculation.expression} = {calculation.result}</p>
        </div>
      ) : null}
      {conversion ? (
        <div className="mt-2 rounded-md border border-cyan-700/40 bg-cyan-900/20 p-2">
          <p className="m-0 text-[11px] text-cyan-100">Unit conversion</p>
          <p className="m-0 text-[11px] text-slate-100">
            {conversion.value} {conversion.from} = {Number(conversion.result.toFixed(4))} {conversion.to}
          </p>
        </div>
      ) : null}
    </CardShell>
  );
}

function ChatCard({ step }) {
  return (
    <CardShell icon={<Bot size={13} />} title="Conversation response">
      <LabelRow label="Style" value={step.parameters?.style} />
      <LabelRow label="Input" value={step.parameters?.message} />
    </CardShell>
  );
}

function UserInfoCard({ step }) {
  let structured = null;
  try {
    const parsed = JSON.parse(cleanText(step.message));
    if (parsed && typeof parsed === "object") {
      structured = parsed;
    }
  } catch {
    structured = null;
  }

  return (
    <CardShell icon={<User size={13} />} title="User profile lookup">
      <LabelRow label="Type" value={step.parameters?.type} />
      {structured ? (
        <>
          <LabelRow label="Name" value={structured.name} />
          <LabelRow label="Email" value={structured.email} />
          <LabelRow label="Phone" value={structured.phone} />
        </>
      ) : (
        <LabelRow label="Value" value={step.message} />
      )}
    </CardShell>
  );
}

function EmailCard({ step }) {
  const mode = cleanText(step.details?.mode || step.parameters?.mode || "draft");
  return (
    <CardShell icon={<Mail size={13} />} title="Email action">
      <LabelRow label="Mode" value={mode} />
      <LabelRow label="To" value={step.details?.to || step.parameters?.to} />
      <LabelRow label="Subject" value={step.details?.subject || step.parameters?.subject} />
    </CardShell>
  );
}

function ReminderCard({ step }) {
  const dueAt = step.details?.dueAt || step.parameters?.datetime;

  return (
    <CardShell icon={<Info size={13} />} title="Reminder action">
      <LabelRow label="Title" value={step.details?.title || step.parameters?.title} />
      <LabelRow label="Due" value={safeDate(dueAt)} />
      <LabelRow label="Status" value={dueAt ? "Scheduled" : "Pending time"} />
      <LabelRow label="Notes" value={step.details?.notes || step.parameters?.notes} />
    </CardShell>
  );
}

function BudgetCard({ step }) {
  const totals = step.details?.totals || {};
  return (
    <CardShell icon={<Info size={13} />} title="Budget action">
      <LabelRow label="Type" value={step.details?.entryType || step.parameters?.type} />
      <LabelRow label="Amount" value={formatAmount(step.details?.amount || step.parameters?.amount)} />
      <LabelRow label="Category" value={step.details?.category || step.parameters?.category} />
      <LabelRow label="Total income" value={formatAmount(totals.income)} />
      <LabelRow label="Total expense" value={formatAmount(totals.expense)} />
      <LabelRow label="Net" value={formatAmount(totals.net)} />
    </CardShell>
  );
}

function HabitCard({ step }) {
  return (
    <CardShell icon={<Info size={13} />} title="Habit action">
      <LabelRow label="Habit" value={step.details?.habit || step.parameters?.habit} />
      <LabelRow label="Status" value={step.details?.status || step.parameters?.status} />
      <LabelRow label="Recent success" value={String(step.details?.recentSuccessCount || "")} />
      <LabelRow label="Note" value={step.parameters?.note} />
    </CardShell>
  );
}

function TodoCard({ step }) {
  const operation = cleanText(step.details?.operation || step.parameters?.operation || "list");
  const stats = step.details?.stats || {};
  const tasks = Array.isArray(step.details?.tasks)
    ? step.details.tasks
    : Array.isArray(stats.recent)
      ? stats.recent
      : [];

  return (
    <CardShell icon={<Info size={13} />} title="To-Do action">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
          {operation}
        </span>
        <span className="rounded-full border border-slate-600/80 bg-slate-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
          {stats.pending || 0} pending
        </span>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
          {stats.done || 0} done
        </span>
      </div>

      <LabelRow label="Task" value={step.details?.task?.title || step.parameters?.title} />

      {tasks.length > 0 ? (
        <div className="mt-2 grid gap-2 rounded-xl border border-slate-700/70 bg-slate-950/90 p-2">
          {tasks.slice(0, 4).map((item, index) => {
            const done = item.status === "done";
            return (
              <div key={`${item.id || item.title}-${index}`} className={`flex items-start gap-2 rounded-lg border px-2 py-2 ${done ? "border-emerald-500/25 bg-emerald-950/20" : "border-cyan-500/20 bg-cyan-950/20"}`}>
                <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${done ? "bg-emerald-400" : "bg-cyan-400"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="m-0 truncate text-sm font-medium text-slate-100">{item.title}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${done ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"}`}>
                      {done ? "Done" : "Pending"}
                    </span>
                  </div>
                  {item.note ? <p className="m-0 mt-1 text-[11px] leading-5 text-slate-400">{item.note}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/70 px-3 py-3">
          <p className="m-0 text-[11px] text-slate-400">No todo items to show right now.</p>
        </div>
      )}
    </CardShell>
  );
}

function InboxSummaryCard({ step }) {
  const messages = Array.isArray(step.parameters?.messages) ? step.parameters.messages : [];

  return (
    <CardShell icon={<Info size={13} />} title="Inbox summary">
      <LabelRow label="Messages analyzed" value={String(step.details?.count || "")} />
      {messages.length > 0 ? (
        <div className="mt-1 space-y-1 rounded-md border border-slate-700/70 bg-slate-900/90 p-2 text-[11px] text-slate-200">
          {messages.slice(0, 3).map((item, index) => (
            <p className="m-0" key={`${item}-${index}`}>{index + 1}. {item}</p>
          ))}
        </div>
      ) : null}
    </CardShell>
  );
}

function FallbackCard({ step }) {
  return (
    <CardShell icon={<Info size={13} />} title="Tool result">
      <LabelRow label="Action" value={step.action} />
      <LabelRow label="Message" value={step.message} />
    </CardShell>
  );
}

export default function ActionResultCard({ step }) {
  if (!step || typeof step !== "object") {
    return null;
  }

  const action = cleanText(step.action);

  if (action === "open_website") {
    return <OpenWebsiteCard step={step} />;
  }

  if (action === "open_app") {
    return <OpenAppCard step={step} />;
  }

  if (action === "create_file") {
    return <CreateFileCard step={step} />;
  }

  if (action === "play_youtube") {
    return <YoutubeCard step={step} />;
  }

  if (action === "research_web") {
    return <ResearchCard step={step} />;
  }

  if (action === "chat") {
    return <ChatCard step={step} />;
  }

  if (action === "get_info") {
    return <InfoCard step={step} />;
  }

  if (action === "get_user_info") {
    return <UserInfoCard step={step} />;
  }

  if (action === "send_email") {
    return <EmailCard step={step} />;
  }

  if (action === "schedule_reminder") {
    return <ReminderCard step={step} />;
  }

  if (action === "track_budget") {
    return <BudgetCard step={step} />;
  }

  if (action === "track_habit") {
    return <HabitCard step={step} />;
  }

  if (action === "track_todo") {
    return <TodoCard step={step} />;
  }

  if (action === "summarize_inbox") {
    return <InboxSummaryCard step={step} />;
  }

  return <FallbackCard step={step} />;
}
