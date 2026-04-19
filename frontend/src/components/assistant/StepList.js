import { CheckCircle2, CircleX } from "lucide-react";

export default function StepList({ steps }) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 grid gap-2">
      {steps.map((step) => {
        const ok = step.status === "completed";
        return (
          <div className={`flex items-start gap-2 rounded-lg border p-2 ${ok ? "border-emerald-700 bg-emerald-900/30" : "border-red-700 bg-red-900/30"}`} key={`${step.stepNumber}-${step.action}`}>
            <div className="mt-0.5">
              {ok ? <CheckCircle2 size={14} /> : <CircleX size={14} />}
            </div>
            <div>
              <p className="m-0 text-xs font-semibold text-slate-100">
                Step {step.stepNumber}: {step.action}
              </p>
              <p className="m-0.5 text-xs text-slate-300">{step.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
