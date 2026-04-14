import { Bot, Sparkles } from "lucide-react";

export default function AssistantLayout({ children }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#040404] px-4 py-10 text-zinc-100 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(34,197,94,0.06),transparent_34%)]" />

      <section className="relative z-10 w-full max-w-3xl animate-fade-in space-y-8 rounded-3xl border border-white/10 bg-black/45 p-5 shadow-[0_18px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-8">
        <header className="flex items-center justify-between gap-5 border-b border-white/10 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-200 shadow-[0_0_26px_rgba(6,182,212,0.2)]">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-zinc-500">Assistant Shell</p>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
                Coco Interface
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-cyan-100 sm:flex">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Online</span>
          </div>
        </header>

        <div className="space-y-6">{children}</div>
      </section>
    </main>
  );
}