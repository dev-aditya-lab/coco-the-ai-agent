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
  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <FileText size={13} />
        <span>File operation</span>
      </div>
      <LabelRow label="Filename" value={step.details?.filename || step.parameters?.filename} />
      <LabelRow label="Path" value={step.details?.path || step.parameters?.path} />
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
  const links = extractUrls(step.message);

  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <Search size={13} />
        <span>Research action</span>
      </div>
      <LabelRow label="Topic" value={step.parameters?.query || step.parameters?.topic} />
      <LabelRow label="Depth" value={step.parameters?.search_depth || step.parameters?.depth} />
      {links.length > 0 ? (
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

  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <Info size={13} />
        <span>{type} card</span>
      </div>
      <LabelRow label="Query" value={query} />
      <LabelRow label="Summary" value={step.message} />
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
  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <Info size={13} />
        <span>Reminder action</span>
      </div>
      <LabelRow label="Title" value={step.details?.title || step.parameters?.title} />
      <LabelRow label="Due" value={step.details?.dueAt || step.parameters?.datetime} />
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
