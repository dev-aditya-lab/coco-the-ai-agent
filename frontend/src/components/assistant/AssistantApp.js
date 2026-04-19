"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Composer from "@/components/assistant/Composer";
import ConversationPanel from "@/components/assistant/ConversationPanel";
import HistorySidebar from "@/components/assistant/HistorySidebar";
import TopBar from "@/components/assistant/TopBar";
import { useAssistant } from "@/hooks/use-assistant";

export default function AssistantApp() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const {
    profileName,
    messages,
    history,
    loading,
    loadingHistory,
    error,
    backendOnline,
    agentStatus,
    stats,
    latestAssistantMessage,
    setAgentStatus,
    sendCommand,
    refreshHistory,
  } = useAssistant();

  return (
    <main className="relative flex h-screen flex-col bg-slate-950">
      <div className="w-full px-4 py-4 md:px-6 md:py-5">
        <TopBar backendOnline={backendOnline} stats={stats} profileName={profileName} agentStatus={agentStatus} />

        {error ? <p className="rounded-lg border border-red-700 bg-red-950 px-3 py-2 text-sm text-red-100">{error}</p> : null}
      </div>

      <section className="relative min-h-0 flex-1 overflow-hidden px-3 pb-3 md:px-4 md:pb-4">
        <div className="flex h-full gap-0">
          {/* History Sidebar */}
          <aside
            className={`absolute inset-y-0 left-0 z-50 flex w-72 transform flex-col rounded-r-2xl border-r border-slate-700 bg-slate-900 transition-transform duration-300 ease-in-out lg:relative lg:z-auto lg:translate-x-0 lg:rounded-2xl lg:border lg:shadow-[0_16px_40px_-28px_rgba(15,23,42,0.9)] ${
              historyOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            } shadow-lg`}
          >
            <div className="min-h-0 flex-1 overflow-hidden">
              <HistorySidebar records={history} loadingHistory={loadingHistory} onRefresh={refreshHistory} />
            </div>
            <div className="border-t border-slate-700/80 px-4 py-3 text-xs text-slate-400">
              <p className="truncate">{profileName ? `Signed in as ${profileName}` : "Local assistant session"}</p>
              <p className="mt-1">{history.length} history item{history.length === 1 ? "" : "s"}</p>
            </div>
          </aside>

          {/* Toggle Button */}
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="absolute left-6 top-6 z-40 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-200 lg:hidden"
          >
            {historyOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>

          {/* Main Conversation Area */}
          <div className="min-w-0 flex-1 overflow-hidden pl-0 lg:pl-4">
            <div className="h-full w-full min-h-0">
              <ConversationPanel messages={messages} loading={loading} agentStatus={agentStatus}>
                <Composer
                  loading={loading}
                  onSend={sendCommand}
                  latestAssistantMessage={latestAssistantMessage}
                  onStatusChange={setAgentStatus}
                />
              </ConversationPanel>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
