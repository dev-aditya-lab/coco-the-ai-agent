import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownRenderer({ content }) {
  const text = typeof content === "string" && content.trim() ? content : "";
  if (!text) {
    return null;
  }

  return (
    <div className="markdown-content text-sm leading-relaxed text-slate-100">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
