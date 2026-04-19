import { Bot, User } from "lucide-react";
import StepList from "@/components/assistant/StepList";
import { formatTime } from "@/utils/time";

function MessageItem({ item }) {
  const isUser = item.role === "user";

  return (
    <article className={`rounded-xl border border-slate-700 p-3 ${isUser ? "bg-slate-800" : "bg-slate-900"}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700">{isUser ? <User size={14} /> : <Bot size={14} />}</span>
          <span>{isUser ? "You" : "COCO"}</span>
        </div>
        <time className="text-xs text-slate-500">{formatTime(item.timestamp)}</time>
      </div>

      <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{item.content}</p>

      {item.response ? (
        <>
          <StepList steps={item.response.steps} />
          <details className="mt-2 rounded-lg border border-slate-700 bg-slate-950/60 p-2">
            <summary className="cursor-pointer text-xs text-slate-400">Raw backend payload</summary>
            <pre className="mt-2 whitespace-pre-wrap wrap-break-word text-[11px] text-slate-300">{JSON.stringify(item.response.raw, null, 2)}</pre>
          </details>
        </>
      ) : null}
    </article>
  );
}

export default function ConversationPanel({ messages, loading }) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900 shadow-lg">
      <div className="border-b border-slate-700 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">Conversation</h2>
      </div>

      <div className="grid max-h-155 gap-3 overflow-auto p-4">
        {messages.map((item) => (
          <MessageItem key={item.id} item={item} />
        ))}

        {loading ? <p className="m-0 animate-pulse text-sm text-blue-200">COCO is thinking, planning, and executing...</p> : null}
      </div>
    </section>
  );
}
