import { CheckCircle2, CircleX } from "lucide-react";
import ActionResultCard from "@/components/assistant/ActionResultCard";
import MarkdownRenderer from "@/components/assistant/MarkdownRenderer";

export default function StepList({ steps }) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2">
      {steps.map((step) => {
        const ok = step.status === "completed";
        return (
          <div className={`group flex items-start gap-2 rounded-xl border p-2 transition-transform duration-200 hover:-translate-y-px ${ok ? "border-emerald-700/70 bg-emerald-900/25" : "border-red-700/70 bg-red-900/25"}`} key={`${step.stepNumber}-${step.action}`}>
            <div className="mt-0.5">
              {ok ? <CheckCircle2 size={14} /> : <CircleX size={14} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-xs font-semibold text-slate-100">
                Step {step.stepNumber}: {step.action}
              </p>
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
