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
  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <Search size={13} />
        <span>Research action</span>
      </div>
      <LabelRow label="Topic" value={step.parameters?.query || step.parameters?.topic} />
      <LabelRow label="Depth" value={step.parameters?.search_depth || step.parameters?.depth} />
    </div>
  );
}

function InfoCard({ step }) {
  return (
    <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-xs text-slate-200">
        <Info size={13} />
        <span>Information action</span>
      </div>
      <LabelRow label="Query" value={step.parameters?.query} />
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

  return null;
}
