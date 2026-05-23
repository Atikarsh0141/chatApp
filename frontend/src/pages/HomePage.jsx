import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import GroupChatContainer from "../components/GroupChatContainer";

const HomePage = () => {
  const { selectedUser, selectedGroup } = useChatStore();
  const [showChat, setShowChat] = useState(false);

  // When a user/group is selected, switch to chat view on mobile
  useEffect(() => {
    if (selectedUser || selectedGroup) setShowChat(true);
  }, [selectedUser, selectedGroup]);

  const handleBack = () => setShowChat(false);

  const chatPanel = () => {
    if (selectedGroup) return <GroupChatContainer onBack={handleBack} />;
    if (selectedUser) return <ChatContainer onBack={handleBack} />;
    return <NoChatSelected />;
  };

  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-16 sm:pt-20 px-0 sm:px-4 h-full">
        <div className="bg-base-100 sm:rounded-lg shadow-xl w-full max-w-6xl h-[calc(100vh-4rem)] sm:h-[calc(100vh-6rem)] flex overflow-hidden">

          {/* Sidebar: full-width on mobile when not in chat, fixed-width on desktop */}
          <div className={`
            flex-shrink-0
            ${showChat ? "hidden" : "flex"} lg:flex
            flex-col w-full lg:w-72 xl:w-80
            border-r border-base-300
          `}>
            <Sidebar onSelectChat={() => setShowChat(true)} />
          </div>

          {/* Chat panel: full-width on mobile when in chat, flex-1 on desktop */}
          <div className={`
            ${showChat ? "flex" : "hidden"} lg:flex
            flex-col flex-1 min-w-0
          `}>
            {chatPanel()}
          </div>

        </div>
      </div>
    </div>
  );
};
export default HomePage;

