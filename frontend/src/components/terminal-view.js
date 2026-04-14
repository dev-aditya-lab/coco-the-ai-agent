'use client';

import { useEffect, useMemo, useRef } from 'react';

function Row({ type, children }) {
  const base = 'font-mono text-sm leading-7 transition-all duration-300';

  const palette = {
    user: 'text-zinc-300',
    system: 'text-cyan-100',
    status: 'text-zinc-500',
    error: 'text-red-200',
  };

  return <p className={`${base} ${palette[type] || palette.status}`}>{children}</p>;
}

export default function TerminalView({ command, response, error, phase }) {
  const outputRef = useRef(null);

  const stepLines = useMemo(() => {
    if (!response?.stepsExecuted?.length) {
      return [];
    }

    return response.stepsExecuted.map((step) => {
      const icon = step.status === 'completed' ? '[ok]' : '[x]';
      return `${icon} step ${step.stepNumber} ${step.action}: ${step.message}`;
    });
  }, [response]);

  useEffect(() => {
    if (!outputRef.current) {
      return;
    }

    outputRef.current.scrollTo({
      top: outputRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [command, response, error, phase]);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/65 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Terminal output</p>
        <span className="text-xs text-zinc-600">session live</span>
      </div>

      <div
        ref={outputRef}
        className="h-72 space-y-2 overflow-y-auto pr-2 [scrollbar-color:#3f3f46_transparent] [scrollbar-width:thin]"
        aria-live="polite"
        aria-atomic="false"
      >
        {command ? (
          <Row type="user">
            <span className="text-zinc-500">&gt;</span> {command}
          </Row>
        ) : (
          <Row type="status">&gt; waiting for command</Row>
        )}

        {phase === 'understanding' ? (
          <Row type="status">
            <span>Thinking</span>
            <span className="ml-1 inline-flex items-end gap-0.5 align-middle" aria-hidden="true">
              <span className="h-1 w-1 animate-dot rounded-full bg-current [animation-delay:0ms]" />
              <span className="h-1 w-1 animate-dot rounded-full bg-current [animation-delay:160ms]" />
              <span className="h-1 w-1 animate-dot rounded-full bg-current [animation-delay:320ms]" />
            </span>
            <span className="ml-2 terminal-cursor" aria-hidden="true" />
          </Row>
        ) : null}

        {phase === 'executing' ? (
          <Row type="status">
            <span>Executing</span>
            <span className="ml-2 terminal-cursor" aria-hidden="true" />
          </Row>
        ) : null}

        {response?.finalMessage ? (
          <>
            {stepLines.map((line) => (
              <Row key={line} type={line.startsWith('[x]') ? 'error' : 'system'}>
                {line}
              </Row>
            ))}
            <Row type="system">{response.finalMessage}</Row>
          </>
        ) : null}

        {error ? <Row type="error">Could not process command</Row> : null}
      </div>
    </section>
  );
}
