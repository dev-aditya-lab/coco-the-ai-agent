import { Bot, Sparkles, User } from "lucide-react";
import StepList from "@/components/assistant/StepList";
import MarkdownRenderer from "@/components/assistant/MarkdownRenderer";
import { formatTime } from "@/utils/time";

function prettyStatus(status) {
  switch (status) {
    case "listening":
      return "Listening to your voice";
    case "thinking":
      return "Thinking through the request";
    case "executing":
      return "Executing tools";
    case "responding":
      return "Preparing response";
    case "speaking":
      return "Speaking out loud";
    default:
      return "Ready for your next command";
  }
}

function MessageItem({ item }) {
  const isUser = item.role === "user";

  return (
    <article className={`group relative animate-enter rounded-2xl border p-3 transition-all ${isUser ? "ml-auto w-full max-w-[92%] border-cyan-700/40 bg-cyan-950/35 shadow-[0_8px_24px_-16px_rgba(34,211,238,0.7)]" : "mr-auto w-full max-w-[96%] border-amber-200/10 bg-slate-900/70"}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-xs text-slate-400">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${isUser ? "border-cyan-600/60 bg-cyan-950/80 text-cyan-200" : "border-amber-300/30 bg-amber-500/10 text-amber-100"}`}>
            {isUser ? <User size={14} /> : <Bot size={14} />}
          </span>
          <span className="font-medium">{isUser ? "You" : "COCO"}</span>
        </div>
        <time className="text-xs text-slate-500">{formatTime(item.timestamp)}</time>
      </div>

      <MarkdownRenderer content={item.content} />

      {item.response ? (
        <>
          <StepList steps={item.response.steps} />
          <details className="mt-2 rounded-xl border border-slate-700/80 bg-slate-950/70 p-2">
            <summary className="cursor-pointer text-xs text-slate-400">Raw backend payload</summary>
            <pre className="mt-2 whitespace-pre-wrap wrap-break-word text-[11px] text-slate-300">{JSON.stringify(item.response.raw, null, 2)}</pre>
          </details>
        </>
      ) : null}
    </article>
  );
}

export default function ConversationPanel({ messages, loading, agentStatus }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/80 shadow-[0_16px_48px_-30px_rgba(15,23,42,0.9)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.08),transparent_40%)]" />

      <div className="relative border-b border-slate-700/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-100">Conversation</h2>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/90 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
            <span className={`inline-block h-2 w-2 rounded-full ${loading ? "animate-pulse bg-cyan-300" : "bg-emerald-300"}`} />
            <span>{prettyStatus(agentStatus)}</span>
          </div>
        </div>
      </div>

      <div className="relative grid max-h-168 gap-3 overflow-auto p-4 md:max-h-192">
        {messages.map((item) => (
          <MessageItem key={item.id} item={item} />
        ))}

        {loading ? (
          <p className="m-0 inline-flex items-center gap-2 rounded-xl border border-cyan-700/40 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-100">
            <Sparkles size={14} className="animate-pulse" />
            COCO is thinking, planning, and executing...
          </p>
        ) : null}
      </div>
    </section>
  );
}
