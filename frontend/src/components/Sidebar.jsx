import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, UserPlus, Search, Check, X, Bell, Loader2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import CreateGroupModal from "./CreateGroupModal";

const Sidebar = ({ onSelectChat }) => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    groups,
    getGroups,
    selectedGroup,
    setSelectedGroup,
  } = useChatStore();
  const { onlineUsers, socket } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [uniqueIdInput, setUniqueIdInput] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [activeTab, setActiveTab] = useState("contacts"); // "contacts" | "groups"
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    getUsers();
    getGroups();
    loadPendingRequests();
  }, [getUsers]);

  // Listen for real-time friend request events
  useEffect(() => {
    if (!socket) return;

    socket.on("friendRequest", (request) => {
      toast(`New friend request from ${request.senderId.fullName}`, { icon: "👋" });
      loadPendingRequests();
    });

    socket.on("friendRequestAccepted", ({ user }) => {
      toast.success(`${user.fullName} accepted your friend request!`);
      getUsers();
    });

    // Group real-time events
    socket.on("addedToGroup", (group) => {
      toast(`You were added to "${group.name}"`, { icon: "👥" });
      getGroups();
    });

    socket.on("removedFromGroup", ({ groupId }) => {
      toast("You were removed from a group", { icon: "👋" });
      getGroups();
      if (selectedGroup?._id === groupId) {
        setSelectedGroup(null);
      }
    });

    socket.on("groupUpdated", () => {
      getGroups();
    });

    return () => {
      socket.off("friendRequest");
      socket.off("friendRequestAccepted");
      socket.off("addedToGroup");
      socket.off("removedFromGroup");
      socket.off("groupUpdated");
    };
  }, [socket, getUsers, getGroups, selectedGroup]);

  const loadPendingRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const res = await axiosInstance.get("/friends/pending");
      setPendingRequests(res.data);
    } catch (error) {
      console.error("Failed to load requests");
    }
    setIsLoadingRequests(false);
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!uniqueIdInput.trim()) return;

    setIsSendingRequest(true);
    try {
      const res = await axiosInstance.post("/friends/send", { uniqueId: uniqueIdInput.trim() });
      toast.success(res.data.message);
      setUniqueIdInput("");
      setShowAddContact(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send request");
    }
    setIsSendingRequest(false);
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await axiosInstance.put(`/friends/accept/${requestId}`);
      toast.success("Friend request accepted!");
      loadPendingRequests();
      getUsers();
    } catch (error) {
      toast.error("Failed to accept");
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await axiosInstance.put(`/friends/reject/${requestId}`);
      toast.success("Request rejected");
      loadPendingRequests();
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      {/* Header */}
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium hidden lg:block">
              {activeTab === "contacts" ? "Contacts" : "Groups"}
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-1">
            {/* Pending requests badge */}
            <button
              onClick={() => {
                setShowRequests(!showRequests);
                setShowAddContact(false);
              }}
              className={`btn btn-ghost btn-xs relative ${showRequests ? "bg-base-200" : ""}`}
              title="Friend Requests"
            >
              <Bell className="w-4 h-4" />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-content text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            {/* Add contact button */}
            <button
              onClick={() => {
                setShowAddContact(!showAddContact);
                setShowRequests(false);
              }}
              className={`btn btn-ghost btn-xs ${showAddContact ? "bg-base-200" : ""}`}
              title="Add Contact"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs: Contacts / Groups */}
        <div className="mt-3 hidden lg:flex items-center gap-1">
          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex-1 btn btn-xs ${activeTab === "contacts" ? "btn-primary" : "btn-ghost"}`}
          >
            Contacts
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 btn btn-xs ${activeTab === "groups" ? "btn-primary" : "btn-ghost"}`}
          >
            Groups
          </button>
        </div>

        {/* Online filter toggle (contacts tab only) */}
        {activeTab === "contacts" && (
          <div className="mt-2 hidden lg:flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Show online only</span>
            </label>
            <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
          </div>
        )}

        {/* Create Group button (groups tab only) */}
        {activeTab === "groups" && (
          <div className="mt-2 hidden lg:block">
            <button
              onClick={() => setShowCreateGroup(true)}
              className="btn btn-outline btn-primary btn-xs w-full gap-1"
            >
              <Plus className="w-3 h-3" /> Create Group
            </button>
          </div>
        )}
      </div>

      {/* Add Contact Panel */}
      {showAddContact && (
        <div className="border-b border-base-300 p-4 bg-base-200/50">
          <p className="text-xs text-base-content/60 mb-2">Enter a unique ID to add a contact</p>
          <form onSubmit={handleSendRequest} className="flex gap-2">
            <input
              type="text"
              className="input input-bordered input-sm flex-1"
              placeholder="CHATTY-XXXXXX"
              value={uniqueIdInput}
              onChange={(e) => setUniqueIdInput(e.target.value.toUpperCase())}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSendingRequest || !uniqueIdInput.trim()}
            >
              {isSendingRequest ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      )}

      {/* Pending Requests Panel */}
      {showRequests && (
        <div className="border-b border-base-300 bg-base-200/50 max-h-[200px] overflow-y-auto">
          <div className="p-3">
            <p className="text-xs font-medium text-base-content/60 mb-2">
              Pending Requests ({pendingRequests.length})
            </p>
            {pendingRequests.length === 0 ? (
              <p className="text-xs text-base-content/40 text-center py-2">No pending requests</p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div key={req._id} className="flex items-center gap-2 bg-base-100 rounded-lg p-2">
                    <img
                      src={req.senderId.profilePic || "/avatar.png"}
                      alt={req.senderId.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{req.senderId.fullName}</p>
                      <p className="text-[10px] text-base-content/50">{req.senderId.uniqueId}</p>
                    </div>
                    <button
                      onClick={() => handleAcceptRequest(req._id)}
                      className="btn btn-ghost btn-xs text-green-500"
                      title="Accept"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req._id)}
                      className="btn btn-ghost btn-xs text-red-500"
                      title="Reject"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile: Tab toggle + action buttons */}
      <div className="lg:hidden flex justify-center gap-2 py-2 border-b border-base-300">
        <button
          onClick={() => setActiveTab("contacts")}
          className={`btn btn-xs ${activeTab === "contacts" ? "btn-primary" : "btn-ghost"}`}
        >
          <Users className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`btn btn-xs ${activeTab === "groups" ? "btn-primary" : "btn-ghost"}`}
        >
          👥
        </button>
        <button
          onClick={() => {
            setShowRequests(!showRequests);
            setShowAddContact(false);
          }}
          className="btn btn-ghost btn-xs relative"
        >
          <Bell className="w-4 h-4" />
          {pendingRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-content text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setShowAddContact(!showAddContact);
            setShowRequests(false);
          }}
          className="btn btn-ghost btn-xs"
        >
          <UserPlus className="w-4 h-4" />
        </button>
        {activeTab === "groups" && (
          <button
            onClick={() => setShowCreateGroup(true)}
            className="btn btn-ghost btn-xs"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="overflow-y-auto w-full py-3 flex-1">
        {/* CONTACTS TAB */}
        {activeTab === "contacts" && (
          <>
            {filteredUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => {
                  setSelectedUser(user);
                  onSelectChat?.();
                }}
                className={`
                  w-full p-3 flex items-center gap-3
                  hover:bg-base-300 transition-colors
                  ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                `}
              >
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="size-12 object-cover rounded-full"
                  />
                  {onlineUsers.includes(user._id) && (
                    <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                  )}
                </div>
                <div className="hidden lg:block text-left min-w-0">
                  <div className="font-medium truncate">{user.fullName}</div>
                  <div className="text-sm text-zinc-400">
                    {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                  </div>
                </div>
              </button>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center text-zinc-500 py-8 px-4">
                <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No contacts yet</p>
                <p className="text-xs mt-1 hidden lg:block">
                  Click the + button to add friends by their unique ID
                </p>
              </div>
            )}
          </>
        )}

        {/* GROUPS TAB */}
        {activeTab === "groups" && (
          <>
            {groups.map((group) => (
              <button
                key={group._id}
                onClick={() => {
                  setSelectedGroup(group);
                  onSelectChat?.();
                }}
                className={`
                  w-full p-3 flex items-center gap-3
                  hover:bg-base-300 transition-colors
                  ${selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                `}
              >
                <div className="mx-auto lg:mx-0">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                    {group.name?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="hidden lg:block text-left min-w-0">
                  <div className="font-medium truncate">{group.name}</div>
                  <div className="text-sm text-zinc-400">
                    {group.members?.length} members
                  </div>
                </div>
              </button>
            ))}

            {groups.length === 0 && (
              <div className="text-center text-zinc-500 py-8 px-4">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No groups yet</p>
                <p className="text-xs mt-1 hidden lg:block">
                  Create a group to start chatting with multiple friends
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />
    </aside>
  );
};
export default Sidebar;
