import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Settings, Send, Image, X, Users, MessageSquare, CheckSquare, Code2, FileText, Download, ArrowLeft } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import GroupSettings from "./GroupSettings";
import ProjectTasks from "./ProjectTasks";
import LiveCodePad from "./LiveCodePad";
import toast from "react-hot-toast";

const GroupChatContainer = ({ onBack }) => {
  const {
    groupMessages,
    getGroupMessages,
    sendGroupMessage,
    isGroupMessagesLoading,
    selectedGroup,
    setSelectedGroup,
    subscribeToGroupMessages,
    unsubscribeFromGroupMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // chat | tasks | code

  useEffect(() => {
    if (selectedGroup?._id) {
      getGroupMessages(selectedGroup._id);
      subscribeToGroupMessages();
    }
    return () => unsubscribeFromGroupMessages();
  }, [selectedGroup?._id]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [groupMessages]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file?.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    await sendGroupMessage({ text: text.trim(), image: imagePreview });
    setText("");
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGroupUpdated = (updatedGroup) => {
    setSelectedGroup(updatedGroup);
  };

  if (isGroupMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Header */}
        <div className="p-2.5 border-b border-base-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {selectedGroup?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-medium">{selectedGroup?.name}</h3>
                <p className="text-xs text-base-content/60">
                  {selectedGroup?.members?.length} members
                </p>
              </div>
            </div>
          </div>
        </div>
        <MessageSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Group Header */}
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
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              {selectedGroup?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-medium">{selectedGroup?.name}</h3>
              <p className="text-xs text-base-content/60">
                {selectedGroup?.members?.length} members
              </p>
            </div>
          </div>
          
          {/* Tabs — scrollable on small screens */}
          <div className="flex bg-base-200 rounded-lg p-1 overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`btn btn-sm btn-ghost gap-1 px-2 sm:px-3 whitespace-nowrap ${activeTab === "chat" ? "bg-base-100 shadow-sm" : ""}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`btn btn-sm btn-ghost gap-1 px-2 sm:px-3 whitespace-nowrap ${activeTab === "tasks" ? "bg-base-100 shadow-sm" : ""}`}
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Tasks</span>
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`btn btn-sm btn-ghost gap-1 px-2 sm:px-3 whitespace-nowrap ${activeTab === "code" ? "bg-base-100 shadow-sm" : ""}`}
            >
              <Code2 className="w-4 h-4" />
              <span className="hidden sm:inline">Code</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="btn btn-ghost btn-sm btn-circle"
              title="Group Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedGroup(null)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {activeTab === "chat" ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {groupMessages.map((message) => {
              const isSent = message.senderId?._id === authUser._id || message.senderId === authUser._id;
              const senderName = message.senderId?.fullName || "Unknown";
              const senderPic = message.senderId?.profilePic || "/avatar.png";

              return (
                <div
                  key={message._id}
                  className={`chat ${isSent ? "chat-end" : "chat-start"}`}
                  ref={messageEndRef}
                >
                  <div className="chat-image avatar">
                    <div className="size-10 rounded-full border">
                      <img
                        src={isSent ? authUser.profilePic || "/avatar.png" : senderPic}
                        alt="profile"
                      />
                    </div>
                  </div>
                  <div className="chat-header mb-1">
                    {!isSent && (
                      <span className="text-xs font-medium text-primary mr-1">{senderName}</span>
                    )}
                    <time className="text-xs opacity-50">
                      {formatMessageTime(message.createdAt)}
                    </time>
                  </div>
                  <div className="chat-bubble flex flex-col">
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Attachment"
                        className="sm:max-w-[200px] rounded-md mb-2"
                      />
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
                    {message.isCodeSnippet ? (
                      <div className="rounded-md overflow-hidden my-1 border border-base-300 max-w-full">
                        <div className="bg-base-300 px-3 py-1 text-xs font-mono text-base-content/70 flex justify-between items-center">
                          <span>{message.language || "code"}</span>
                        </div>
                        <SyntaxHighlighter 
                          language={message.language || "javascript"} 
                          style={vscDarkPlus}
                          customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.85rem" }}
                        >
                          {message.text}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      message.text && <p>{message.text}</p>
                    )}
                    <div className="flex items-center justify-end mt-1 -mb-1">
                      <span className="text-[10px] opacity-50">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="p-4 w-full">
            {imagePreview && (
              <div className="mb-3 flex items-center gap-2">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
                    type="button"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-center gap-2">
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  className="w-full input input-bordered rounded-lg input-sm sm:input-md"
                  placeholder="Type a message..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  className={`hidden sm:flex btn btn-circle ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image size={20} />
                </button>
              </div>
              <button
                type="submit"
                className="btn btn-sm btn-circle"
                disabled={!text.trim() && !imagePreview}
              >
                <Send size={22} />
              </button>
            </form>
          </div>
        </>
      ) : activeTab === "tasks" ? (
        <ProjectTasks />
      ) : (
        <LiveCodePad />
      )}

      {/* Group Settings Modal */}
      <GroupSettings
        group={selectedGroup}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onGroupUpdated={handleGroupUpdated}
      />
    </div>
  );
};

export default GroupChatContainer;
