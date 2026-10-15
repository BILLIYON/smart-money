"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { MessageThread, GroupMessageThread } from "@/components/chat/MessageThread";
import { MessageInput } from "@/components/chat/MessageInput";
import { NewGroupModal } from "@/components/chat/NewGroupModal";

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const { chatMode, showNewGroupModal, setHasConnectedDatabank, setChatMode, setActiveBuddyId, initThread, mobileView, setMobileView } = useChatStore();
  const searchParams = useSearchParams();

  useEffect(() => {
    const buddyId = searchParams.get("buddy");
    if (buddyId) {
      setChatMode("1to1");
      setActiveBuddyId(buddyId);
      initThread(buddyId, []);
      setMobileView("chat");
    }
    if (searchParams.get("source") === "databank") {
      setHasConnectedDatabank(true);
    }
  }, [searchParams, setHasConnectedDatabank, setChatMode, setActiveBuddyId, initThread, setMobileView]);

  return (
    <div className="flex overflow-hidden relative w-full h-[calc(100vh-124px)] md:h-[calc(100vh-64px)]">
      {/* Sidebar — full width on mobile if list view, normal width on desktop */}
      <div className={`${mobileView === "list" ? "flex" : "hidden"} md:flex w-full md:w-[320px] lg:w-[380px] h-full flex-shrink-0 border-r border-[var(--border)]`}>
        <ChatSidebar />
      </div>

      {/* Main chat column — full width on mobile if chat view */}
      <div className={`${mobileView === "chat" ? "flex" : "hidden"} md:flex flex-col flex-1 overflow-hidden min-w-0 h-full`}>
        {chatMode === "1to1" ? <MessageThread /> : <GroupMessageThread />}
        <MessageInput />
      </div>

      {/* New Group Modal */}
      {showNewGroupModal && <NewGroupModal />}
    </div>
  );
}
