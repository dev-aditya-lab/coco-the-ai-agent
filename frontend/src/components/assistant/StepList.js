import { CheckCircle2, CircleX } from "lucide-react";
import ActionResultCard from "@/components/assistant/ActionResultCard";
import MarkdownRenderer from "@/components/assistant/MarkdownRenderer";

const ACTION_LABELS = {
  chat: "Conversation",
  open_app: "Open App",
  open_website: "Open Website",
  play_youtube: "Play YouTube",
  create_file: "Create File",
  get_info: "Get Info",
  get_user_info: "Get User Info",
  research_web: "Research Web",
  send_email: "Send Email",
  summarize_inbox: "Summarize Inbox",
  schedule_reminder: "Schedule Reminder",
  track_budget: "Track Budget",
  track_habit: "Track Habit",
};

export default function StepList({ steps }) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2">
      {steps.map((step) => {
        const ok = step.status === "completed";
        const label = ACTION_LABELS[step.action] || "Tool Action";
        return (
          <div className={`group flex items-start gap-2 rounded-xl border p-2 transition-transform duration-200 hover:-translate-y-px ${ok ? "border-emerald-700/70 bg-emerald-900/25" : "border-red-700/70 bg-red-900/25"}`} key={`${step.stepNumber}-${step.action}`}>
            <div className="mt-0.5">
              {ok ? <CheckCircle2 size={14} /> : <CircleX size={14} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="m-0 flex items-center gap-2 text-xs font-semibold text-slate-100">
                <span>Step {step.stepNumber}: {label}</span>
                <span className="rounded-full border border-slate-600/80 bg-slate-900/60 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                  {step.action}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-300">
                <MarkdownRenderer content={step.message} />
              </div>
              <ActionResultCard step={step} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
