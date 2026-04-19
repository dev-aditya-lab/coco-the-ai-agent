import { ExternalLink, FileText, Globe, Info, PlayCircle, Search, SquareTerminal } from "lucide-react";

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
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
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <Globe size={13} />
        <span>Website action</span>
      </div>
      <LabelRow label="Target" value={url} />
      {url ? (
        <a className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue-300 hover:text-blue-200" href={url} target="_blank" rel="noreferrer">
          <ExternalLink size={12} />
          Open link
        </a>
      ) : null}
    </div>
  );
}

function OpenAppCard({ step }) {
  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <SquareTerminal size={13} />
        <span>System action</span>
      </div>
      <LabelRow label="App" value={step.parameters?.app_name || step.parameters?.app} />
    </div>
  );
}

function CreateFileCard({ step }) {
  const preview = cleanText(step.details?.contentPreview);
  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <FileText size={13} />
        <span>File operation</span>
      </div>
      <LabelRow label="Filename" value={step.details?.filename || step.parameters?.filename} />
      <LabelRow label="Path" value={step.details?.path || step.parameters?.path} />
      <LabelRow label="Lines" value={String(step.details?.lineCount || "")} />
      {preview ? (
        <div className="mt-2 rounded-md border border-slate-700/70 bg-slate-900/90 p-2">
          <p className="m-0 mb-1 text-[11px] text-slate-400">Content preview</p>
          <pre className="m-0 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-slate-200">{preview}</pre>
        </div>
      ) : null}
    </div>
  );
}

function YoutubeCard({ step }) {
  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <PlayCircle size={13} />
        <span>YouTube action</span>
      </div>
      <LabelRow label="Query" value={step.parameters?.query || step.details?.query} />
      <LabelRow label="URL" value={step.details?.url} />
    </div>
  );
}

function ResearchCard({ step }) {
  const links = Array.isArray(step.details?.sources)
    ? step.details.sources.map((source) => source.url).filter(Boolean)
    : extractUrls(step.message);
  const sources = Array.isArray(step.details?.sources) ? step.details.sources : [];
  const images = Array.isArray(step.details?.images) ? step.details.images : [];

  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <Search size={13} />
        <span>Research action</span>
      </div>
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
    </div>
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
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <Info size={13} />
        <span>{type} card</span>
      </div>
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
    </div>
  );
}

function EmailCard({ step }) {
  const mode = cleanText(step.details?.mode || step.parameters?.mode || "draft");
  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <Info size={13} />
        <span>Email action</span>
      </div>
      <LabelRow label="Mode" value={mode} />
      <LabelRow label="To" value={step.details?.to || step.parameters?.to} />
      <LabelRow label="Subject" value={step.details?.subject || step.parameters?.subject} />
    </div>
  );
}

function ReminderCard({ step }) {
  const dueAt = step.details?.dueAt || step.parameters?.datetime;

  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <Info size={13} />
        <span>Reminder action</span>
      </div>
      <LabelRow label="Title" value={step.details?.title || step.parameters?.title} />
      <LabelRow label="Due" value={dueAt} />
      <LabelRow label="Status" value={dueAt ? "Scheduled" : "Pending time"} />
      <LabelRow label="Notes" value={step.details?.notes || step.parameters?.notes} />
    </div>
  );
}

function BudgetCard({ step }) {
  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <Info size={13} />
        <span>Budget action</span>
      </div>
      <LabelRow label="Type" value={step.details?.entryType || step.parameters?.type} />
      <LabelRow label="Amount" value={String(step.details?.amount || step.parameters?.amount || "")} />
      <LabelRow label="Category" value={step.details?.category || step.parameters?.category} />
    </div>
  );
}

function HabitCard({ step }) {
  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <Info size={13} />
        <span>Habit action</span>
      </div>
      <LabelRow label="Habit" value={step.details?.habit || step.parameters?.habit} />
      <LabelRow label="Status" value={step.details?.status || step.parameters?.status} />
      <LabelRow label="Recent success" value={String(step.details?.recentSuccessCount || "")} />
    </div>
  );
}

function InboxSummaryCard({ step }) {
  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <Info size={13} />
        <span>Inbox summary</span>
      </div>
      <LabelRow label="Messages analyzed" value={String(step.details?.count || "")} />
    </div>
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

  if (action === "get_info" || action === "get_user_info") {
    return <InfoCard step={step} />;
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

  if (action === "summarize_inbox") {
    return <InboxSummaryCard step={step} />;
  }

  return null;
}
