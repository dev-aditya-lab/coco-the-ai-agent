"use client";

import Composer from "@/components/assistant/Composer";
import ConversationPanel from "@/components/assistant/ConversationPanel";
import HistorySidebar from "@/components/assistant/HistorySidebar";
import TopBar from "@/components/assistant/TopBar";
import { useAssistant } from "@/hooks/use-assistant";

export default function AssistantApp() {
  const {
    messages,
    history,
    loading,
    loadingHistory,
    error,
    backendOnline,
    stats,
    latestAssistantMessage,
    sendCommand,
    refreshHistory,
  } = useAssistant();

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 md:px-6">
      <TopBar backendOnline={backendOnline} stats={stats} />

      {error ? <p className="rounded-lg border border-red-700 bg-red-950 px-3 py-2 text-sm text-red-100">{error}</p> : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="grid gap-5">
          <Composer loading={loading} onSend={sendCommand} latestAssistantMessage={latestAssistantMessage} />
          <ConversationPanel messages={messages} loading={loading} />
        </div>

        <HistorySidebar records={history} loadingHistory={loadingHistory} onRefresh={refreshHistory} />
      </section>
    </main>
  );
}
