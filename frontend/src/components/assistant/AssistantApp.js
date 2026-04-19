"use client";

import Composer from "@/components/assistant/Composer";
import ConversationPanel from "@/components/assistant/ConversationPanel";
import HistorySidebar from "@/components/assistant/HistorySidebar";
import ProductivityPanel from "@/components/assistant/ProductivityPanel";
import TopBar from "@/components/assistant/TopBar";
import { useAssistant } from "@/hooks/use-assistant";

export default function AssistantApp() {
  const {
    profileName,
    messages,
    history,
    loading,
    loadingHistory,
    loadingTracker,
    error,
    backendOnline,
    agentStatus,
    trackerSummary,
    stats,
    latestAssistantMessage,
    setAgentStatus,
    sendCommand,
    refreshHistory,
    refreshTrackerSummary,
  } = useAssistant();

  return (
    <main className="relative flex h-screen flex-col bg-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-7">
        <TopBar backendOnline={backendOnline} stats={stats} profileName={profileName} agentStatus={agentStatus} />

        {error ? <p className="rounded-lg border border-red-700 bg-red-950 px-3 py-2 text-sm text-red-100">{error}</p> : null}
      </div>

      <section className="min-h-0 flex-1 overflow-hidden px-0 pb-36 md:pb-32">
        <div className="mx-auto grid h-full min-h-0 w-full max-w-7xl grid-cols-1 gap-5 px-4 md:px-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(320px,1fr)]">
          <div className="min-h-0 min-w-0">
            <ConversationPanel messages={messages} loading={loading} agentStatus={agentStatus} >
              <Composer
                loading={loading}
                onSend={sendCommand}
                latestAssistantMessage={latestAssistantMessage}
                onStatusChange={setAgentStatus}
              />
            </ConversationPanel>

          </div>

          <div className="hidden min-h-0 grid-cols-1 gap-5 xl:grid">
            <HistorySidebar records={history} loadingHistory={loadingHistory} onRefresh={refreshHistory} />
            <ProductivityPanel data={trackerSummary} loading={loadingTracker} onRefresh={refreshTrackerSummary} />
          </div>
        </div>
      </section>

    </main>
  );
}
