import { Bot, Sparkles } from "lucide-react";

export default function AssistantLayout({ children }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#040404] px-4 py-14 text-zinc-100 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.11),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(34,197,94,0.08),transparent_30%)]" />

      <section className="relative z-10 w-full max-w-4xl animate-fade-in space-y-10">
        <header className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-200 shadow-[0_0_36px_rgba(6,182,212,0.25)]">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-zinc-500">Assistant</p>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
                Coco Interface
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-cyan-100 sm:flex">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Online</span>
          </div>
        </header>

        <div className="space-y-6">{children}</div>
      </section>
    </main>
  );
}