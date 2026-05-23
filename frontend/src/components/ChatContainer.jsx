import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { getSharedKey, decryptMessage } from "../lib/encryption";
import TranslateButton from "./TranslateButton";
import {
  Bot,
  ShieldAlert,
  Check,
  CheckCheck,
  Lock,
  Pencil,
  SmilePlus,
  X,
  Loader2,
  FileText,
  Download,
  Trash2,
  Search,
  ChevronUp,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];

// Message status tick component
const MessageStatus = ({ status, isSent }) => {
  if (!isSent) return null;
  switch (status) {
    case "seen":
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    case "delivered":
      return <CheckCheck className="w-4 h-4 text-base-content/40" />;
    default:
      return <Check className="w-4 h-4 text-base-content/40" />;
  }
};

const ChatContainer = ({ onBack }) => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    markMessagesSeen,
    typingUser,
    hasMoreMessages,
    isLoadingMore,
    loadMoreMessages,
    deleteMessage,
    searchMessages,
    clearSearch,
    searchResults,
    isSearching,
  } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [showEmojiFor, setShowEmojiFor] = useState(null);
  const [localMessages, setLocalMessages] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchDebounceRef = useRef(null);

  // Shared encryption key
  const sharedKey = getSharedKey(authUser._id, selectedUser._id);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    markMessagesSeen(selectedUser._id);
    return () => unsubscribeFromMessages();
  }, [selectedUser._id]);

  // Sync localMessages from store
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  // Debounced search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchQuery.trim()) {
      searchDebounceRef.current = setTimeout(() => searchMessages(searchQuery), 400);
    } else {
      clearSearch();
    }
  }, [searchQuery]);

  // Mark as seen on new messages
  useEffect(() => {
    if (localMessages.length > 0) {
      const hasUnseen = localMessages.some(
        (msg) => msg.senderId === selectedUser._id && msg.status !== "seen"
      );
      if (hasUnseen) markMessagesSeen(selectedUser._id);
    }
  }, [localMessages, selectedUser._id]);

  // Listen for edit and reaction events
  useEffect(() => {
    if (!socket) return;

    const handleEdit = ({ messageId, text, editedAt }) => {
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, text, editedAt } : msg
        )
      );
    };

    const handleReaction = ({ messageId, reactions }) => {
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        )
      );
    };

    socket.on("messageEdited", handleEdit);
    socket.on("reactionUpdated", handleReaction);

    return () => {
      socket.off("messageEdited", handleEdit);
      socket.off("reactionUpdated", handleReaction);
    };
  }, [socket]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [localMessages, typingUser]);

  // Decrypt text if encrypted
  const getDisplayText = (message) => {
    if (!message.text) return null;
    if (message.isEncrypted) {
      return decryptMessage(message.text, sharedKey);
    }
    return message.text;
  };

  // Handle edit
  const startEdit = (message) => {
    setEditingId(message._id);
    setEditText(message.isEncrypted ? decryptMessage(message.text, sharedKey) : message.text);
  };

  const saveEdit = async () => {
    if (!editText.trim()) return;
    try {
      const res = await axiosInstance.put(`/messages/edit/${editingId}`, { text: editText.trim() });
      setLocalMessages((prev) =>
        prev.map((msg) => (msg._id === editingId ? { ...msg, text: res.data.text, editedAt: res.data.editedAt } : msg))
      );
      setEditingId(null);
      setEditText("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit");
    }
  };

  // Handle reaction
  const toggleReaction = async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/react/${messageId}`, { emoji });
      setLocalMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, reactions: res.data.reactions } : msg))
      );
      setShowEmojiFor(null);
    } catch (error) {
      toast.error("Failed to react");
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader onBack={onBack} />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader onBack={onBack} />

      {/* Search bar */}
      <div className="border-b border-base-300 px-4 py-2 flex items-center gap-2">
        <button
          onClick={() => { setShowSearch((s) => !s); setSearchQuery(""); clearSearch(); }}
          className={`btn btn-ghost btn-xs btn-circle ${showSearch ? "text-primary" : ""}`}
          title="Search in conversation"
        >
          <Search className="w-4 h-4" />
        </button>
        {showSearch && (
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="input input-sm input-bordered flex-1"
          />
        )}
        {showSearch && searchQuery && (
          <button onClick={() => { setSearchQuery(""); clearSearch(); }} className="btn btn-ghost btn-xs btn-circle">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Search results overlay */}
      {showSearch && searchQuery && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-base-200/50">
          {isSearching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-center text-base-content/50 text-sm py-8">No messages found</p>
          ) : (
            searchResults.map((msg) => {
              const isSent = msg.senderId === authUser._id;
              return (
                <div key={msg._id} className={`chat ${isSent ? "chat-end" : "chat-start"}`}>
                  <div className="chat-bubble">
                    <p className="text-sm">{msg.text}</p>
                    <span className="text-[10px] opacity-50 block mt-1">{formatMessageTime(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {!showSearch && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Load earlier messages */}
          {hasMoreMessages && (
            <div className="flex justify-center">
              <button
                onClick={loadMoreMessages}
                disabled={isLoadingMore}
                className="btn btn-ghost btn-xs gap-1 text-base-content/60 hover:text-primary"
              >
                {isLoadingMore ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ChevronUp className="w-3 h-3" />
                )}
                Load earlier messages
              </button>
            </div>
          )}

          {/* E2E encryption notice */}
          <div className="text-center">
            <span className="inline-flex items-center gap-1 text-xs text-base-content/40 bg-base-200 px-3 py-1 rounded-full">
              <Lock className="w-3 h-3" />
              Messages are end-to-end encrypted
            </span>
          </div>

          {localMessages.map((message) => {
            const isSent = message.senderId === authUser._id;
            const displayText = getDisplayText(message);

            return (
              <div
                key={message._id}
                className={`chat ${isSent ? "chat-end" : "chat-start"} group/msg`}
                ref={messageEndRef}
              >
                <div className="chat-image avatar">
                  <div className="size-10 rounded-full border">
                    <img
                      src={
                        isSent
                          ? authUser.profilePic || "/avatar.png"
                          : selectedUser.profilePic || "/avatar.png"
                      }
                      alt="profile"
                    />
                  </div>
                </div>

                <div className="chat-header mb-1">
                  <time className="text-xs opacity-50 ml-1">
                    {formatMessageTime(message.createdAt)}
                  </time>
                  {message.editedAt && (
                    <span className="text-[10px] text-base-content/40 ml-1">(edited)</span>
                  )}
                  {message.isAutoReply && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                      <Bot className="w-3 h-3" /> AI Reply
                    </span>
                  )}
                  {message.isSpam && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                      <ShieldAlert className="w-3 h-3" /> Spam
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className={`chat-bubble flex flex-col ${message.isSpam ? "opacity-50" : ""}`}>
                    {message.image && (
                      <img src={message.image} alt="Attachment" className="sm:max-w-[200px] rounded-md mb-2" />
                    )}

                    {message.fileUrl && (
                      <a
                        href={message.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-base-300 p-3 rounded-lg mb-2 hover:bg-base-200 transition-colors"
                      >
                        <FileText className="w-8 h-8 text-primary" />
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium truncate max-w-[150px]">{message.fileName || "Download File"}</span>
                          <span className="text-xs text-base-content/60 flex items-center gap-1 mt-1">
                            <Download className="w-3 h-3" /> Click to download
                          </span>
                        </div>
                      </a>
                    )}

                    {editingId === message._id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="input input-xs input-bordered flex-1 bg-transparent"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <button onClick={saveEdit} className="text-green-500"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="text-red-500"><X className="w-3 h-3" /></button>
                      </div>
                    ) : message.isCodeSnippet ? (
                      <div className="rounded-md overflow-hidden my-1 border border-base-300 max-w-full">
                        <div className="bg-base-300 px-3 py-1 text-xs font-mono text-base-content/70">
                          <span>{message.language || "code"}</span>
                        </div>
                        <SyntaxHighlighter
                          language={message.language || "javascript"}
                          style={vscDarkPlus}
                          customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.85rem" }}
                        >
                          {displayText}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      displayText && <p>{displayText}</p>
                    )}

                    <div className="flex items-center justify-end gap-1 mt-1 -mb-1">
                      <span className="text-[10px] opacity-50">{formatMessageTime(message.createdAt)}</span>
                      {message.isEncrypted && <Lock className="w-3 h-3 text-green-500/50" />}
                      <MessageStatus status={message.status} isSent={isSent} />
                    </div>
                  </div>

                  {/* Hover actions */}
                  <div className={`absolute top-0 ${isSent ? "-left-20" : "-right-20"} opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-0.5`}>
                    {isSent && message.text && (
                      <button onClick={() => startEdit(message)} className="btn btn-ghost btn-xs btn-circle" title="Edit">
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => setShowEmojiFor(showEmojiFor === message._id ? null : message._id)}
                      className="btn btn-ghost btn-xs btn-circle"
                      title="React"
                    >
                      <SmilePlus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (isSent) {
                          if (window.confirm("Delete for everyone?")) {
                            deleteMessage(message._id, true);
                          } else {
                            deleteMessage(message._id, false);
                          }
                        } else {
                          deleteMessage(message._id, false);
                        }
                      }}
                      className="btn btn-ghost btn-xs btn-circle text-error"
                      title={isSent ? "Delete for everyone / just me" : "Delete for me"}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Emoji Picker */}
                  {showEmojiFor === message._id && (
                    <div className={`absolute ${isSent ? "right-0" : "left-0"} -bottom-10 flex gap-1 bg-base-200 rounded-full px-2 py-1 shadow-lg z-10`}>
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(message._id, emoji)}
                          className="hover:scale-125 transition-transform text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="chat-footer mt-0.5">
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(
                        message.reactions.reduce((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(message._id, emoji)}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-base-200 hover:bg-base-300 transition-colors ${
                            message.reactions.some((r) => r.userId === authUser._id && r.emoji === emoji)
                              ? "ring-1 ring-primary"
                              : ""
                          }`}
                        >
                          {emoji}
                          {count > 1 && <span className="text-[10px]">{count}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Translate */}
                {displayText && !editingId && (
                  <div className="chat-footer mt-1">
                    <TranslateButton messageId={message._id} originalText={displayText} />
                  </div>
                )}
              </div>
            );
          })}

        {/* Typing indicator */}
        {typingUser === selectedUser._id && (
          <div className="chat chat-start" ref={messageEndRef}>
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt="typing"
                />
              </div>
            </div>
            <div className="chat-bubble flex items-center gap-1 py-3 px-4 min-h-0">
              <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>
      )} {/* end !showSearch */}

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
