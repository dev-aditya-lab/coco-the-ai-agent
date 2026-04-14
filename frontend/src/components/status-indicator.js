'use client';

const LABELS = {
  understanding: 'Thinking',
  executing: 'Executing',
  completed: 'Ready',
  error: 'Error',
  idle: 'Idle',
};

const STYLES = {
  understanding: 'text-zinc-300',
  executing: 'text-cyan-200',
  completed: 'text-emerald-200',
  error: 'text-red-200',
  idle: 'text-zinc-500',
};

export default function StatusIndicator({ phase, isVisible }) {
  const label = LABELS[phase] || LABELS.idle;
  const isBusy = phase === 'understanding' || phase === 'executing';

  return (
    <div
      className={`h-6 text-xs uppercase tracking-[0.24em] transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
      } ${STYLES[phase] || STYLES.idle}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="inline-flex items-center gap-2">
        <span className="text-zinc-500">status</span>
        <span>{label}</span>
        {isBusy ? (
          <span className="inline-flex items-end gap-0.5" aria-hidden="true">
            <span className="h-1 w-1 animate-dot rounded-full bg-current [animation-delay:0ms]" />
            <span className="h-1 w-1 animate-dot rounded-full bg-current [animation-delay:160ms]" />
            <span className="h-1 w-1 animate-dot rounded-full bg-current [animation-delay:320ms]" />
          </span>
        ) : null}
      </span>
    </div>
  );
}
