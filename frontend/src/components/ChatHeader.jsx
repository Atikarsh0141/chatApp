import { useState } from "react";
import { X, Sparkles, Phone, Video, Lock, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatSummaryModal from "./ChatSummaryModal";

const ChatHeader = ({ onBack }) => {
  const { selectedUser, setSelectedUser, summarizeChat } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const isOnline = onlineUsers.includes(selectedUser._id);

  const getLastSeenText = () => {
    if (isOnline) return "Online";
    if (!selectedUser.lastSeen) return "Offline";
    if (selectedUser.showLastSeen === false) return "Offline";

    const lastSeen = new Date(selectedUser.lastSeen);
    const now = new Date();
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Last seen just now";
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    return `Last seen ${diffDays}d ago`;
  };

  const handleSummarize = async () => {
    setShowSummary(true);
    setIsSummarizing(true);
    setSummary(null);
    const result = await summarizeChat(selectedUser._id);
    setSummary(result);
    setIsSummarizing(false);
  };

  const handleVoiceCall = () => {
    if (window.__startCall) {
      window.__startCall(selectedUser, "voice");
    }
  };

  const handleVideoCall = () => {
    if (window.__startCall) {
      window.__startCall(selectedUser, "video");
    }
  };

  return (
    <>
      <div className="p-2.5 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile back button */}
            {onBack && (
              <button
                onClick={onBack}
                className="lg:hidden btn btn-ghost btn-sm btn-circle"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {/* Avatar */}
            <div className="avatar">
              <div className="size-10 rounded-full relative">
                <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
              </div>
            </div>

            {/* User info */}
            <div>
              <div className="flex items-center gap-1">
                <h3 className="font-medium">{selectedUser.fullName}</h3>
                <Lock className="w-3 h-3 text-green-500" title="End-to-end encrypted" />
              </div>
              <p className="text-sm text-base-content/70">{getLastSeenText()}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Voice Call */}
            <button
              onClick={handleVoiceCall}
              className="btn btn-ghost btn-sm btn-circle"
              title="Voice Call"
              disabled={!isOnline}
            >
              <Phone className="w-4 h-4" />
            </button>

            {/* Video Call */}
            <button
              onClick={handleVideoCall}
              className="btn btn-ghost btn-sm btn-circle"
              title="Video Call"
              disabled={!isOnline}
            >
              <Video className="w-4 h-4" />
            </button>

            {/* Summarize button */}
            <button
              onClick={handleSummarize}
              className="btn btn-ghost btn-sm gap-1 text-primary"
              title="Summarize chat"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Summarize</span>
            </button>

            {/* Close button */}
            <button onClick={() => setSelectedUser(null)}>
              <X />
            </button>
          </div>
        </div>
      </div>

      <ChatSummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        summary={summary}
        isLoading={isSummarizing}
      />
    </>
  );
};
export default ChatHeader;
