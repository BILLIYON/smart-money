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
  const { chatMode, showNewGroupModal, setHasConnectedDatabank, setChatMode, setActiveBuddyId, initThread } = useChatStore();
  const searchParams = useSearchParams();

  useEffect(() => {
    const buddyId = searchParams.get("buddy");
    if (buddyId) {
      setChatMode("1to1");
      setActiveBuddyId(buddyId);
      initThread(buddyId, []);
    }
    if (searchParams.get("source") === "databank") {
      setHasConnectedDatabank(true);
    }
  }, [searchParams, setHasConnectedDatabank, setChatMode, setActiveBuddyId, initThread]);

  return (
    <div className="flex overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <ChatSidebar />
      </div>

      {/* Main chat column */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {chatMode === "1to1" ? <MessageThread /> : <GroupMessageThread />}
        <MessageInput />
      </div>

      {/* New Group Modal */}
      {showNewGroupModal && <NewGroupModal />}
    </div>
  );
}
