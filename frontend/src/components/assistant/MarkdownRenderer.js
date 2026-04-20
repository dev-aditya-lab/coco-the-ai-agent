import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownRenderer({ content }) {
  const text = typeof content === "string" && content.trim() ? content : "";
  if (!text) {
    return null;
  }

  return (
    <div className="markdown-content text-sm leading-relaxed text-slate-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="m-0 mb-2 mt-1 text-lg font-semibold text-slate-50">{children}</h1>,
          h2: ({ children }) => <h2 className="m-0 mb-2 mt-2 text-base font-semibold text-slate-100">{children}</h2>,
          h3: ({ children }) => <h3 className="m-0 mb-1.5 mt-2 text-sm font-semibold text-slate-100">{children}</h3>,
          p: ({ children }) => <p className="m-0 mb-2 text-slate-100">{children}</p>,
          ul: ({ children }) => <ul className="m-0 mb-2 list-disc space-y-1 pl-5 text-slate-100">{children}</ul>,
          ol: ({ children }) => <ol className="m-0 mb-2 list-decimal space-y-1 pl-5 text-slate-100">{children}</ol>,
          li: ({ children }) => <li className="marker:text-slate-400">{children}</li>,
          blockquote: ({ children }) => <blockquote className="m-0 mb-2 border-l-2 border-cyan-600/60 pl-3 text-slate-300">{children}</blockquote>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-cyan-300 underline decoration-cyan-700/60 underline-offset-2 hover:text-cyan-200">{children}</a>,
          table: ({ children }) => <div className="mb-2 overflow-x-auto"><table className="min-w-full border-collapse text-xs">{children}</table></div>,
          th: ({ children }) => <th className="border border-slate-700/80 bg-slate-800/80 px-2 py-1 text-left font-medium text-slate-100">{children}</th>,
          td: ({ children }) => <td className="border border-slate-700/80 px-2 py-1 text-slate-200">{children}</td>,
          code: ({ inline, children }) => inline
            ? <code className="rounded bg-slate-900 px-1 py-0.5 text-[12px] text-cyan-100">{children}</code>
            : <code className="block overflow-x-auto rounded-md bg-slate-950/85 p-2 text-[12px] text-slate-200">{children}</code>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
